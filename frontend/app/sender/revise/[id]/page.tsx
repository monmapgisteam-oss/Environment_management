import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import RevisionForm from '@/components/reports/revision/RevisionForm';
import { loadView } from '@/lib/api/server';
import { requireUser } from '@/lib/auth';
import { parseRevisionItems } from '@shared/reports/revisions';
import { formWordForReportType } from '@shared/reports/terms';

// Fix a returned report: the reviewer's comments on the criteria that fell
// short, then the corrected report and Хавсралт to send again.
export default async function ReviseReportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requireUser('sender');
  // No report when it is missing or not the sender's company's; the documents
  // (with short-lived links) only while it waits for corrections.
  const { report, documents } = await loadView('sender/revise/:id', { params: { id } });

  if (!report) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  const word = formWordForReportType(report.reportType);
  if (report.status !== 'needs_revision') {
    return (
      <main className="flex-1 min-w-0 px-6 py-7 lg:px-8">
        <div className="mx-auto max-w-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Засвар шаардаагүй байна.</p>
          <div className="mt-4 flex justify-center">
            <Link href={`/report/${report.id}?role=sender`} className="border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Буцах
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        eyebrow={report.reportNumber}
        title={`${word.capital} засах`}
        subtitle={`${report.title} · ${report.reportType.name}. Тайлбарын дагуу засаад ${word.capital.toLowerCase()}, хавсралтаа дахин илгээнэ үү.`}
      />
      <RevisionForm reportId={report.id} reason={report.returnReason} items={parseRevisionItems(report.revisionItems)} documents={documents} />
    </main>
  );
}
