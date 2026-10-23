import { mutation, query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { assertServer } from './secret';

// Survey123 records copied from the ArcGIS service. Layer 0 holds one point per
// report; layer 1 (formerly repeat_1) one row per evaluator, linked by
// parentglobalid. Attribute names keep their Survey123 spelling.

const filter = v.object({
  register: v.optional(v.string()),
  registerMatch: v.optional(v.union(v.literal('exact'), v.literal('iexact'), v.literal('contains'))),
  objectIds: v.optional(v.array(v.number())),
  parentGlobalIds: v.optional(v.array(v.string())),
});

async function records(ctx: QueryCtx, layerId: number) {
  return ctx.db.query('surveyRecord').withIndex('by_layer_objectid', (q) => q.eq('layerId', layerId)).collect();
}

export const list = query({
  args: { secret: v.string(), layerId: v.number(), filter: v.optional(filter), limit: v.optional(v.number()) },
  handler: async (ctx, { secret, layerId, filter = {}, limit }) => {
    assertServer(secret);
    const register = filter.register?.trim();
    const objectIds = filter.objectIds && new Set(filter.objectIds);
    const parents = filter.parentGlobalIds && new Set(filter.parentGlobalIds.map((id) => id.toLowerCase()));
    const rows = (await records(ctx, layerId)).filter((row) => {
      if (objectIds && !objectIds.has(row.objectid)) return false;
      if (parents && !parents.has(String(row.parentglobalid || '').toLowerCase())) return false;
      if (register != null) {
        const stored = typeof row.attributes.Register === 'string' ? row.attributes.Register : '';
        if (filter.registerMatch === 'iexact') return stored.toUpperCase() === register.toUpperCase();
        if (filter.registerMatch === 'contains') return stored.toUpperCase().includes(register.toUpperCase());
        return stored === register;
      }
      return true;
    });
    return rows.slice(0, limit).map((row) => ({
      attributes: { ...row.attributes, objectid: row.objectid, globalid: row.globalid, parentglobalid: row.parentglobalid },
      x: row.x,
      y: row.y,
    }));
  },
});

export const attachments = query({
  args: { secret: v.string(), layerId: v.number(), objectIds: v.array(v.number()) },
  handler: async (ctx, { secret, layerId, objectIds }) => {
    assertServer(secret);
    return Promise.all(objectIds.map(async (parentObjectId) => ({
      parentObjectId,
      attachmentInfos: (await ctx.db.query('surveyAttachment')
        .withIndex('by_parent', (q) => q.eq('layerId', layerId).eq('parentObjectId', parentObjectId)).collect())
        .map((item) => ({ id: item.attachmentId, name: item.name, contentType: item.contentType })),
    })));
  },
});

export const attachmentUrl = query({
  args: { secret: v.string(), layerId: v.number(), objectId: v.number(), attachmentId: v.number() },
  handler: async (ctx, { secret, layerId, objectId, attachmentId }) => {
    assertServer(secret);
    const item = (await ctx.db.query('surveyAttachment')
      .withIndex('by_parent', (q) => q.eq('layerId', layerId).eq('parentObjectId', objectId)).collect())
      .find((entry) => entry.attachmentId === attachmentId);
    if (!item) return null;
    return { url: await ctx.storage.getUrl(item.storageId), contentType: item.contentType };
  },
});

const point = v.optional(v.union(v.object({ x: v.number(), y: v.number() }), v.null()));

export const add = mutation({
  args: { secret: v.string(), layerId: v.number(), attributes: v.any(), geometry: point },
  handler: async (ctx, { secret, layerId, attributes, geometry }) => {
    assertServer(secret);
    const last = await ctx.db.query('surveyRecord').withIndex('by_layer_objectid', (q) => q.eq('layerId', layerId)).order('desc').first();
    const objectid = (last?.objectid ?? 0) + 1;
    const globalid = `{${crypto.randomUUID().toUpperCase()}}`;
    const { objectid: _o, globalid: _g, parentglobalid, ...rest } = attributes || {};
    const now = Date.now();
    await ctx.db.insert('surveyRecord', {
      layerId, objectid, globalid,
      parentglobalid: typeof parentglobalid === 'string' ? parentglobalid : null,
      attributes: { ...rest, CreationDate: now, EditDate: now },
      x: geometry?.x ?? null,
      y: geometry?.y ?? null,
    });
    return { objectId: objectid, globalId: globalid };
  },
});

export const updateByGlobalId = mutation({
  args: { secret: v.string(), layerId: v.number(), globalid: v.string(), attributes: v.any() },
  handler: async (ctx, { secret, layerId, globalid, attributes }) => {
    assertServer(secret);
    const row = await ctx.db.query('surveyRecord').withIndex('by_layer_globalid', (q) => q.eq('layerId', layerId).eq('globalid', globalid)).first();
    if (!row) return null;
    const { objectid: _o, globalid: _g, parentglobalid, ...rest } = attributes || {};
    await ctx.db.patch(row._id, {
      attributes: { ...row.attributes, ...rest, EditDate: Date.now() },
      ...(typeof parentglobalid === 'string' ? { parentglobalid } : {}),
    });
    return { objectId: row.objectid, globalId: row.globalid };
  },
});

// Removes a record that has no attachments, e.g. an evaluator's score row when
// the evaluation is undone.
export const removeByGlobalId = mutation({
  args: { secret: v.string(), layerId: v.number(), globalid: v.string() },
  handler: async (ctx, { secret, layerId, globalid }) => {
    assertServer(secret);
    const row = await ctx.db.query('surveyRecord').withIndex('by_layer_globalid', (q) => q.eq('layerId', layerId).eq('globalid', globalid)).first();
    if (!row) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});
