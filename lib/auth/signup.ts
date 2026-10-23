import { CONCLUSION_DISTRICTS, CONCLUSION_PROJECT_CATEGORIES, CONCLUSION_TYPES } from '@/lib/reports/conclusions';

// Validation for the sender company sign-up form, shared by the API route and
// its tests. Returns the cleaned fields or the first error to show.

export type SignupInput = {
  companyName: string;
  registerNumber: string;
  companyPhone: string | null;
  contactName: string;
  position: string | null;
  phone: string | null;
  email: string;
  password: string;
};

// Mongolian legal entities carry a 7-digit state register number.
const REGISTER = /^\d{7}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

function text(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optional(value: unknown, max = 100) {
  const cleaned = text(value, max);
  return cleaned ? cleaned : null;
}

export function parseSignup(data: Record<string, unknown>): { input: SignupInput } | { error: string } {
  const companyName = text(data.companyName, 300);
  if (companyName.length < 2) return { error: 'Байгууллагын нэрээ оруулна уу.' };
  const registerNumber = text(data.registerNumber, 20);
  if (!REGISTER.test(registerNumber)) return { error: 'Регистрийн дугаар 7 оронтой тоо байна.' };
  const contactName = text(data.contactName);
  if (contactName.length < 2) return { error: 'Хариуцсан ажилтны нэрээ оруулна уу.' };
  const email = text(data.email, 128).toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Имэйл хаяг буруу байна.' };
  const password = typeof data.password === 'string' ? data.password : '';
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Нууц үг ${MIN_PASSWORD_LENGTH}-аас доошгүй тэмдэгттэй байна.` };
  if (password.length > 200) return { error: 'Нууц үг хэт урт байна.' };
  if (data.passwordConfirm !== undefined && data.passwordConfirm !== password) {
    return { error: 'Нууц үг давтан оруулсантай таарахгүй байна.' };
  }
  return {
    input: {
      companyName,
      registerNumber,
      companyPhone: optional(data.companyPhone, 40),
      contactName,
      position: optional(data.position),
      phone: optional(data.phone, 40),
      email,
      password,
    },
  };
}

// Second step of sign-up: the company's general evaluation conclusion
// (Ерөнхий үнэлгээний дүгнэлт). Every field is required so the review
// organisation can filter conclusions by it.
export type ConclusionInput = {
  year: number;
  conclusionNumber: string;
  projectCategory: string;
  projectName: string;
  district: string;
  implementerName: string;
  conclusionType: string;
};

export const CONCLUSION_MAX_FILE_BYTES = 25 * 1024 * 1024;
const FIRST_CONCLUSION_YEAR = 1990;

export function parseConclusion(data: Record<string, unknown>, now = new Date()): { input: ConclusionInput } | { error: string } {
  const yearText = text(data.conclusionYear, 4);
  const year = Number(yearText);
  if (!/^\d{4}$/.test(yearText) || year < FIRST_CONCLUSION_YEAR || year > now.getFullYear()) {
    return { error: `Дүгнэлт гаргасан оныг ${FIRST_CONCLUSION_YEAR}-${now.getFullYear()} хооронд оруулна уу.` };
  }
  const conclusionNumber = text(data.conclusionNumber, 100);
  if (!conclusionNumber) return { error: 'Дүгнэлтийн дугаараа оруулна уу.' };
  const projectCategory = text(data.projectCategory, 100);
  if (!CONCLUSION_PROJECT_CATEGORIES.includes(projectCategory)) return { error: 'Төслийн ангиллаа сонгоно уу.' };
  const projectName = text(data.projectName, 300);
  if (projectName.length < 2) return { error: 'Төслийн нэрээ оруулна уу.' };
  const district = text(data.district, 100);
  if (!CONCLUSION_DISTRICTS.includes(district)) return { error: 'Төсөл хэрэгжих байршлаа сонгоно уу.' };
  const implementerName = text(data.implementerName, 300);
  if (implementerName.length < 2) return { error: 'Төсөл хэрэгжүүлэгчийн нэрээ оруулна уу.' };
  const conclusionType = text(data.conclusionType, 200);
  if (!CONCLUSION_TYPES.includes(conclusionType)) return { error: 'Дүгнэлтийн төрлөө сонгоно уу.' };
  return { input: { year, conclusionNumber, projectCategory, projectName, district, implementerName, conclusionType } };
}

// The conclusion is uploaded as one PDF.
export function conclusionFileError(file: { name: string; type: string; size: number } | null): string | null {
  if (!file || file.size === 0) return 'Ерөнхий үнэлгээний дүгнэлтийн PDF файлаа хавсаргана уу.';
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return 'Дүгнэлтийг PDF файлаар хавсаргана уу.';
  if (file.size > CONCLUSION_MAX_FILE_BYTES) return 'Файлын хэмжээ 25MB-аас ихгүй байна.';
  return null;
}
