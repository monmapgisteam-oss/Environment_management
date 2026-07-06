import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompaniesView, { type CompanyRow } from '@/components/CompaniesView';
import { adminNavItems } from '@/lib/adminNav';
import { attachEffectiveSenderCompanies, normalizeRegister } from '@/lib/reportCompanies';
import { fetchSurveyReports } from '@/lib/surveyReports';

async function fetchCompanyRows(): Promise<CompanyRow[]> {
  const [companies, rawReports, surveyReports] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        users: {
          select: { name: true, email: true, phone: true, position: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.report.findMany({
      where: { status: { not: 'draft' } },
      include: { senderCompany: true, reportType: true, location: true },
      orderBy: { submittedAt: 'desc' },
    }),
    fetchSurveyReports(),
  ]);
  const reports = await attachEffectiveSenderCompanies(rawReports);

  return companies.map((company: any) => {
    const companyRegister = normalizeRegister(company.registerNumber);
    const webSurveys = reports
      .filter((r: any) => r.senderCompany?.id === company.id)
      .map((r: any) => ({
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
    const existingReportNumbers = new Set(webSurveys.map((survey) => survey.reportNumber));
    const externalSurveys = surveyReports
      .filter((survey) => normalizeRegister(survey.register) === companyRegister)
      .filter((survey) => !existingReportNumbers.has(survey.reportNumber))
      .map((survey) => ({
        id: survey.id,
        reportNumber: survey.reportNumber,
        reportTypeName: survey.reportType.name,
        title: survey.title,
        implementerName: survey.organization,
        implementerRegister: survey.register,
        approvedDate: survey.projectDate ? new Date(survey.projectDate).toISOString() : null,
        submittedAt: survey.submittedAt,
        status: survey.status,
        finalScore: survey.finalScore,
        location: null,
      }));

    return {
      id: company.id,
      name: company.name,
      registerNumber: company.registerNumber,
      type: company.type,
      contacts: company.users.map((u: any) => ({
        name: u.name,
        email: u.email,
        phone: u.phone,
        position: u.position,
      })),
      surveys: [...webSurveys, ...externalSurveys].sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime(),
      ),
    };
  });
}

export default async function AdminCompaniesPage() {
  const rows = await fetchCompanyRows();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={adminNavItems('companies')} role="admin" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Систем админ" companyName="Системийн удирдлага" role="admin" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Компаниуд</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Бүх байгууллага болон тэдгээрийн бөглөсөн судалгааны мэдээлэл
            </p>
          </div>

          <CompaniesView companies={rows} />
        </main>
      </div>
    </div>
  );
}
