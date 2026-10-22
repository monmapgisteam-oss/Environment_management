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
