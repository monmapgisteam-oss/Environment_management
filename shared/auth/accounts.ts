import { MIN_PASSWORD_LENGTH, weakPasswordError } from '@shared/auth/signup';

// Accounts the admin creates for the review organisation, and the rules for
// deactivating them and for the first-login password change.

// Older accounts have no isActive value and count as active. Filters follow
// SQL null rules, so `{ isActive: { not: false } }` would drop them.
export const ACTIVE_USER_WHERE = { OR: [{ isActive: null }, { isActive: true }] };

export function isActiveUser(user: { isActive?: boolean | null }) {
  return user.isActive !== false;
}

// A self-registered sender company can be used only once the admin approved
// it; older companies have no status and count as approved.
export function isCompanyApproved(company: { approvalStatus?: string | null } | null | undefined) {
  return !company?.approvalStatus || company.approvalStatus === 'approved';
}

// Roles the admin can create accounts for.
export const STAFF_ACCOUNT_ROLES = ['evaluator', 'review_manager'] as const;
export type StaffAccountRole = (typeof STAFF_ACCOUNT_ROLES)[number];

export type StaffAccountInput = {
  name: string;
  email: string;
  password: string;
  role: StaffAccountRole;
  position: string | null;
  phone: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function passwordError(password: unknown, email?: string): string | null {
  if (typeof password !== 'string') return `Нууц үг ${MIN_PASSWORD_LENGTH}-аас доошгүй тэмдэгттэй байна.`;
  return weakPasswordError(password, email);
}

export function parseStaffAccount(data: Record<string, unknown>): { input: StaffAccountInput } | { error: string } {
  const name = text(data.name);
  if (name.length < 2) return { error: 'Овог, нэрээ оруулна уу.' };
  const email = text(data.email, 128).toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Имэйл хаяг буруу байна.' };
  const role = STAFF_ACCOUNT_ROLES.find((candidate) => candidate === data.role);
  if (!role) return { error: 'Эрхийн төрлөө сонгоно уу.' };
  const error = passwordError(data.password, typeof data.email === 'string' ? data.email : undefined);
  if (error) return { error };
  return {
    input: {
      name,
      email,
      password: data.password as string,
      role,
      position: text(data.position, 100) || null,
      phone: text(data.phone, 40) || null,
    },
  };
}

// The new password chosen at first login (or on a later change).
export function parseNewPassword(data: Record<string, unknown>, email?: string): { password: string } | { error: string } {
  const error = passwordError(data.newPassword, email);
  if (error) return { error };
  if (data.newPassword !== data.confirmPassword) return { error: 'Шинэ нууц үг давтан оруулсантай таарахгүй байна.' };
  return { password: data.newPassword as string };
}
