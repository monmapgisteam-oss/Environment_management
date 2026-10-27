import { defineSchema, defineTable } from 'convex/server';
import { v, type Validator } from 'convex/values';
import { indexedFields, schemas } from './engine';

// Application tables are generated from lib/db/schema.json. Dates are stored
// as epoch milliseconds; enum values are checked by the engine. Nullable
// fields are also optional, so adding one does not invalidate existing rows.
function validator(type: string): Validator<any, any, any> {
  if (type === 'string') return v.string();
  if (type === 'boolean') return v.boolean();
  return v.number();
}

const appTables = Object.fromEntries(Object.entries(schemas).map(([model, schema]) => {
  let table = defineTable(Object.fromEntries(Object.entries(schema.fields).map(([key, field]) => {
    const base = validator(field.type);
    return [key, field.nullable ? v.optional(v.union(base, v.null())) : base];
  })));
  for (const field of indexedFields(model)) table = table.index(`idx_${field}`, [field]);
  return [model, table];
}));

export default defineSchema({
  ...appTables,
  // Shared attempt counters for login and sign-up (lib/auth/rateLimit.ts), so
  // the limit holds across restarts and server instances.
  rateLimit: defineTable({
    key: v.string(),
    count: v.number(),
    resetAt: v.number(),
  }).index('by_key', ['key']),
});
