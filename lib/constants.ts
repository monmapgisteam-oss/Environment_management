export const STATUS_LABELS: { [key: string]: string } = {
  draft: 'Ноорог',
  submitted: 'Илгээгдсэн',
  assigned: 'Гишүүдэд оноосон',
  in_review: 'Хянагдаж байна',
  return_requested: 'Буцаах хүсэлт илгээгдсэн',
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
  submitted: 'badge-blue',       // Илгээгдсэн — light blue
  assigned: 'badge-cyan',
  in_review: 'badge-orange',     // Хянагдаж байгаа — orange
  return_requested: 'badge-purple',
  needs_revision: 'badge-red',   // Засвар шаардсан — red
  completed: 'badge-green',      // Үнэлгээ дууссан — green/teal
  approved: 'badge-green',
  rejected: 'badge-red',
};

export const REPORT_TYPES = [
  { id: 'type-1', name: 'Жилийн төлөвлөгөө' },
  { id: 'type-2', name: 'Биелэлтийн тайлан' },
  { id: 'type-5', name: 'Нэмэлт мэдээ' },
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

// Pre-defined login accounts. Since the system has no public sign-up, each
// organisation exposes a fixed set of accounts that are picked with one click.
export type LoginAccount = {
  label: string;
  email: string;
  password: string;
};

export const SENDER_ACCOUNTS: LoginAccount[] = [
  { label: 'Илгээгч байгууллага', email: 'sender1@tailan.mn', password: 'Sender123!' },
];

// The review organisation shares one portal between the manager and the staff
// (evaluators); each account is routed to its own dashboard after login.
export const REVIEWER_ACCOUNTS: LoginAccount[] = [
  { label: 'Менежер', email: 'manager@tailan.mn', password: 'Manager123!' },
  { label: 'Ажилтан 1', email: 'staff@tailan.mn', password: 'Staff123!' },
  { label: 'Ажилтан 2', email: 'staff2@tailan.mn', password: 'Staff123!' },
  { label: 'Ажилтан 3', email: 'staff3@tailan.mn', password: 'Staff123!' },
];

export const ADMIN_ACCOUNTS: LoginAccount[] = [
  { label: 'Системийн админ', email: 'admin@tailan.mn', password: 'Admin123!' },
];

// The review organisation has exactly three evaluation staff. Other evaluator
// accounts may exist in the database (test/seed data), but only these three are
// shown for assignment.
export const STAFF_EMAILS = ['staff@tailan.mn', 'staff2@tailan.mn', 'staff3@tailan.mn'];

export const SENDER_ROLES = ['sender'];
export const REVIEWER_ROLES = ['review_manager', 'evaluator'];
export const ADMIN_ROLES = ['admin'];

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
