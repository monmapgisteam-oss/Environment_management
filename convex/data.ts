import { mutation, query, type DatabaseReader, type DatabaseWriter } from './_generated/server';
import { v } from 'convex/values';
import { read as runRead, write as runWrite, type Row, type Stored, type Store } from './engine';
import { assertServer } from './secret';

function toStored(doc: Row): Stored {
  const { _id, _creationTime, ...row } = doc;
  return { row, docId: _id, order: _creationTime };
}

function store(db: DatabaseReader | DatabaseWriter): Store {
  // Whole-table loads are cached for the call and dropped after any write.
  const tables = new Map<string, Promise<Stored[]>>();
  const any = db as any;
  return {
    load(model, equals) {
      if (equals) {
        return any.query(model).withIndex(`idx_${equals.field}`, (q: any) => q.eq(equals.field, equals.value)).collect()
          .then((docs: Row[]) => docs.map(toStored));
      }
      if (!tables.has(model)) tables.set(model, any.query(model).collect().then((docs: Row[]) => docs.map(toStored)));
      return tables.get(model)!;
    },
    async insert(model, row) { tables.delete(model); await any.insert(model, row); },
    async patch(model, docId, row) { tables.delete(model); await any.patch(docId, row); },
    async remove(model, docId) { tables.delete(model); await any.delete(docId); },
  };
}

const call = { secret: v.string(), model: v.string(), op: v.string(), args: v.any() };

export const read = query({
  args: call,
  handler: async (ctx, { secret, model, op, args }) => {
    assertServer(secret);
    return runRead(store(ctx.db), model, op, args ?? {});
  },
});

export const write = mutation({
  args: call,
  handler: async (ctx, { secret, model, op, args }) => {
    assertServer(secret);
    return runWrite(store(ctx.db), model, op, args ?? {}, () => crypto.randomUUID());
  },
});
