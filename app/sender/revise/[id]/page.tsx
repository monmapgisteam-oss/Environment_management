import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import RevisionForm from '@/components/reports/revision/RevisionForm';
import dataStore from '@/lib/db';
import { canAccessReport, requireUser } from '@/lib/auth';
import { parseAttachments } from '@/lib/reports/attachments';
import { documentRows } from '@/lib/reports/materials';
import { filesOfSection, parseRevisionItems } from '@/lib/reports/revisions';
import { signSections } from '@/lib/reports/reportSections';
import { formWordForReportType } from '@/lib/reports/terms';

// Fix a returned report: the reviewer's comments on the criteria that fell
// short, then the corrected report and Хавсралт to send again.
export default async function ReviseReportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser('sender');
  const report = await dataStore.report.findUnique({ where: { id }, include: { reportType: true } });

  if (!report || !(await canAccessReport(user, report))) {
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

  const attachments = parseAttachments(report.fileUrl);
  const documents = await signSections(
    documentRows(report.reportType).map((row) => {
      const key = `material:${row.id}`;
      return { key, label: row.label, group: 'Бичиг баримт', files: filesOfSection(attachments, key) };
    }),
  );

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
