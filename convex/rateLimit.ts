import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertServer } from './secret';

// Counts one attempt for `key` in a fixed window. Runs as one transaction, so
// parallel requests on different servers cannot both slip through.
export const hit = mutation({
  args: { secret: v.string(), key: v.string(), limit: v.number(), windowMs: v.number() },
  handler: async (ctx, { secret, key, limit, windowMs }) => {
    assertServer(secret);
    const now = Date.now();
    const row = await ctx.db.query('rateLimit').withIndex('by_key', (q) => q.eq('key', key)).first();
    let count = 1;
    let resetAt = now + windowMs;
    if (row && row.resetAt > now) {
      count = row.count + 1;
      resetAt = row.resetAt;
      await ctx.db.patch(row._id, { count });
    } else if (row) {
      await ctx.db.patch(row._id, { count, resetAt });
    } else {
      await ctx.db.insert('rateLimit', { key, count, resetAt });
    }
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  },
});
