import { HiCheck, HiOutlineClock, HiOutlineExclamationCircle } from 'react-icons/hi';
import ConclusionComments, { type ConclusionComment } from '@/components/reports/detail/ConclusionComments';
import ConclusionEditForm from '@/components/registration/ConclusionEditForm';
import dataStore from '@/lib/db';
import { requireRegistrationUser } from '@/lib/auth';
import { createSignedUrl } from '@/lib/db/storage';
import { parseAttachments } from '@/lib/reports/attachments';
import { CONCLUSION_TYPES, GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

// What a sender sees until the admin approves their company: where the
// registration stands, the admin's and managers' comments on the conclusion,
// and the conclusion itself to fix and send again.
export default async function RegistrationPage() {
  const user = await requireRegistrationUser();
  // Always set here: a sender without a company counts as approved and never lands on this page.
  const company = user.company;
  if (!company) return null;
  const rejected = company.approvalStatus === 'rejected';

  const report = await dataStore.report.findFirst({
    where: { senderCompanyId: company.id, title: GENERAL_EVALUATION_CONCLUSION_TITLE },
    include: { location: true },
    orderBy: { createdAt: 'asc' },
  });
  const comments: ConclusionComment[] = report
    ? (await dataStore.reportComment.findMany({ where: { reportId: report.id }, orderBy: { createdAt: 'asc' } })).map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      }))
    : [];
  const document = report ? parseAttachments(report.fileUrl)[0] : undefined;
  const file = document ? { name: document.name, url: await createSignedUrl(document.url) } : null;

  const steps = [
    { label: 'Бүртгүүлсэн', detail: new Date(company.createdAt).toLocaleDateString('mn-MN'), state: 'done' as const },
    {
      label: rejected ? 'Татгалзсан' : 'Админ шалгаж байна',
      detail: rejected ? 'Тайлбарын дагуу засаад дахин илгээнэ үү' : 'Дүгнэлт, регистрийн дугаарыг шалгана',
      state: rejected ? ('failed' as const) : ('current' as const),
    },
    { label: 'Баталгаажсан', detail: 'Тайлан илгээх эрх нээгдэнэ', state: 'todo' as const },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-7 sm:px-6">
      {/* Status */}
      <section className={`border bg-white ${rejected ? 'border-rose-200' : 'border-amber-200'}`}>
        <div className={`flex items-start gap-4 px-6 py-5 ${rejected ? 'bg-rose-50' : 'bg-amber-50'}`}>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center ${
              rejected ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {rejected ? <HiOutlineExclamationCircle size={24} /> : <HiOutlineClock size={24} />}
          </span>
          <div className="min-w-0">
            <h1 className={`text-lg font-bold ${rejected ? 'text-rose-900' : 'text-amber-900'}`}>
              {rejected ? 'Бүртгэлийг баталгаажуулаагүй' : 'Бүртгэл хянагдаж байна'}
            </h1>
            <p className={`mt-1 text-sm leading-6 ${rejected ? 'text-rose-800' : 'text-amber-800'}`}>
              {rejected
                ? 'Доорх тайлбарыг уншаад ерөнхий үнэлгээний дүгнэлтээ засаж дахин илгээнэ үү. Дахин илгээхэд админ шалгана.'
                : `${company.name} (РД ${company.registerNumber}) байгууллагын бүртгэлийг системийн админ шалгаж байна. Хянагчдын тайлбар ирвэл энд харагдаж, мэдэгдэл очно.`}
            </p>
          </div>
        </div>
        <ol className="grid gap-4 px-6 py-5 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.label} className="flex items-start gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold ${
                  step.state === 'done'
                    ? 'bg-teal-600 text-white'
                    : step.state === 'failed'
                      ? 'bg-rose-500 text-white'
                      : step.state === 'current'
                        ? 'border-2 border-amber-500 bg-white text-amber-600'
                        : 'border-2 border-slate-200 bg-white text-slate-300'
                }`}
              >
                {step.state === 'done' ? <HiCheck size={15} /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${step.state === 'todo' ? 'text-slate-400' : 'text-slate-900'}`}>
                  {step.label}
                </span>
                <span className="block text-xs text-slate-500">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        {report ? (
          <ConclusionEditForm
            rejected={rejected}
            file={file}
            initial={{
              conclusionYear: String(report.year || ''),
              conclusionNumber: report.conclusionNumber || '',
              conclusionType: report.description || CONCLUSION_TYPES[0],
              projectName: report.projectName || '',
              projectCategory: report.reportCategory || '',
              district: report.location?.district || '',
              implementerName: report.implementerName || '',
            }}
          />
        ) : (
          <p className="border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
            Дүгнэлт олдсонгүй. Системийн админд хандана уу.
          </p>
        )}

        {report && comments.length > 0 ? (
          <ConclusionComments reportId={report.id} initialComments={comments} canComment={false} />
        ) : (
          <section className="border border-slate-200 bg-white px-6 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">Тайлбар ирээгүй байна</p>
            <p className="mt-1 text-xs text-slate-500">Админ эсвэл хянах менежер тайлбар үлдээвэл энд харагдана.</p>
          </section>
        )}
      </div>
    </main>
  );
}
