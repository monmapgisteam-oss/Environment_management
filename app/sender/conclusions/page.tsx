import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConclusionComments, { type ConclusionComment } from '@/components/reports/detail/ConclusionComments';
import ConclusionEditForm from '@/components/registration/ConclusionEditForm';
import NewConclusionButton from '@/components/registration/NewConclusionButton';
import dataStore from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createSignedUrl } from '@/lib/db/storage';
import { parseAttachments } from '@/lib/reports/attachments';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

// The company's general evaluation conclusions ("Ерөнхий үнэлгээний
// дүгнэлт"): each one with its file and the reviewers' comments, editable,
// and a way to add another project's conclusion.
export default async function SenderConclusionsPage() {
  const user = await requireUser('sender');
  const company = user.company;
  const reports = company
    ? await dataStore.report.findMany({
        where: { senderCompanyId: company.id, title: GENERAL_EVALUATION_CONCLUSION_TITLE },
        include: { location: true },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const conclusions = await Promise.all(
    reports.map(async (report) => {
      const document = parseAttachments(report.fileUrl)[0];
      const comments: ConclusionComment[] = (
        await dataStore.reportComment.findMany({ where: { reportId: report.id }, orderBy: { createdAt: 'asc' } })
      ).map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      }));
      return {
        report,
        comments,
        file: document ? { name: document.name, url: await createSignedUrl(document.url) } : null,
      };
    }),
  );

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        title="Ерөнхий үнэлгээний дүгнэлт"
        subtitle="Байгууллагын төслүүдийн ерөнхий үнэлгээний дүгнэлт. Засах, шинээр нэмэх боломжтой; хянах байгууллагад мэдэгдэл очно."
      />

      {/* Opens the empty form in place, above the list. */}
      {company && (
        <div>
          <NewConclusionButton implementerName={company.name} />
        </div>
      )}

      {conclusions.length === 0 ? (
        <EmptyState title="Дүгнэлт бүртгэгдээгүй байна." hint="«Шинэ дүгнэлт нэмэх» дарж PDF файлаа хавсаргана уу." />
      ) : (
        conclusions.map(({ report, comments, file }) => (
          <div key={report.id} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start">
            <ConclusionEditForm
              endpoint={`/api/sender/conclusions/${report.id}`}
              file={file}
              initial={{
                conclusionYear: String(report.year || ''),
                conclusionNumber: report.conclusionNumber || '',
                conclusionType: report.description || '',
                projectName: report.projectName || '',
                projectCategory: report.reportCategory || '',
                district: report.location?.district || '',
                implementerName: report.implementerName || '',
              }}
            />
            {comments.length > 0 ? (
              <ConclusionComments reportId={report.id} initialComments={comments} canComment={false} />
            ) : (
              <p className="border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm text-slate-500">
                Хянагчийн тайлбар ирээгүй байна.
              </p>
            )}
          </div>
        ))
      )}
    </main>
  );
}
