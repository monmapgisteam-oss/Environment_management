import { randomUUID } from 'node:crypto';
import schemaJson from './schema.json';
import { applyEdits, layerInfo, queryFeatures, sqlString, storedFieldName, type Feature, type LayerInfo, type ServiceEdit } from './arcgis';
import { read as runRead, write as runWrite, type Row, type Store, type Stored } from './engine';
import type { ModelName, Repository } from './types';

// Application data lives in the private ArcGIS feature service, one dataset
// per model ("tailan_<model>", fields "app_<field>"). The repository engine
// (./engine.ts) runs here and reads and writes through the store below; this
// side also converts dates to and from epoch ms.
type Field = { type: string };
type Relation = { model: ModelName };
type Schema = { name: string; fields: Record<string, Field>; relations: Record<string, Relation> };
const schemas = schemaJson as unknown as Record<ModelName, Schema>;

function encode(value: unknown): unknown {
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encode(v)]));
  }
  return value;
}

function decode(model: ModelName, row: Row | null): Row | null {
  if (!row) return row;
  const result: Row = {};
  for (const [key, value] of Object.entries(row)) {
    const field = schemas[model].fields[key];
    const relation = schemas[model].relations[key];
    if (field?.type === 'date' && typeof value === 'number') result[key] = new Date(value);
    else if (relation && Array.isArray(value)) result[key] = value.map((item) => decode(relation.model, item));
    else if (relation && value && typeof value === 'object') result[key] = decode(relation.model, value);
    else result[key] = value;
  }
  return result;
}

const layerOf = (model: string) => layerInfo(schemas[model as ModelName].name);

// Booleans are stored as small integers; everything else as the engine has it.
function fromFeature(model: string, layer: LayerInfo, attributes: Row): Stored {
  const byName = new Map(Object.entries(attributes).map(([key, value]) => [key.toLowerCase(), value]));
  const row = Object.fromEntries(Object.entries(schemas[model as ModelName].fields).map(([key, field]) => {
    const value = byName.get(`app_${key}`.toLowerCase()) ?? null;
    return [key, value != null && field.type === 'boolean' ? Boolean(value) : value];
  }));
  const objectId = attributes[layer.objectIdField];
  if (typeof objectId !== 'number') throw new Error('ArcGIS record has no object ID.');
  return { row, docId: String(objectId), order: objectId };
}

function toAttributes(model: string, layer: LayerInfo, row: Row): Row {
  const fields = schemas[model as ModelName].fields;
  return Object.fromEntries(Object.entries(row).filter(([key]) => fields[key]).map(([key, value]) =>
    [storedFieldName(layer, key), typeof value === 'boolean' ? (value ? 1 : 0) : value],
  ));
}

// Point datasets (report locations) also carry the coordinates as geometry.
function geometry(row: Row) {
  return row.latitude == null || row.longitude == null ? null : { x: row.longitude, y: row.latitude, spatialReference: { wkid: 4326 } };
}

// A store lives for one repository call. Whole-dataset loads are reused within
// the call; writes are buffered and sent as one applyEdits transaction.
function arcgisStore(): Store {
  const tables = new Map<string, Promise<Stored[]>>();
  const loaded = new Map<string, Row>();
  const pending: { model: string; kind: 'adds' | 'updates' | 'deletes'; feature?: Feature; objectId?: number }[] = [];
  const remember = (model: string, rows: Stored[]) => {
    for (const { row, docId } of rows) loaded.set(`${model}:${docId}`, row);
    return rows;
  };
  const load = async (model: string, where: string) => {
    const layer = await layerOf(model);
    return remember(model, (await queryFeatures(layer, where)).map((feature) => fromFeature(model, layer, feature.attributes)));
  };
  return {
    async load(model, equals) {
      if (equals) {
        const layer = await layerOf(model);
        return load(model, `${storedFieldName(layer, equals.field)} = ${sqlString(equals.value)}`);
      }
      if (!tables.has(model)) {
        const promise = load(model, '1=1');
        tables.set(model, promise);
        promise.catch(() => { if (tables.get(model) === promise) tables.delete(model); });
      }
      return tables.get(model)!;
    },
    async insert(model, row) {
      const layer = await layerOf(model);
      const feature: Feature = { attributes: toAttributes(model, layer, row) };
      if (layer.geometryType) feature.geometry = geometry(row);
      pending.push({ model, kind: 'adds', feature });
    },
    async patch(model, docId, changes) {
      const layer = await layerOf(model);
      const feature: Feature = { attributes: { ...toAttributes(model, layer, changes), [layer.objectIdField]: Number(docId) } };
      if (layer.geometryType && ('latitude' in changes || 'longitude' in changes)) {
        feature.geometry = geometry({ ...loaded.get(`${model}:${docId}`), ...changes });
      }
      pending.push({ model, kind: 'updates', feature });
    },
    async remove(model, docId) {
      pending.push({ model, kind: 'deletes', objectId: Number(docId) });
    },
    async commit() {
      const edits: ServiceEdit[] = [];
      for (const entry of pending) {
        const { id } = await layerOf(entry.model);
        let edit = edits.find((value) => value.id === id);
        if (!edit) { edit = { id }; edits.push(edit); }
        if (entry.kind === 'deletes') (edit.deletes ||= []).push(entry.objectId!);
        else (edit[entry.kind] ||= []).push(entry.feature!);
      }
      pending.length = 0;
      tables.clear();
      await applyEdits(edits);
    },
  };
}

function repository(model: ModelName) {
  const read = (op: string, args: Row = {}) => runRead(arcgisStore(), model, op, encode(args) as Row);
  const write = (op: string, args: Row) => runWrite(arcgisStore(), model, op, encode(args) as Row, randomUUID);
  return {
    findMany: async (args?: Row) => ((await read('findMany', args)) as Row[]).map((row) => decode(model, row)),
    findFirst: async (args?: Row) => decode(model, (await read('findFirst', args)) as Row | null),
    findUnique: async (args: Row) => decode(model, (await read('findUnique', args)) as Row | null),
    count: async (args?: Row) => (await read('count', args)) as number,
    create: async (args: Row) => decode(model, (await write('create', args)) as Row),
    update: async (args: Row) => decode(model, (await write('update', args)) as Row),
    createMany: (args: Row) => write('createMany', args),
    updateMany: (args: Row) => write('updateMany', args),
    deleteMany: (args: Row) => write('deleteMany', args),
  };
}

const data = Object.fromEntries((Object.keys(schemas) as ModelName[]).map((model) => [model, repository(model)])) as unknown as { [M in ModelName]: Repository<M> };
export default data;

// Raw engine access for maintenance scripts (scripts/data-store.cjs): plain
// model names, dates as epoch ms.
export const engine = {
  read: (model: string, op: string, args: Row = {}) => runRead(arcgisStore(), model, op, args),
  write: (model: string, op: string, args: Row) => runWrite(arcgisStore(), model, op, args, randomUUID),
};
