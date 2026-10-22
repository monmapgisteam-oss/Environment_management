import { api } from '@/convex/_generated/api';
import schemaJson from './schema.json';
import { convex, serverSecret } from './convex';
import type { ModelName, Repository } from './types';

// Application data lives in Convex. The repository engine (convex/engine.ts)
// runs inside Convex; this side only converts dates to and from epoch ms.
type Field = { type: string };
type Relation = { model: ModelName };
type Schema = { fields: Record<string, Field>; relations: Record<string, Relation> };
const schemas = schemaJson as unknown as Record<ModelName, Schema>;
type Row = Record<string, any>;

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

// A dropped connection to Convex surfaces as "fetch failed". Reads are safe to
// repeat, so they get one more try after a short pause; writes are not retried
// because a write that reached Convex before the drop would run twice.
const READ_RETRY_DELAY_MS = 500;

function isNetworkError(error: unknown) {
  return error instanceof TypeError && error.message === 'fetch failed';
}

function repository(model: ModelName) {
  const query = (op: string, args: Row) =>
    convex().query(api.data.read, { secret: serverSecret(), model, op, args: encode(args) });
  const read = async (op: string, args: Row = {}) => {
    try {
      return await query(op, args);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, READ_RETRY_DELAY_MS));
      return query(op, args);
    }
  };
  const write = async (op: string, args: Row) =>
    convex().mutation(api.data.write, { secret: serverSecret(), model, op, args: encode(args) });
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
