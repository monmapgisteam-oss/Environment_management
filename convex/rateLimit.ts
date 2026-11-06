import { mutationGeneric as mutation } from 'convex/server';
import { v } from 'convex/values';
import { assertServer } from './secret';

export const hit = mutation({
  args: { secret: v.string(), key: v.string(), limit: v.number(), windowMs: v.number(), count: v.optional(v.boolean()) },
  handler: async (ctx, { secret, key, limit, windowMs, count: increase = true }) => {
    assertServer(secret);
    const now = Date.now();
    const row = await ctx.db.query('rateLimit').withIndex('by_key', (q) => q.eq('key', key)).unique();
    const active = row && row.resetAt > now;
    if (!increase) {
      const count = active ? row.count : 0;
      return { ok: count < limit, remaining: Math.max(0, limit - count), retryAfterSeconds: active ? Math.max(1, Math.ceil((row.resetAt - now) / 1000)) : 0 };
    }
    const count = active ? row.count + 1 : 1;
    const resetAt = active ? row.resetAt : now + windowMs;
    if (row) await ctx.db.patch(row._id, { count, resetAt });
    else await ctx.db.insert('rateLimit', { key, count, resetAt });
    return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
  },
});
