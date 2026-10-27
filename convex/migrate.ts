import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertServer } from './secret';
import { schemas } from './engine';

// One-time import of the ArcGIS data (scripts/migrate-arcgis-to-convex.mjs).
// Rows are inserted as given, in order, so their creation order is preserved.

export const tableCounts = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);
    const counts: Record<string, number> = {};
    for (const table of Object.keys(schemas)) {
      counts[table] = (await (ctx.db as any).query(table).collect()).length;
    }
    return counts;
  },
});

export const insertRows = mutation({
  args: { secret: v.string(), table: v.string(), rows: v.array(v.any()) },
  handler: async (ctx, { secret, table, rows }) => {
    assertServer(secret);
    if (!schemas[table]) throw new Error(`Unknown table: ${table}`);
    for (const row of rows) await (ctx.db as any).insert(table, row);
    return rows.length;
  },
});
