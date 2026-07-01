import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompaniesView, { type CompanyRow } from '@/components/CompaniesView';
import { adminNavItems } from '@/lib/adminNav';

async function fetchCompanies() {
  return prisma.company.findMany({
    orderBy: { name: 'asc' },
    include: {
      users: {
        select: { name: true, email: true, phone: true, position: true },
        orderBy: { createdAt: 'asc' },
      },
      reports: {
        // Drafts are unsubmitted surveys; only surface reports the company
        // has actually filled and sent.
        where: { status: { not: 'draft' } },
        include: { reportType: true, location: true },
        orderBy: { submittedAt: 'desc' },
      },
    },
  });
}

export default async function AdminCompaniesPage() {
  const companies = await fetchCompanies();

  const rows: CompanyRow[] = companies.map((company: any) => ({
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
    surveys: company.reports.map((r: any) => ({
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
    })),
  }));

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
