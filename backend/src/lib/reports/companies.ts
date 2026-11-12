import dataStore from '@/lib/db';

type CompanyIdentity = {
  id: string;
  name: string;
  registerNumber: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | null;
};

// When several companies share a register number (a rejected sign-up, then the
// real company), the approved one wins, then a pending one; a rejected company
// never takes the register from another.
const STATUS_RANK = { approved: 0, pending: 1, rejected: 2 } as const;
const rank = (company: CompanyIdentity) => STATUS_RANK[company.approvalStatus ?? 'approved'];

function companiesByRegister(companies: CompanyIdentity[]) {
  const result = new Map<string, CompanyIdentity>();
  for (const company of companies) {
    const key = normalizeRegister(company.registerNumber);
    const current = result.get(key);
    if (!current || rank(company) < rank(current)) result.set(key, company);
  }
  return result;
}

type ReportWithCompany = {
  senderCompany: object | null;
  implementerRegister?: string | null;
};

export function normalizeRegister(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

export async function findSenderCompanyByRegister(register: unknown): Promise<CompanyIdentity | null> {
  const normalized = normalizeRegister(register);
  if (!normalized) return null;

  const companies = await dataStore.company.findMany({
    where: { type: 'sender' },
    select: { id: true, name: true, registerNumber: true, approvalStatus: true },
  });

  return companiesByRegister(companies).get(normalized) ?? null;
}

export async function attachEffectiveSenderCompanies<T extends ReportWithCompany>(
  reports: T[],
): Promise<T[]> {
  const registers = Array.from(
    new Set(reports.map((report) => normalizeRegister(report.implementerRegister)).filter(Boolean)),
  );
  if (registers.length === 0) return reports;

  const companies = await dataStore.company.findMany({
    where: { type: 'sender' },
    select: { id: true, name: true, registerNumber: true, approvalStatus: true },
  });
  const companyByRegister = companiesByRegister(companies);

  return reports.map((report) => {
    const found = companyByRegister.get(normalizeRegister(report.implementerRegister));
    if (!found) return report;
    const { approvalStatus: _status, ...company } = found;
    return {
      ...report,
      senderCompany: report.senderCompany ? { ...report.senderCompany, ...company } : company,
    } as T;
  });
}

// Users to notify for a report's sender: the company the report is stored
// under and, for imported reports, the company its implementer register
// resolves to. Empty when that company has no accounts yet.
export async function senderRecipientIds(report: { senderCompanyId: string; implementerRegister?: string | null }) {
  const effective = await findSenderCompanyByRegister(report.implementerRegister);
  const companyIds = [...new Set([report.senderCompanyId, effective?.id].filter((id): id is string => !!id))];
  const users = await dataStore.user.findMany({ where: { companyId: { in: companyIds }, role: 'sender' }, select: { id: true } });
  return users.map((user) => user.id);
}

export const NO_SENDER_ACCOUNT_WARNING =
  'Илгээгч байгууллагад бүртгэлтэй хэрэглэгч алга тул мэдэгдэл очсонгүй. Байгууллагатай шууд холбогдоно уу.';
