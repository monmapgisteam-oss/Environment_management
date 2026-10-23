import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';
const c = new ConvexHttpClient(process.env.CONVEX_URL);
const u = await c.query(anyApi.data.read, { secret: process.env.CONVEX_SERVER_SECRET, model: 'user', op: 'findFirst', args: { where: { email: 'staff2@tailan.mn' } } });
console.log(u.id);
