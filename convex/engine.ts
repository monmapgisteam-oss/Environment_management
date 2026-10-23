import schemaJson from '../lib/db/schema.json';

// Prisma-style repository engine over the application schema. It runs inside
// Convex queries and mutations, so every write batch is one transaction.
// Dates travel and are stored as epoch milliseconds.

export type Field = { type: string; nullable: boolean; unique?: boolean; default?: unknown; updatedAt?: boolean; length?: number; values?: string[] };
export type Relation = { model: string; local: string; foreign: string; many: boolean; nullable: boolean };
export type Schema = { name: string; fields: Record<string, Field>; relations: Record<string, Relation> };
export const schemas = schemaJson as Record<string, Schema>;

export type Row = Record<string, any>;
export type Args = { where?: Row; include?: Row; select?: Row; orderBy?: Row | Row[]; take?: number; skip?: number };
export type Stored = { row: Row; docId: string; order: number };

// Storage the engine runs on. `equals` lets an implementation use an index.
export interface Store {
  load(model: string, equals?: { field: string; value: string }): Promise<Stored[]>;
  insert(model: string, row: Row): Promise<void>;
  patch(model: string, docId: string, row: Row): Promise<void>;
  remove(model: string, docId: string): Promise<void>;
}

export function indexedFields(model: string): string[] {
  const fields = new Set(['id']);
  for (const relation of Object.values(schemas[model].relations)) {
    if (relation.local !== 'id') fields.add(relation.local);
  }
  return Array.from(fields);
}

function schemaOf(model: string) {
  const schema = schemas[model];
  if (!schema) throw new Error(`Unknown model: ${model}`);
  return schema;
}

function fieldOf(model: string, key: string) {
  const field = schemaOf(model).fields[key];
  if (!field) throw new Error(`Unknown ${model} field: ${key}`);
  return field;
}

function literal(value: unknown, field: Field): unknown {
  if (value === null) return null;
  if (field.type === 'date') {
    const time = typeof value === 'number' ? value : Date.parse(String(value));
    if (!Number.isFinite(time)) throw new Error('Invalid date filter.');
    return time;
  }
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') throw new Error('Invalid boolean filter.');
    return value;
  }
  if (field.type === 'number' || field.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid numeric filter.');
    return value;
  }
  if (typeof value !== 'string') throw new Error('Invalid string filter.');
  return value;
}

// Three-valued logic so NULL behaves as it did in SQL: comparisons against
// NULL are unknown, and unknown rows are excluded.
type Truth = boolean | null;
const and = (values: Truth[]): Truth => values.includes(false) ? false : values.includes(null) ? null : true;
const or = (values: Truth[]): Truth => values.includes(true) ? true : values.includes(null) ? null : false;
const not = (value: Truth): Truth => value === null ? null : !value;

function compare(stored: unknown, operator: string, operand: unknown): Truth {
  if (stored == null || operand == null) return null;
  const a = stored as number | string;
  const b = operand as number | string;
  switch (operator) {
    case 'eq': return a === b;
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'lt': return a < b;
    case 'lte': return a <= b;
    default: throw new Error(`Unsupported filter operator: ${operator}`);
  }
}

function scalarTest(model: string, key: string, value: unknown, row: Row): Truth {
  const field = fieldOf(model, key);
  const stored = row[key] ?? null;
  if (value === null) return stored === null;
  if (typeof value !== 'object') return compare(stored, 'eq', literal(value, field));
  const conditions = Object.entries(value as Row).filter(([, v]) => v !== undefined).map(([operator, operand]): Truth => {
    if (operator === 'equals') return scalarTest(model, key, operand, row);
    if (operator === 'not') return operand === null ? stored !== null : not(scalarTest(model, key, operand, row));
    if (operator === 'in' || operator === 'notIn') {
      if (!Array.isArray(operand)) throw new Error('Invalid list filter.');
      if (stored === null) return operand.length ? null : operator === 'notIn';
      const found = operand.some((item) => literal(item, field) === stored);
      return operator === 'in' ? found : !found;
    }
    if (!['gt', 'gte', 'lt', 'lte'].includes(operator)) throw new Error(`Unsupported filter operator: ${operator}`);
    return compare(stored, operator, literal(operand, field));
  });
  return and(conditions);
}

type Predicate = (row: Row) => Truth;

export async function compileWhere(store: Store, model: string, where: Row = {}): Promise<Predicate> {
  const schema = schemaOf(model);
  const parts = await Promise.all(Object.entries(where).filter(([, value]) => value !== undefined).map(async ([key, value]): Promise<Predicate> => {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const clauses = await Promise.all((Array.isArray(value) ? value : [value]).map((item: Row) => compileWhere(store, model, item)));
      if (key === 'NOT') return (row) => and(clauses.map((clause) => not(clause(row))));
      return key === 'OR' ? (row) => or(clauses.map((clause) => clause(row))) : (row) => and(clauses.map((clause) => clause(row)));
    }
    const relation = schema.relations[key];
    if (relation) {
      const nullCheck = 'is' in value || 'isNot' in value;
      const matches = await findRows(store, relation.model, { where: nullCheck ? {} : value });
      const keys = Array.from(new Set(matches.map(({ row }) => row[relation.foreign]).filter((v) => v != null)));
      // `is: null` also matches rows whose own key is NULL (no related record).
      if ('is' in value) return (row) => row[relation.local] == null || scalarTest(model, relation.local, { notIn: keys }, row);
      return (row) => scalarTest(model, relation.local, { in: keys }, row);
    }
    fieldOf(model, key);
    return (row) => scalarTest(model, key, value, row);
  }));
  return (row) => and(parts.map((part) => part(row)));
}

// A direct equality on an indexed field lets the store narrow the scan.
function indexHint(model: string, where: Row = {}) {
  const indexed = indexedFields(model);
  for (const [key, value] of Object.entries(where)) {
    if (indexed.includes(key) && typeof value === 'string') return { field: key, value };
  }
  return undefined;
}

function sortValue(value: unknown) {
  return value == null ? null : value as number | string | boolean;
}

export async function findRows(store: Store, model: string, args: Args = {}): Promise<Stored[]> {
  if (args.take === 0) return [];
  const skip = args.skip || 0;
  if (skip < 0 || (args.take != null && args.take < 0)) throw new Error('Invalid pagination.');
  const predicate = await compileWhere(store, model, args.where);
  const rows = (await store.load(model, indexHint(model, args.where))).filter(({ row }) => predicate(row) === true);
  const order = (Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : []).flatMap((entry) =>
    Object.entries(entry).map(([key, direction]) => {
      if (direction !== 'asc' && direction !== 'desc') throw new Error('Invalid sort direction.');
      fieldOf(model, key);
      return { key, desc: direction === 'desc' };
    }),
  );
  rows.sort((a, b) => {
    for (const { key, desc } of order) {
      const x = sortValue(a.row[key]);
      const y = sortValue(b.row[key]);
      if (x === y) continue;
      // Match PostgreSQL: NULLs sort last ascending and first descending.
      if (x === null) return desc ? -1 : 1;
      if (y === null) return desc ? 1 : -1;
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    }
    return a.order - b.order;
  });
  return rows.slice(skip, args.take == null ? undefined : skip + args.take);
}

export async function projectRows(store: Store, model: string, rows: Row[], args: Args): Promise<Row[]> {
  const schema = schemaOf(model);
  const selection = args.select || args.include || {};
  const result = rows.map((row) => args.select ? Object.fromEntries(Object.entries(args.select).filter(([key, enabled]) => enabled && schema.fields[key]).map(([key]) => [key, row[key]])) : { ...row });
  for (const [key, requested] of Object.entries(selection)) {
    if (!requested || schema.fields[key]) continue;
    if (key === '_count') {
      for (const row of result) row._count = {};
      for (const [relationName, enabled] of Object.entries((requested as Row).select || {})) {
        if (!enabled) continue;
        const relation = schema.relations[relationName];
        if (!relation) throw new Error(`Unknown count relation: ${relationName}`);
        const keys = rows.map((row) => row[relation.local]).filter((value) => value != null);
        const children = await findRows(store, relation.model, { where: { [relation.foreign]: { in: keys } } });
        rows.forEach((row, i) => { result[i]._count[relationName] = children.filter((child) => child.row[relation.foreign] === row[relation.local]).length; });
      }
      continue;
    }
    const relation = schema.relations[key];
    if (!relation) throw new Error(`Unknown ${model} relation: ${key}`);
    const options: Args = requested === true ? {} : requested;
    const keys = Array.from(new Set(rows.map((row) => row[relation.local]).filter((value) => value != null)));
    const children = await findRows(store, relation.model, { ...options, take: undefined, skip: undefined, where: { AND: [options.where || {}, { [relation.foreign]: { in: keys } }] } });
    const projected = await projectRows(store, relation.model, children.map(({ row }) => row), options);
    rows.forEach((row, i) => {
      let matching = children.flatMap((child, j) => child.row[relation.foreign] === row[relation.local] ? [projected[j]] : []);
      matching = matching.slice(options.skip || 0, options.take == null ? undefined : (options.skip || 0) + options.take);
      result[i][key] = relation.many ? matching : matching[0] || null;
    });
  }
  return result;
}

function attributes(model: string, data: Row, create: boolean, uuid: () => string): Row {
  const schema = schemaOf(model);
  const result: Row = {};
  for (const key of Object.keys(data)) {
    if (!schema.fields[key] && !schema.relations[key]) throw new Error(`Unknown ${model} write field: ${key}`);
  }
  for (const [key, field] of Object.entries(schema.fields)) {
    let value = data[key];
    if (value === undefined && create && field.default !== undefined) {
      value = field.default === 'now' ? Date.now() : field.default === 'uuid' ? uuid() : field.default;
    }
    if (field.updatedAt && value === undefined) value = Date.now();
    if (value === undefined && !create) continue;
    if (value === undefined && field.nullable) value = null;
    if (value == null && !field.nullable) throw new Error(`${model}.${key} is required.`);
    if (value != null) {
      if (field.type === 'date') {
        value = typeof value === 'number' ? value : Date.parse(String(value));
        if (!Number.isFinite(value)) throw new Error(`Invalid ${key} date.`);
      } else if (field.type === 'boolean') {
        if (typeof value !== 'boolean') throw new Error(`Invalid ${key} boolean.`);
      } else if (field.type === 'string') {
        if (typeof value !== 'string' || value.length > (field.length || Infinity)) throw new Error(`Invalid ${key} text.`);
        if (field.values && !field.values.includes(value)) throw new Error(`Invalid ${key} value.`);
      } else if (typeof value !== 'number' || !Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value))) {
        throw new Error(`Invalid ${key} number.`);
      }
    }
    result[key] = value;
  }
  return result;
}

type PendingEdit = { model: string; existing?: Stored; row: Row; changes: Row };

async function prepareWrite(store: Store, model: string, data: Row, uuid: () => string, existing?: Stored): Promise<PendingEdit[]> {
  const changes = attributes(model, data, !existing, uuid);
  const row = { ...existing?.row, ...changes };
  const edits: PendingEdit[] = [{ model, existing, row, changes }];
  for (const [key, relation] of Object.entries(schemaOf(model).relations)) {
    const nested = data[key];
    if (nested === undefined) continue;
    if (relation.local !== 'id') throw new Error(`Nested writes to ${model}.${key} are not supported.`);
    if (nested.create) {
      for (const child of Array.isArray(nested.create) ? nested.create : [nested.create]) {
        edits.push(...await prepareWrite(store, relation.model, { ...child, [relation.foreign]: row.id }, uuid));
      }
    } else if (nested.upsert) {
      const child = (await findRows(store, relation.model, { where: { [relation.foreign]: row.id }, take: 1 }))[0];
      edits.push(...await prepareWrite(store, relation.model, { ...(child ? nested.upsert.update : nested.upsert.create), [relation.foreign]: row.id }, uuid, child));
    } else throw new Error(`Unsupported nested write to ${model}.${key}.`);
  }
  return edits;
}

async function persist(store: Store, pending: PendingEdit[]) {
  for (const edit of pending) {
    const schema = schemaOf(edit.model);
    // Foreign keys must point at an existing record or one in this batch.
    for (const relation of Object.values(schema.relations)) {
      if (relation.local === 'id') continue;
      const value = edit.row[relation.local];
      if (value == null) continue;
      const inBatch = pending.some((other) => other.model === relation.model && other.row[relation.foreign] === value);
      if (!inBatch && !(await findRows(store, relation.model, { where: { [relation.foreign]: value }, take: 1 })).length) {
        throw new Error(`Related ${relation.model} record does not exist.`);
      }
    }
    // Unique fields (NULLs never collide).
    for (const [key, field] of Object.entries(schema.fields)) {
      const value = edit.row[key];
      if (!field.unique || value == null) continue;
      const clash = (await store.load(edit.model)).some((other) => other.row[key] === value && other.docId !== edit.existing?.docId)
        || pending.some((other) => other !== edit && other.model === edit.model && other.row[key] === value);
      if (clash) throw new Error(`${edit.model}.${key} must be unique.`);
    }
  }
  for (const edit of pending) {
    if (edit.existing) await store.patch(edit.model, edit.existing.docId, edit.changes);
    else await store.insert(edit.model, edit.row);
  }
}

function requireUniqueKey(model: string, args: Args) {
  const schema = schemaOf(model);
  if (!Object.entries(args.where || {}).some(([key, value]) => schema.fields[key]?.unique && value != null && typeof value !== 'object')) {
    throw new Error(`${model} lookup requires a unique key.`);
  }
}

export async function read(store: Store, model: string, op: string, args: Args = {}): Promise<unknown> {
  switch (op) {
    case 'findMany':
      return projectRows(store, model, (await findRows(store, model, args)).map(({ row }) => row), args);
    case 'findUnique':
      requireUniqueKey(model, args);
    // falls through
    case 'findFirst':
      return (await read(store, model, 'findMany', { ...args, take: 1 }) as Row[])[0] || null;
    case 'count':
      return (await findRows(store, model, { where: args.where })).length;
    default:
      throw new Error(`Unsupported read: ${op}`);
  }
}

export async function write(store: Store, model: string, op: string, args: Args & { data?: Row | Row[] }, uuid: () => string): Promise<unknown> {
  switch (op) {
    case 'create':
    case 'update': {
      const update = op === 'update';
      if (update) requireUniqueKey(model, args);
      const existing = update ? (await findRows(store, model, { where: args.where, take: 1 }))[0] : undefined;
      if (update && !existing) throw new Error(`${model} record not found.`);
      const edits = await prepareWrite(store, model, args.data as Row, uuid, existing);
      await persist(store, edits);
      return (await projectRows(store, model, [edits[0].row], args))[0];
    }
    case 'createMany': {
      const rows = args.data as Row[];
      const edits: PendingEdit[] = [];
      for (const row of rows) edits.push(...await prepareWrite(store, model, row, uuid));
      await persist(store, edits);
      return { count: rows.length };
    }
    case 'updateMany': {
      const records = await findRows(store, model, { where: args.where });
      const edits: PendingEdit[] = [];
      for (const existing of records) edits.push(...await prepareWrite(store, model, args.data as Row, uuid, existing));
      await persist(store, edits);
      return { count: records.length };
    }
    case 'deleteMany': {
      // A record is deleted only once nothing points at it any more; dependents
      // are deleted explicitly first, never cascaded.
      const rows = await findRows(store, model, { where: args.where });
      const children = Object.values(schemaOf(model).relations).filter((relation) => relation.local === 'id');
      for (const { row } of rows) {
        for (const relation of children) {
          const dependents = await findRows(store, relation.model, { where: { [relation.foreign]: row.id }, take: 1 });
          if (dependents.length > 0) throw new Error('Delete dependent records explicitly before deleting parents.');
        }
      }
      for (const { docId } of rows) await store.remove(model, docId);
      return { count: rows.length };
    }
    default:
      throw new Error(`Unsupported write: ${op}`);
  }
}
