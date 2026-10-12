import { randomUUID } from 'node:crypto';
import schemaJson from './schema.json';
import { applyEdits, arcgisRequest, layerInfo, type Feature, type ServiceEdit } from './service';
import type { ModelName, Repository } from './types';

type Field = { type: string; nullable: boolean; unique?: boolean; default?: unknown; updatedAt?: boolean; length?: number; values?: string[] };
type Relation = { model: ModelName; local: string; foreign: string; many: boolean; nullable: boolean };
type Schema = { name: string; spatial: boolean; fields: Record<string, Field>; relations: Record<string, Relation> };
export const schemas = schemaJson as Record<ModelName, Schema>;
// Dynamic values stay inside the schema-validated repository boundary. Callers
// use Repository<M>, including typed nested relation selections.
type Row = Record<string, any>;
type Args = { where?: Row; include?: Row; select?: Row; orderBy?: Row | Row[]; take?: number; skip?: number };
type StoredRow = { row: Row; objectId: number };

// Enterprise data stores may lowercase field names (app_createdat), and ArcGIS
// matches names case-sensitively in applyEdits and orderByFields. Map schema
// names to the stored names once the layer info has been loaded.
const storedNames = new Map<ModelName, Map<string, string>>();
async function loadFieldNames(model: ModelName) {
  const info = await layerInfo(schemas[model].name);
  storedNames.set(model, new Map(info.fields.map((field) => [field.name.toLowerCase(), field.name])));
  return info;
}

function fieldName(model: ModelName, key: string) {
  if (!schemas[model].fields[key]) throw new Error(`Unknown ${model} field: ${key}`);
  const name = `app_${key}`;
  return storedNames.get(model)?.get(name.toLowerCase()) ?? name;
}

function literal(value: unknown, field: Field): string {
  if (value === null) return 'NULL';
  if (field.type === 'date') {
    const date = value instanceof Date ? value : new Date(value as string);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid date filter.');
    return `TIMESTAMP '${date.toISOString().replace('T', ' ').replace('Z', '')}'`;
  }
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') throw new Error('Invalid boolean filter.');
    return value ? '1' : '0';
  }
  if (field.type === 'number' || field.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid numeric filter.');
    return String(value);
  }
  if (typeof value !== 'string') throw new Error('Invalid string filter.');
  return `'${value.replace(/'/g, "''")}'`;
}

function scalarWhere(model: ModelName, key: string, value: unknown): string {
  const name = fieldName(model, key);
  const field = schemas[model].fields[key];
  if (value === null) return `${name} IS NULL`;
  if (value instanceof Date || typeof value !== 'object') return `${name} = ${literal(value, field)}`;
  const conditions = Object.entries(value as Row).filter(([, v]) => v !== undefined).map(([operator, operand]) => {
    if (operator === 'equals') return scalarWhere(model, key, operand);
    if (operator === 'not') return operand === null ? `${name} IS NOT NULL` : `NOT (${scalarWhere(model, key, operand)})`;
    if (operator === 'in' || operator === 'notIn') {
      if (!Array.isArray(operand)) throw new Error('Invalid list filter.');
      if (!operand.length) return operator === 'in' ? '1=0' : '1=1';
      const parts: string[] = [];
      for (let offset = 0; offset < operand.length; offset += 200) {
        parts.push(`${name} ${operator === 'in' ? 'IN' : 'NOT IN'} (${operand.slice(offset, offset + 200).map((v) => literal(v, field)).join(',')})`);
      }
      return `(${parts.join(operator === 'in' ? ' OR ' : ' AND ')})`;
    }
    const op = ({ gt: '>', gte: '>=', lt: '<', lte: '<=' } as Record<string, string>)[operator];
    if (!op) throw new Error(`Unsupported filter operator: ${operator}`);
    return `${name} ${op} ${literal(operand, field)}`;
  });
  return conditions.length ? `(${conditions.join(' AND ')})` : '1=1';
}

export async function compileWhere(model: ModelName, where: Row = {}): Promise<string> {
  await loadFieldNames(model);
  const parts = await Promise.all(Object.entries(where).filter(([, value]) => value !== undefined).map(async ([key, value]) => {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const clauses = await Promise.all((Array.isArray(value) ? value : [value]).map((item) => compileWhere(model, item)));
      if (key === 'NOT') return clauses.map((clause) => `NOT (${clause})`).join(' AND ') || '1=1';
      const joined = clauses.map((clause) => `(${clause})`).join(key === 'OR' ? ' OR ' : ' AND ');
      return joined || (key === 'OR' ? '1=0' : '1=1');
    }
    const relation = schemas[model].relations[key];
    if (relation) {
      const nullCheck = 'is' in value || 'isNot' in value;
      const matches = await findRows(relation.model, { where: nullCheck ? {} : value });
      const keys = Array.from(new Set(matches.map(({ row }) => row[relation.foreign]).filter((v) => v != null)));
      return scalarWhere(model, relation.local, { ['is' in value ? 'notIn' : 'in']: keys });
    }
    return scalarWhere(model, key, value);
  }));
  return parts.length ? parts.map((part) => `(${part})`).join(' AND ') : '1=1';
}

function decode(model: ModelName, attributes: Row): Row {
  const normalized = new Map(Object.entries(attributes).map(([key, value]) => [key.toLowerCase(), value]));
  return Object.fromEntries(Object.entries(schemas[model].fields).map(([key, field]) => {
    const value = normalized.get(`app_${key}`.toLowerCase()) ?? null;
    return [key, value == null ? null : field.type === 'date' ? new Date(value) : field.type === 'boolean' ? Boolean(value) : value];
  }));
}

async function findRows(model: ModelName, args: Args = {}): Promise<StoredRow[]> {
  if (args.take === 0) return [];
  const info = await loadFieldNames(model);
  const where = await compileWhere(model, args.where);
  const order = (Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : []).flatMap((entry) =>
    Object.entries(entry).map(([key, direction]) => {
      if (direction !== 'asc' && direction !== 'desc') throw new Error('Invalid sort direction.');
      return `${fieldName(model, key)} ${direction.toUpperCase()}`;
    }),
  );
  order.push(`${info.objectIdField} ASC`);
  const rows: StoredRow[] = [];
  const pageSize = Math.min(info.maxRecordCount || 1000, 1000);
  let offset = args.skip || 0;
  if (offset < 0 || (args.take != null && args.take < 0)) throw new Error('Invalid pagination.');
  for (;;) {
    const count = args.take == null ? pageSize : Math.min(pageSize, args.take - rows.length);
    const page = await arcgisRequest<{ features: Feature[]; exceededTransferLimit?: boolean }>(`${info.id}/query`, {
      where, outFields: '*', returnGeometry: false, orderByFields: order.join(','),
      resultOffset: offset, resultRecordCount: count,
    });
    if (!Array.isArray(page.features)) throw new Error(`Invalid ArcGIS query response for ${model}.`);
    for (const feature of page.features) {
      const id = feature.attributes[info.objectIdField];
      if (typeof id !== 'number') throw new Error('ArcGIS record has no object ID.');
      rows.push({ row: decode(model, feature.attributes), objectId: id });
    }
    if (args.take != null && rows.length >= args.take) break;
    if (!page.exceededTransferLimit && page.features.length < count) break;
    if (!page.features.length) throw new Error('ArcGIS pagination made no progress.');
    offset += page.features.length;
  }
  return rows;
}

async function projectRows(model: ModelName, rows: Row[], args: Args): Promise<Row[]> {
  const selection = args.select || args.include || {};
  const result = rows.map((row) => args.select ? Object.fromEntries(Object.entries(args.select).filter(([key, enabled]) => enabled && schemas[model].fields[key]).map(([key]) => [key, row[key]])) : { ...row });
  for (const [key, requested] of Object.entries(selection)) {
    if (!requested || schemas[model].fields[key]) continue;
    if (key === '_count') {
      for (const row of result) row._count = {};
      for (const [relationName, enabled] of Object.entries(requested.select || {})) {
        if (!enabled) continue;
        const relation = schemas[model].relations[relationName];
        if (!relation) throw new Error(`Unknown count relation: ${relationName}`);
        const keys = rows.map((row) => row[relation.local]).filter((value) => value != null);
        const children = await findRows(relation.model, { where: { [relation.foreign]: { in: keys } } });
        rows.forEach((row, i) => { result[i]._count[relationName] = children.filter((child) => child.row[relation.foreign] === row[relation.local]).length; });
      }
      continue;
    }
    const relation = schemas[model].relations[key];
    if (!relation) throw new Error(`Unknown ${model} relation: ${key}`);
    const options: Args = requested === true ? {} : requested;
    const keys = Array.from(new Set(rows.map((row) => row[relation.local]).filter((value) => value != null)));
    // Batch each relationship rather than issuing one request per parent.
    const children = await findRows(relation.model, { ...options, take: undefined, skip: undefined, where: { AND: [options.where || {}, { [relation.foreign]: { in: keys } }] } });
    const projected = await projectRows(relation.model, children.map(({ row }) => row), options);
    rows.forEach((row, i) => {
      let matching = children.flatMap((child, j) => child.row[relation.foreign] === row[relation.local] ? [projected[j]] : []);
      matching = matching.slice(options.skip || 0, options.take == null ? undefined : (options.skip || 0) + options.take);
      result[i][key] = relation.many ? matching : matching[0] || null;
    });
  }
  return result;
}

function attributes(model: ModelName, data: Row, create: boolean): Row {
  const result: Row = {};
  for (const key of Object.keys(data)) {
    if (!schemas[model].fields[key] && !schemas[model].relations[key]) throw new Error(`Unknown ${model} write field: ${key}`);
  }
  for (const [key, field] of Object.entries(schemas[model].fields)) {
    let value = data[key];
    if (value === undefined && create && field.default !== undefined) {
      value = field.default === 'now' ? new Date() : field.default === 'uuid' ? randomUUID() : field.default;
    }
    if (field.updatedAt && value === undefined) value = new Date();
    if (value === undefined && !create) continue;
    if (value === undefined && field.nullable) value = null;
    if (value == null && !field.nullable) throw new Error(`${model}.${key} is required.`);
    if (value != null) {
      if (field.type === 'date') {
        value = new Date(value).getTime();
        if (!Number.isFinite(value)) throw new Error(`Invalid ${key} date.`);
      } else if (field.type === 'boolean') {
        if (typeof value !== 'boolean') throw new Error(`Invalid ${key} boolean.`);
        value = value ? 1 : 0;
      } else if (field.type === 'string') {
        if (typeof value !== 'string' || value.length > (field.length || Infinity)) throw new Error(`Invalid ${key} text.`);
        if (field.values && !field.values.includes(value)) throw new Error(`Invalid ${key} value.`);
      } else if (typeof value !== 'number' || !Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value))) {
        throw new Error(`Invalid ${key} number.`);
      }
    }
    result[fieldName(model, key)] = value;
  }
  return result;
}

type PendingEdit = { model: ModelName; kind: 'adds' | 'updates'; feature: Feature; row: Row };
async function prepareWrite(model: ModelName, data: Row, existing?: StoredRow): Promise<PendingEdit[]> {
  const info = await loadFieldNames(model);
  const attrs = attributes(model, data, !existing);
  const row = { ...existing?.row, ...decode(model, { ...Object.fromEntries(Object.entries(existing?.row || {}).map(([key, value]) => [fieldName(model, key), value])), ...attrs }) };
  if (existing) attrs[info.objectIdField] = existing.objectId;
  const feature: Feature = { attributes: attrs };
  if (schemas[model].spatial) {
    feature.geometry = row.latitude == null || row.longitude == null ? null : { x: row.longitude, y: row.latitude, spatialReference: { wkid: 4326 } };
  }
  const edits: PendingEdit[] = [{ model, kind: existing ? 'updates' : 'adds', feature, row }];
  for (const [key, relation] of Object.entries(schemas[model].relations)) {
    const nested = data[key];
    if (nested === undefined) continue;
    if (relation.local !== 'id') throw new Error(`Nested writes to ${model}.${key} are not supported.`);
    if (nested.create) {
      for (const child of Array.isArray(nested.create) ? nested.create : [nested.create]) {
        edits.push(...await prepareWrite(relation.model, { ...child, [relation.foreign]: row.id }));
      }
    } else if (nested.upsert) {
      const child = (await findRows(relation.model, { where: { [relation.foreign]: row.id }, take: 1 }))[0];
      edits.push(...await prepareWrite(relation.model, { ...(child ? nested.upsert.update : nested.upsert.create), [relation.foreign]: row.id }, child));
    } else throw new Error(`Unsupported nested write to ${model}.${key}.`);
  }
  return edits;
}

async function persist(pending: PendingEdit[]) {
  // Validate foreign keys before sending a single atomic service edit.
  for (const edit of pending) {
    for (const relation of Object.values(schemas[edit.model].relations)) {
      if (relation.local === 'id') continue;
      const value = edit.row[relation.local];
      if (value == null) continue;
      const inBatch = pending.some((other) => other.model === relation.model && other.row[relation.foreign] === value);
      if (!inBatch && !(await findRows(relation.model, { where: { [relation.foreign]: value }, take: 1 })).length) {
        throw new Error(`Related ${relation.model} record does not exist.`);
      }
    }
  }
  const edits: ServiceEdit[] = [];
  for (const entry of pending) {
    const info = await layerInfo(schemas[entry.model].name);
    let edit = edits.find((value) => value.id === info.id);
    if (!edit) { edit = { id: info.id }; edits.push(edit); }
    (edit[entry.kind] ||= []).push(entry.feature);
  }
  await applyEdits(edits);
}

function repository(model: ModelName) {
  const findMany = async (args: Args = {}) => projectRows(model, (await findRows(model, args)).map(({ row }) => row), args);
  const findFirst = async (args: Args = {}) => (await findMany({ ...args, take: 1 }))[0] || null;
  const requireUniqueKey = (args: Args) => {
    if (!Object.entries(args.where || {}).some(([key, value]) => schemas[model].fields[key]?.unique && value != null && typeof value !== 'object')) {
      throw new Error(`${model} lookup requires a unique key.`);
    }
  };
  const write = async (args: Args & { data: Row }, update: boolean) => {
    if (update) requireUniqueKey(args);
    const existing = update ? (await findRows(model, { where: args.where, take: 1 }))[0] : undefined;
    if (update && !existing) throw new Error(`${model} record not found.`);
    const edits = await prepareWrite(model, args.data, existing);
    await persist(edits);
    return (await projectRows(model, [edits[0].row], args))[0];
  };
  return {
    findMany, findFirst,
    findUnique: (args: Args) => { requireUniqueKey(args); return findFirst(args); },
    async count(args: Args = {}) {
      const info = await layerInfo(schemas[model].name);
      const result = await arcgisRequest<{ count: number }>(`${info.id}/query`, { where: await compileWhere(model, args.where), returnCountOnly: true });
      if (typeof result.count !== 'number') throw new Error('Invalid ArcGIS count response.');
      return result.count;
    },
    create: (args: Args & { data: Row }) => write(args, false),
    update: (args: Args & { data: Row }) => write(args, true),
    async createMany({ data }: { data: Row[] }) {
      const edits: PendingEdit[] = [];
      for (const row of data) edits.push(...await prepareWrite(model, row));
      await persist(edits);
      return { count: data.length };
    },
    async updateMany(args: Args & { data: Row }) {
      const records = await findRows(model, args);
      const edits: PendingEdit[] = [];
      for (const existing of records) edits.push(...await prepareWrite(model, args.data, existing));
      await persist(edits);
      return { count: records.length };
    },
    async deleteMany(args: Args) {
      // Only leaf records are deleted by the app; refuse accidental parent deletion.
      if (Object.values(schemas[model].relations).some((relation) => relation.local === 'id')) throw new Error('Delete dependent records explicitly before deleting parents.');
      const rows = await findRows(model, args);
      const info = await layerInfo(schemas[model].name);
      if (rows.length) await applyEdits([{ id: info.id, deletes: rows.map(({ objectId }) => objectId) }]);
      return { count: rows.length };
    },
  };
}

const data = Object.fromEntries((Object.keys(schemas) as ModelName[]).map((model) => [model, repository(model)])) as { [M in ModelName]: Repository<M> };
export default data;
