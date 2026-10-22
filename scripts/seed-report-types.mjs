// Makes sure the two core report types exist ("Жилийн төлөвлөгөө" type-1 and
// "Биелэлтийн тайлан" type-2, the slugs lib/nav.ts links to). Report types the
// Survey123 sync created on its own ("Төлөвлөгөө", "Тайлан", slug survey123-…)
// get their reports moved to the matching core type and are deactivated, so
// they no longer show in menus. Safe to run again.
//
//   npm run seed:report-types -- --dry-run
//   npm run seed:report-types
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const CORE_TYPES = [
  { slug: 'type-1', name: 'Жилийн төлөвлөгөө', surveyName: 'Төлөвлөгөө' },
  { slug: 'type-2', name: 'Биелэлтийн тайлан', surveyName: 'Тайлан' },
];

const dryRun = process.argv.includes('--dry-run');
const secret = process.env.CONVEX_SERVER_SECRET;
if (!process.env.CONVEX_URL || !secret) throw new Error('Set CONVEX_URL and CONVEX_SERVER_SECRET.');
const convex = new ConvexHttpClient(process.env.CONVEX_URL);
const read = (model, op, args) => convex.query(anyApi.data.read, { secret, model, op, args });
const write = (model, op, args) =>
  dryRun ? Promise.resolve({ id: '(dry run)' }) : convex.mutation(anyApi.data.write, { secret, model, op, args });

const types = await read('reportType', 'findMany', {});

for (const core of CORE_TYPES) {
  let target = types.find((type) => type.slug === core.slug || type.name === core.name);
  if (!target) {
    target = await write('reportType', 'create', { data: { name: core.name, slug: core.slug, isActive: true } });
    console.log(`${dryRun ? 'Would create' : 'Created'} report type "${core.name}" (${core.slug}).`);
  } else if (!target.isActive) {
    await write('reportType', 'update', { where: { id: target.id }, data: { isActive: true } });
    console.log(`${dryRun ? 'Would activate' : 'Activated'} report type "${target.name}".`);
  }

  const surveyTypes = types.filter((type) => type.slug.startsWith('survey123-') && type.name === core.surveyName);
  for (const surveyType of surveyTypes) {
    const { count } = await write('report', 'updateMany', {
      where: { reportTypeId: surveyType.id },
      data: { reportTypeId: target.id },
    }) ?? {};
    console.log(`${dryRun ? 'Would move' : 'Moved'} ${count ?? 'the'} reports from "${surveyType.name}" to "${core.name}".`);
    if (surveyType.isActive) {
      await write('reportType', 'update', { where: { id: surveyType.id }, data: { isActive: false } });
      console.log(`${dryRun ? 'Would deactivate' : 'Deactivated'} report type "${surveyType.name}" (${surveyType.slug}).`);
    }
  }
}
