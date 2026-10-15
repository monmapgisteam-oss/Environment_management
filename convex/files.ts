import { mutation, query } from './_generated/server';
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
