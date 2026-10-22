import dataStore from '@/lib/db';

type CompanyIdentity = {
  id: string;
  name: string;
  registerNumber: string;
};

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
    select: { id: true, name: true, registerNumber: true },
  });

  return companies.find((company) => normalizeRegister(company.registerNumber) === normalized) || null;
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
    select: { id: true, name: true, registerNumber: true },
  });
  const companyByRegister = new Map(
    companies.map((company) => [normalizeRegister(company.registerNumber), company]),
  );

  return reports.map((report) => {
    const company = companyByRegister.get(normalizeRegister(report.implementerRegister));
    if (!company) return report;
    return {
      ...report,
      senderCompany: report.senderCompany ? { ...report.senderCompany, ...company } : company,
    } as T;
  });
}
