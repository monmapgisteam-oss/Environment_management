// Fills the province and district of saved report locations that were stored
// as "Тодорхойгүй" although the point has coordinates, using the same reverse
// geocoding as the submit routes. Safe to run again: rows that already have
// both names are left alone.
//
//   npm run fix:locations -- --dry-run
//   npm run fix:locations
const { ConvexHttpClient } = require('convex/browser');
const { anyApi } = require('convex/server');
const { resolveAdministrativeLocation } = require('../lib/map/locationResolver.ts');

const UNKNOWN = 'Тодорхойгүй';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const secret = process.env.CONVEX_SERVER_SECRET;
  if (!process.env.CONVEX_URL || !secret) throw new Error('Set CONVEX_URL and CONVEX_SERVER_SECRET.');
  const convex = new ConvexHttpClient(process.env.CONVEX_URL);
  const read = (model, op, args) => convex.query(anyApi.data.read, { secret, model, op, args });
  const write = (model, op, args) =>
    dryRun ? Promise.resolve() : convex.mutation(anyApi.data.write, { secret, model, op, args });

  const rows = await read('reportLocation', 'findMany', {});
  let fixed = 0;
  for (const row of rows) {
    const missing = !row.province || row.province === UNKNOWN || !row.district || row.district === UNKNOWN;
    if (!missing || row.latitude == null || row.longitude == null) continue;
    const place = await resolveAdministrativeLocation(row.latitude, row.longitude, row);
    const data = {
      province: place.province || row.province || UNKNOWN,
      district: place.district || row.district || UNKNOWN,
    };
    if (data.province === row.province && data.district === row.district) {
      console.log(`${row.reportId}: no address found for ${row.latitude},${row.longitude}.`);
      continue;
    }
    await write('reportLocation', 'update', { where: { id: row.id }, data });
    fixed++;
    console.log(`${dryRun ? 'Would set' : 'Set'} ${row.reportId}: ${data.province} / ${data.district}`);
  }
  console.log(`${rows.length} locations checked, ${fixed} ${dryRun ? 'to fix' : 'fixed'}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
