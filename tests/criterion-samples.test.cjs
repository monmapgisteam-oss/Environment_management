const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sampleForCriterion, scoringSheetSample, SAMPLE_PDF_URL } = require('../lib/reports/samples.ts');
const { REPORT_CATEGORIES, EVALUATION_CRITERIA } = require('../lib/constants.ts');

// The sheets the seed script creates (scripts/seed-category-criteria.mjs).
const SEEDED = {
  'Уул уурхай, газрын тос': [
    'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт',
    'Нөхөн сэргээлтийн төлөвлөгөөний биелэлт /техникийн нөхөн сэргээлт, биологийн нөхөн сэргээлт, татан буулгах, хаалтад бэлтгэх/',
    'Биологийн олон янз байдлыг дүйцүүлэн хамгаалах арга хэмжээний төлөвлөгөөний биелэлт',
    'Нүүлгэн шилжүүлэх, нөхөн олговор олгох арга хэмжээний биелэлт',
    'Түүх, соёлын өвийг хамгаалах арга хэмжээний биелэлт',
    'Осол, эрсдэлийн менежментийн төлөвлөгөөний биелэлт',
    'Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт',
    'Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт',
    'Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт',
    'Аймаг, сумын орон нутгийн төрийн захиргааны байгууллагын шаардлагаар хийсэн ажил болон нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт',
  ],
  'Дэд бүтэц, барилга, ШТС': [
    'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт',
    'Орчны тохижилт, нөхөн сэргээлтийн төлөвлөгөөний биелэлт',
    'Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөөний биелэлт',
    'Осол, эрсдэлийн менежментийн төлөвлөгөөний биелэлт',
    'Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт',
    'Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт',
    'Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт',
    'Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт',
  ],
  'Аялал жуулчлал, үйлчилгээ': [
    'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт',
    'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөөний биелэлт',
    'Түүх, соёлын өвийг хамгаалах арга хэмжээний биелэлт',
    'Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт',
    'Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт',
    'Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт',
    'Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт',
  ],
  Үйлдвэрлэл: EVALUATION_CRITERIA.map((c) => c.name),
};

test('every seeded criterion of every category has its own table file cut from the PDF', () => {
  for (const category of REPORT_CATEGORIES) {
    for (const name of SEEDED[category]) {
      const sample = sampleForCriterion(category, name);
      assert.ok(sample, `${category}: ${name}`);
      assert.match(sample.href, /^\/samples\/[a-z]+\/[a-z-]+\.pdf$/);
      assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', sample.href)), `${sample.href} is missing`);
      assert.ok(sample.page >= 3 && sample.page <= 9, `${name} -> page ${sample.page}`);
      assert.match(sample.download, /^Загвар - .+\.pdf$/);
    }
    assert.match(scoringSheetSample(category).href, new RegExp(`^${SAMPLE_PDF_URL}#page=\\d+$`));
  }
});

test('unknown subjects and categories have no sample', () => {
  assert.equal(sampleForCriterion('Үйлдвэрлэл', 'Шинэ шалгуур'), null);
  assert.equal(sampleForCriterion(null, 'Хог, хаягдлын менежмент'), null);
  assert.equal(scoringSheetSample('Газрын тос'), null);
});
