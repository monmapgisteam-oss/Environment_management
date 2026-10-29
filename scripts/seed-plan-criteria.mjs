// Creates the plan scoring sheet (Жилийн төлөвлөгөө / БОМТ) of every report
// category from its performance sheet: the same components and points, named
// as plans ("…төлөвлөгөөний биелэлт" → "…төлөвлөгөө"). The admin can adjust
// them under "Үнэлгээний шалгуур". Safe to run again: a category that already
// has a plan sheet is left alone.
//
//   npm run seed:plan-criteria -- --dry-run
//   npm run seed:plan-criteria
import store from './data-store.cjs';

const CATEGORIES = ['Уул уурхай, газрын тос', 'Дэд бүтэц, барилга, ШТС', 'Аялал жуулчлал, үйлчилгээ', 'Үйлдвэрлэл'];

export function planName(name) {
  return name
    .replace(/төлөвлөгөөний биелэлт/g, 'төлөвлөгөө')
    .replace(/хөтөлбөрийн биелэлт/g, 'хөтөлбөр')
    .replace(/арга хэмжээний биелэлт/g, 'арга хэмжээний төлөвлөгөө')
    .replace(/\s+биелэлт\b/g, '');
}

const dryRun = process.argv.includes('--dry-run');
const read = (op, args) => store.read('evaluationCriterion', op, args);
const write = (op, args) =>
  dryRun ? Promise.resolve() : store.write('evaluationCriterion', op, args);

for (const category of CATEGORIES) {
  const rows = await read('findMany', { where: { category }, orderBy: { sortOrder: 'asc' } });
  if (rows.some((row) => row.sheet === 'plan')) {
    console.log(`"${category}" already has a plan sheet, skipped.`);
    continue;
  }
  const performance = rows.filter((row) => row.sheet !== 'plan' && row.isActive);
  for (const row of performance) {
    const name = planName(row.name);
    await write('create', { data: { name, category, sheet: 'plan', maxScore: row.maxScore, sortOrder: row.sortOrder, isActive: true } });
    console.log(`${dryRun ? 'Would create' : 'Created'} [${category}] ${row.maxScore} · ${name}`);
  }
}
