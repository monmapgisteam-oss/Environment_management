import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import CompaniesView, { type CompanyRow } from '@/components/admin/CompaniesView';
import PendingCompanies, { type PendingCompany } from '@/components/admin/PendingCompanies';
import { parseAttachments } from '@/lib/reports/attachments';
import { createSignedUrl } from '@/lib/db/storage';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchCompanyRows(): Promise<CompanyRow[]> {
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

// Self-registered companies the admin has to approve, with their contact and
// the conclusion they sent, so the register number can be checked.
async function fetchPendingCompanies(): Promise<PendingCompany[]> {
  const companies = await dataStore.company.findMany({
    where: { type: 'sender', approvalStatus: 'pending' },
    include: {
      users: { select: { name: true, email: true, phone: true, position: true }, orderBy: { createdAt: 'asc' } },
      reports: {
        where: { title: GENERAL_EVALUATION_CONCLUSION_TITLE },
        select: { id: true, projectName: true, conclusionNumber: true, fileUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(
    companies.map(async (company) => {
      const report = company.reports[0];
      const file = report ? parseAttachments(report.fileUrl)[0] : undefined;
      return {
        id: company.id,
        name: company.name,
        registerNumber: company.registerNumber,
        createdAt: new Date(company.createdAt).toISOString(),
        contact: company.users[0] ?? null,
        conclusion:
          report && file
            ? {
                reportId: report.id,
                projectName: report.projectName,
                conclusionNumber: report.conclusionNumber,
                fileName: file.name,
                fileUrl: await createSignedUrl(file.url),
              }
            : null,
      };
    }),
  );
}

export default async function AdminCompaniesPage() {
  const [rows, pending] = await Promise.all([fetchCompanyRows(), fetchPendingCompanies()]);

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Компаниуд" subtitle="Бүх байгууллага болон тэдгээрийн бөглөсөн судалгааны мэдээлэл" />

      <PendingCompanies companies={pending} />

      <CompaniesView companies={rows} />
    </main>
  );
}
