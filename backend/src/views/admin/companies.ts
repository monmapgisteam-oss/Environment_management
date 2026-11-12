import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { fetchPendingCompanies } from '@/lib/reports/pendingCompanies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import type { AdminCompanyRow } from '@shared/views/admin';
import { defineView } from '../define';

async function fetchCompanyRows(): Promise<AdminCompanyRow[]> {
  const [companies, rawReports] = await Promise.all([
    dataStore.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        users: {
          select: { name: true, email: true, phone: true, position: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    dataStore.report.findMany({
      where: { status: { not: 'draft' }, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
      include: { senderCompany: true, reportType: true, location: true },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);
  const reports = await attachEffectiveSenderCompanies(rawReports);

  return companies.map((company) => {
    const companyReports = reports
      .filter((r) => r.senderCompany?.id === company.id)
      .map((r) => ({
        id: r.id,
        reportNumber: r.reportNumber,
        reportTypeName: r.reportType?.name ?? '—',
        title: r.title,
        implementerName: r.implementerName,
        implementerRegister: r.implementerRegister,
        approvedDate: r.approvedDate ? r.approvedDate.toISOString() : null,
        submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
        status: r.status,
        finalScore: r.finalScore,
        location: r.location ? { addressDetail: r.location.addressDetail } : null,
      }));
    return {
      id: company.id,
      name: company.name,
      registerNumber: company.registerNumber,
      type: company.type,
      contacts: company.users.map((u) => ({
        name: u.name,
        email: u.email,
        phone: u.phone,
        position: u.position,
      })),
      reports: companyReports.sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime(),
      ),
    };
  });
}

export default defineView({
  name: 'admin/companies',
  roles: ['admin'],
  async load() {
    const [rows, pending] = await Promise.all([fetchCompanyRows(), fetchPendingCompanies()]);
    return { rows, pending };
  },
});
