import { defineSchema, defineTable } from 'convex/server';
import { v, type Validator } from 'convex/values';
import { indexedFields, schemas } from './engine';

// Application tables are generated from lib/db/schema.json. Dates are stored
// as epoch milliseconds; enum values are checked by the engine.
function validator(type: string): Validator<any, any, any> {
  if (type === 'string') return v.string();
  if (type === 'boolean') return v.boolean();
  return v.number();
}

const appTables = Object.fromEntries(Object.entries(schemas).map(([model, schema]) => {
  let table = defineTable(Object.fromEntries(Object.entries(schema.fields).map(([key, field]) => {
    const base = validator(field.type);
    return [key, field.nullable ? v.union(base, v.null()) : base];
  })));
  for (const field of indexedFields(model)) table = table.index(`idx_${field}`, [field]);
  return [model, table];
}));

export default defineSchema({
  ...appTables,
  // Survey123 records copied from ArcGIS: layer 0 features and repeat_1 rows.
  surveyRecord: defineTable({
    layerId: v.number(),
    objectid: v.number(),
    globalid: v.string(),
    parentglobalid: v.union(v.string(), v.null()),
    attributes: v.any(),
    x: v.union(v.number(), v.null()),
    y: v.union(v.number(), v.null()),
  })
    .index('by_layer_objectid', ['layerId', 'objectid'])
    .index('by_layer_globalid', ['layerId', 'globalid'])
    .index('by_parentglobalid', ['parentglobalid']),
  surveyAttachment: defineTable({
    layerId: v.number(),
    parentObjectId: v.number(),
    attachmentId: v.number(),
    name: v.string(),
    contentType: v.string(),
    storageId: v.id('_storage'),
  }).index('by_parent', ['layerId', 'parentObjectId']),
});
