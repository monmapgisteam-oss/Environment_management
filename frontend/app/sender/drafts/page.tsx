import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import ReportTable from '@/components/reports/ReportTable';
import { loadView } from '@/lib/api/server';
import { requireUser } from '@/lib/auth';

export default async function DraftsPage() {
  await requireUser('sender');
  // Drafts are private to the company that is writing them.
  const { reports } = await loadView('sender/drafts');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Ноорог" subtitle="Хадгалсан ноорог БОМТ, тайлангууд. «Үргэлжлүүлэх» дарж бөглөж дуусгаад илгээнэ." />

      {reports.length === 0 ? (
        <EmptyState title="Ноорог хадгалаагүй байна." hint="БОМТ бөглөж эхлээд «Ноорог хадгалах» товчийг дарвал энд хадгалагдана." action={{ label: "БОМТ илгээх", href: "/sender/submit?type=plan" }} />
      ) : (
        <ReportTable
          emptyHint="Илгээх маягт дээр «Ноорог хадгалах» дарсан тайлан энд хадгалагдана."
          role="sender"
          reports={reports}
        />
      )}
    </main>
  );
}
