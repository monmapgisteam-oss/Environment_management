import { mutationGeneric as mutation, queryGeneric as query } from 'convex/server';
import { v } from 'convex/values';
import { assertServer } from './secret';

export const generateUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);
    return ctx.storage.generateUploadUrl();
  },
});

export const url = query({
  args: { secret: v.string(), storageId: v.id('_storage') },
  handler: async (ctx, { secret, storageId }) => {
    assertServer(secret);
    return ctx.storage.getUrl(storageId);
  },
});

export const remove = mutation({
  args: { secret: v.string(), storageId: v.id('_storage') },
  handler: async (ctx, { secret, storageId }) => {
    assertServer(secret);
    await ctx.storage.delete(storageId);
  },
});

// File deletion and its metadata commit together; a failure rolls both back.
export const removeUploads = mutation({
  args: { secret: v.string(), ids: v.array(v.string()) },
  handler: async (ctx, { secret, ids }) => {
    assertServer(secret);
    for (const id of new Set(ids)) {
      const row = await ctx.db.query('upload').withIndex('idx_id', (q) => q.eq('id', id)).unique();
      if (!row) continue;
      if (row.storageId) await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
    }
  },
});
