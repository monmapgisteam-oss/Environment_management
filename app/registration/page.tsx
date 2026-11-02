import { HiCheck, HiOutlineChatAlt2, HiOutlineClock, HiOutlineExclamationCircle } from 'react-icons/hi';
import ConclusionComments, { type ConclusionComment } from '@/components/reports/detail/ConclusionComments';
import ConclusionEditForm from '@/components/registration/ConclusionEditForm';
import dataStore from '@/lib/db';
import { requireRegistrationUser } from '@/lib/auth';
import { createSignedUrl } from '@/lib/db/storage';
import { parseAttachments } from '@/lib/reports/attachments';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

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

  const registeredAt = new Date(company.createdAt).toLocaleDateString('mn-MN');
  const steps = [
    { label: 'Бүртгүүлсэн', detail: registeredAt, state: 'done' as const },
    {
      label: rejected ? 'Засвар шаардсан' : 'Хянагч шалгаж байна',
      detail: rejected ? 'Тайлбарын дагуу засаад дахин илгээнэ' : 'Дүгнэлт, регистрийн дугаарыг шалгана',
      state: rejected ? ('failed' as const) : ('current' as const),
    },
    { label: 'Баталгаажсан', detail: 'БОМТ илгээх эрх нээгдэнэ', state: 'todo' as const },
  ];
  const tone = rejected
    ? { ring: 'border-rose-200', soft: 'bg-rose-50', icon: 'bg-rose-100 text-rose-700', title: 'text-rose-900', text: 'text-rose-800', pill: 'bg-rose-100 text-rose-700' }
    : { ring: 'border-amber-200', soft: 'bg-amber-50', icon: 'bg-amber-100 text-amber-700', title: 'text-amber-900', text: 'text-amber-800', pill: 'bg-amber-100 text-amber-800' };
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Who and where the registration stands */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Байгууллагын бүртгэл</p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{company.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            РД <span className="font-mono font-semibold text-slate-700">{company.registerNumber}</span> · бүртгүүлсэн {registeredAt}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold ${tone.pill}`}>
          {rejected ? <HiOutlineExclamationCircle size={14} /> : <HiOutlineClock size={14} />}
          {rejected ? 'Засвар шаардсан' : 'Хянагдаж байна'}
        </span>
      </header>

      <section className={`border bg-white shadow-soft ${tone.ring}`}>
        <div className={`flex items-start gap-4 px-6 py-5 ${tone.soft}`}>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center ${tone.icon}`}>
            {rejected ? <HiOutlineExclamationCircle size={24} /> : <HiOutlineClock size={24} />}
          </span>
          <div className="min-w-0">
            <h2 className={`text-base font-bold ${tone.title}`}>
              {rejected ? 'Бүртгэлийг баталгаажуулаагүй байна' : 'Бүртгэлийг хянаж байна'}
            </h2>
            <p className={`mt-1 text-sm leading-6 ${tone.text}`}>
              {rejected
                ? 'Доорх тайлбарын дагуу ерөнхий үнэлгээний дүгнэлтээ засаж хадгална уу. Хадгалахад хянах байгууллага дахин шалгана.'
                : 'Хянах байгууллага таны бүртгэлийг шалгаж байна. Баталгаажмагц мэдэгдэл очно — энэ хооронд дүгнэлтийн мэдээллээ засах боломжтой.'}
            </p>
          </div>
        </div>

        {/* Stepper: done → current → todo, joined by a line */}
        <ol className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:gap-0">
          {steps.map((step, index) => (
            <li key={step.label} className="relative flex items-start gap-3 sm:flex-col sm:gap-2 sm:pr-4">
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute left-10 right-1 top-3.5 hidden h-0.5 sm:block ${
                    step.state === 'done' ? 'bg-teal-500' : 'bg-slate-200'
                  }`}
                />
              )}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* The conclusion and the reviewers' comments on it */}
        <div className="min-w-0 space-y-6">
          {report ? (
            <ConclusionEditForm
              rejected={rejected}
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
          ) : (
            <p className="border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
              Дүгнэлт олдсонгүй. Хянах байгууллагад хандана уу.
            </p>
          )}

          {report && comments.length > 0 ? (
            <ConclusionComments reportId={report.id} initialComments={comments} canComment={false} />
          ) : (
            <section className="flex items-center gap-4 border border-dashed border-slate-300 bg-white px-6 py-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-100 text-slate-400">
                <HiOutlineChatAlt2 size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Хянагчийн тайлбар ирээгүй байна</p>
                <p className="mt-0.5 text-xs text-slate-500">Хянах менежер тайлбар үлдээвэл энд харагдаж, мэдэгдэл очно.</p>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <section className="border border-slate-200 bg-white shadow-soft">
            <h2 className="border-b border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-900">Бүртгэлийн мэдээлэл</h2>
            <dl className="divide-y divide-slate-100 px-5 text-sm">
              {[
                ['Байгууллага', company.name],
                ['Регистрийн дугаар', company.registerNumber],
                ['Хариуцсан ажилтан', user.name],
                ['Имэйл', user.email],
                ['Утас', user.phone || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-slate-500">{label}</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
