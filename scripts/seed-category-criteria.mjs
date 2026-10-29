// Creates the scoring sheet of every report category (Журмын 4 дүгээр
// хавсралт) in the evaluationCriterion table. Criteria without a category are
// the original sheet "г" and are tagged "Үйлдвэрлэл". Safe to run again: a
// category that already has criteria is left alone.
//
//   npm run seed:criteria -- --dry-run
//   npm run seed:criteria
import store from './data-store.cjs';

const SHEETS = {
  // б. Уул уурхайн олборлолт, газрын тос ... хайгуулын төсөл
  'Уул уурхай, газрын тос': [
    ['Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт', 20],
    ['Нөхөн сэргээлтийн төлөвлөгөөний биелэлт /техникийн нөхөн сэргээлт, биологийн нөхөн сэргээлт, татан буулгах, хаалтад бэлтгэх/', 30],
    ['Биологийн олон янз байдлыг дүйцүүлэн хамгаалах арга хэмжээний төлөвлөгөөний биелэлт', 10],
    ['Нүүлгэн шилжүүлэх, нөхөн олговор олгох арга хэмжээний биелэлт', 5],
    ['Түүх, соёлын өвийг хамгаалах арга хэмжээний биелэлт', 5],
    ['Осол, эрсдэлийн менежментийн төлөвлөгөөний биелэлт', 10],
    ['Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт', 5],
    ['Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт', 5],
    ['Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт', 5],
    ['Аймаг, сумын орон нутгийн төрийн захиргааны байгууллагын шаардлагаар хийсэн ажил болон нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт', 5],
  ],
  // д. Дэд бүтцийн төсөл
  'Дэд бүтэц, барилга, ШТС': [
    ['Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт', 20],
    ['Орчны тохижилт, нөхөн сэргээлтийн төлөвлөгөөний биелэлт', 30],
    ['Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөөний биелэлт', 5],
    ['Осол, эрсдэлийн менежментийн төлөвлөгөөний биелэлт', 15],
    ['Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт', 10],
    ['Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт', 10],
    ['Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт', 5],
    ['Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт', 5],
  ],
  // в. Аялал жуулчлал, үйлчилгээний төсөл
  'Аялал жуулчлал, үйлчилгээ': [
    ['Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт', 20],
    ['Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөөний биелэлт', 20],
    ['Түүх, соёлын өвийг хамгаалах арга хэмжээний биелэлт', 5],
    ['Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт', 25],
    ['Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт', 20],
    ['Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт', 5],
    ['Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт', 5],
  ],
};
// г. Хөдөө аж ахуй, үйлдвэрлэлийн төсөл: the criteria already in the table.
const UNTAGGED_CATEGORY = 'Үйлдвэрлэл';

const dryRun = process.argv.includes('--dry-run');
const read = (op, args) => store.read('evaluationCriterion', op, args);
const write = (op, args) =>
  dryRun ? Promise.resolve() : store.write('evaluationCriterion', op, args);

for (const [category, rows] of Object.entries(SHEETS)) {
  const total = rows.reduce((sum, [, maxScore]) => sum + maxScore, 0);
  if (total !== 100) throw new Error(`${category} adds up to ${total}, not 100.`);
}

const existing = await read('findMany', { orderBy: { sortOrder: 'asc' } });
const untagged = existing.filter((c) => !c.category);
for (const criterion of untagged) {
  await write('update', { where: { id: criterion.id }, data: { category: UNTAGGED_CATEGORY } });
}
console.log(`${dryRun ? 'Would tag' : 'Tagged'} ${untagged.length} criteria as "${UNTAGGED_CATEGORY}".`);

for (const [category, rows] of Object.entries(SHEETS)) {
  if (existing.some((c) => c.category === category)) {
    console.log(`"${category}" already has criteria, skipped.`);
    continue;
  }
  for (const [index, [name, maxScore]] of rows.entries()) {
    await write('create', { data: { name, category, maxScore, sortOrder: index + 1 } });
  }
  console.log(`${dryRun ? 'Would create' : 'Created'} ${rows.length} criteria for "${category}".`);
}
