export const STATUS_LABELS: { [key: string]: string } = {
  draft: 'Ноорог',
  submitted: 'Илгээгдсэн',
  assigned: 'Гишүүдэд оноосон',
  in_review: 'Хянагдаж байна',
  needs_revision: 'Засвар шаардсан',
  completed: 'Үнэлгээ дууссан',
  approved: 'Батлагдсан',
  rejected: 'Татгалзсан',
};

export const ASSIGNMENT_STATUS_LABELS: { [key: string]: string } = {
  pending: 'Үнэлгээ өгөөгүй',
  submitted: 'Үнэлгээ өгсөн',
};

export const STATUS_BADGE_COLORS: { [key: string]: string } = {
  draft: 'badge-gray',
  submitted: 'badge-blue',
  assigned: 'badge-cyan',
  in_review: 'badge-yellow',
  needs_revision: 'badge-orange',
  completed: 'badge-green',
  approved: 'badge-green',
  rejected: 'badge-red',
};

export const REPORT_TYPES = [
  { id: 'type-1', name: 'Жилийн төлөвлөгөө' },
  { id: 'type-2', name: 'Биелэлтийн тайлан' },
  { id: 'type-3', name: 'Дүгнэх хуудас' },
  { id: 'type-4', name: 'Хяналтын хуудас' },
  { id: 'type-5', name: 'Нэмэлт мэдээ' },
  { id: 'type-6', name: 'Аймаг, нийслэлийн санал' },
];

export const PROVINCES = [
  'Улаанбаатар',
  'Дархан-Уул',
  'Сэлэнгэ',
  'Хэнтий',
  'Орхон',
  'Баян-Өлгий',
  'Ховд',
  'Архангай',
];

export const EVALUATION_CRITERIA = [
  { id: 1, name: 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт', maxScore: 20 },
  { id: 2, name: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөөний биелэлт', maxScore: 15 },
  { id: 3, name: 'Түүх, соёлын өвийг хамгаалах арга хэмжээний биелэлт', maxScore: 5 },
  { id: 4, name: 'Осол, эрсдэлийн менежментийн төлөвлөгөөний биелэлт', maxScore: 20 },
  { id: 5, name: 'Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт', maxScore: 20 },
  { id: 6, name: 'Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт', maxScore: 10 },
  { id: 7, name: 'Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт', maxScore: 5 },
  { id: 8, name: 'Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт', maxScore: 5 },
];
