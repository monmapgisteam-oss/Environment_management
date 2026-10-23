import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import RevisionForm from '@/components/reports/revision/RevisionForm';
import dataStore from '@/lib/db';
import { canAccessReport, requireUser } from '@/lib/auth';
import { parseRevisionItems } from '@/lib/reports/revisions';
import { loadReportSections, signSections } from '@/lib/reports/reportSections';

// Fix a returned report section by section: only the upload sections the
// reviewer flagged are shown, each with its comment and current files.
export default async function ReviseReportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser('sender');
  const report = await dataStore.report.findUnique({ where: { id }, include: { reportType: true } });

  if (!report || !(await canAccessReport(user, report))) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  const items = parseRevisionItems(report.revisionItems);
  if (report.status !== 'needs_revision' || items.length === 0) {
    return (
      <main className="flex-1 min-w-0 px-6 py-7 lg:px-8">
        <div className="mx-auto max-w-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">
            {report.status === 'needs_revision'
              ? 'Засах хэсэг заагаагүй тул тайланг бүтэн маягтаар засна уу.'
              : 'Энэ тайлан засвар шаардаагүй байна.'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {report.status === 'needs_revision' && (
              <Link href={`/sender/submit?edit=${report.id}`} className="bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                Маягтаар засах
              </Link>
            )}
            <Link href={`/report/${report.id}?role=sender`} className="border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Тайлан руу буцах
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const sections = await signSections(await loadReportSections(report));
  const flagged = items.flatMap((item) => {
    const section = sections.find((candidate) => candidate.key === item.key);
    return section ? [{ ...item, group: section.group, files: section.files }] : [];
  });

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        eyebrow={report.reportNumber}
        title="Тайлан засах"
        subtitle={`${report.title} · ${report.reportType.name}. Зөвхөн засуулахаар буцаасан хэсгүүдийг засаад илгээнэ үү.`}
      />
      <RevisionForm reportId={report.id} reason={report.returnReason} items={flagged} />
    </main>
  );
}
