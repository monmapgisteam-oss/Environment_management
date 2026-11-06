import { mutationGeneric as mutation } from 'convex/server';
import { v } from 'convex/values';
import { assertServer } from './secret';
import { schemas, type Row } from './engine';

const canonical = (rows: Row[]) => JSON.stringify(rows.map(({ _id, _creationTime, ...row }) =>
  Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))),
).sort((a, b) => String(a.id).localeCompare(String(b.id))));

// All tables merge in one transaction. A changed destination aborts before
// any edits; aliases and their references cannot become partially visible.
export const mergeDatabase = mutation({
  args: { secret: v.string(), tables: v.any(), expected: v.any(), removeIds: v.any() },
  handler: async (ctx, { secret, tables, expected, removeIds }) => {
    assertServer(secret);
    const names = Object.keys(schemas);
    if (Object.keys(tables).length !== names.length || names.some((name) => !Array.isArray(tables[name]) || !Array.isArray(expected[name]) || !Array.isArray(removeIds[name]))) {
      throw new Error('Every application table is required.');
    }
    const db = ctx.db as any;
    const current: Record<string, Row[]> = {};
    for (const name of names) current[name] = await db.query(name).collect();
    if (names.every((name) => canonical(current[name]) === canonical(tables[name]))) return { alreadyMerged: true };
    for (const name of names) {
      if (canonical(current[name]) !== canonical(expected[name])) throw new Error('Destination changed since backup; take a new snapshot.');
      const rows: Row[] = tables[name];
      const wanted = new Set(rows.map((row) => row.id));
      if (wanted.size !== rows.length) throw new Error('Duplicate application ID.');
      for (const row of current[name]) {
        if (!wanted.has(row.id) && !removeIds[name].includes(row.id)) throw new Error('Existing row would be lost.');
      }
      for (const row of rows) {
        if (!row.id || Object.keys(row).some((key) => !schemas[name].fields[key])) throw new Error('Invalid row.');
      }
      if (removeIds[name].some((id: string) => wanted.has(id))) throw new Error('Cannot remove a retained row.');
    }
    for (const name of names) {
      const byId = new Map(current[name].map((row) => [row.id, row]));
      for (const row of tables[name]) {
        const existing = byId.get(row.id);
        if (existing) await db.replace(existing._id, row);
        else await db.insert(name, row);
      }
      for (const id of removeIds[name]) {
        const existing = byId.get(id);
        if (existing) await db.delete(existing._id);
      }
    }
    return { alreadyMerged: false };
  },
});
