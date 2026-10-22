// Clears the numeric signature PIN that older versions stored in plaintext on
// signed evaluations (evaluation.signature). Verification uses the hashed PIN
// on the user (signaturePinHash), so nothing reads this field any more.
// Safe to run again.
//
//   npm run fix:signatures -- --dry-run
//   npm run fix:signatures
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const dryRun = process.argv.includes('--dry-run');
const secret = process.env.CONVEX_SERVER_SECRET;
if (!process.env.CONVEX_URL || !secret) throw new Error('Set CONVEX_URL and CONVEX_SERVER_SECRET.');
const convex = new ConvexHttpClient(process.env.CONVEX_URL);

const rows = await convex.query(anyApi.data.read, {
  secret,
  model: 'evaluation',
  op: 'findMany',
  args: { where: { signature: { not: null } }, select: { id: true } },
});
if (!dryRun && rows.length > 0) {
  await convex.mutation(anyApi.data.write, {
    secret,
    model: 'evaluation',
    op: 'updateMany',
    args: { where: { signature: { not: null } }, data: { signature: null } },
  });
}
console.log(`${rows.length} evaluations ${dryRun ? 'hold a plaintext PIN' : 'scrubbed'}.`);
