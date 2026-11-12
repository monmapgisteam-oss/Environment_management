// Clears the numeric signature PIN that older versions stored in plaintext on
// signed evaluations (evaluation.signature). Verification uses the hashed PIN
// on the user (signaturePinHash), so nothing reads this field any more.
// Safe to run again.
//
//   npm run fix:signatures -- --dry-run
//   npm run fix:signatures
import store from './data-store.cjs';

const dryRun = process.argv.includes('--dry-run');

const rows = await store.read('evaluation', 'findMany', { where: { signature: { not: null } }, select: { id: true } });
if (!dryRun && rows.length > 0) {
  await store.write('evaluation', 'updateMany', { where: { signature: { not: null } }, data: { signature: null } });
}
console.log(`${rows.length} evaluations ${dryRun ? 'hold a plaintext PIN' : 'scrubbed'}.`);
