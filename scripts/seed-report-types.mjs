// Makes sure the two core report types exist ("Жилийн төлөвлөгөө" type-1 and
// "Биелэлтийн тайлан" type-2, the slugs lib/nav.ts links to). Report types the
// Survey123 sync created on its own ("Төлөвлөгөө", "Тайлан", slug survey123-…)
// get their reports moved to the matching core type and are deactivated, so
// they no longer show in menus. Safe to run again.
//
//   npm run seed:report-types -- --dry-run
//   npm run seed:report-types
import store from './data-store.cjs';

const CORE_TYPES = [
  { slug: 'type-1', name: 'Жилийн төлөвлөгөө', surveyName: 'Төлөвлөгөө' },
  { slug: 'type-2', name: 'Биелэлтийн тайлан', surveyName: 'Тайлан' },
];

const dryRun = process.argv.includes('--dry-run');
const read = (model, op, args) => store.read(model, op, args);
const write = (model, op, args) =>
  dryRun ? Promise.resolve({ id: '(dry run)' }) : store.write(model, op, args);

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
