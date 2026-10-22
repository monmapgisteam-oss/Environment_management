import Link from "next/link";
import { HiCheckCircle, HiOutlineClipboardCheck, HiOutlineMail, HiOutlineUserGroup } from "react-icons/hi";

type SubmitSuccessCardProps = {
  isEdit: boolean;
  isGeneralEvaluation: boolean;
  // Number the server assigned to the saved report, when known.
  reportNumber: string | null;
  onBackToReports: () => void;
  onReset: () => void;
};

const NEXT_STEPS = [
  { icon: <HiOutlineMail size={18} />, title: "Хянах байгууллага хүлээн авна", text: "Хянах менежерт мэдэгдэл очсон." },
  { icon: <HiOutlineUserGroup size={18} />, title: "Үнэлгээний гишүүдэд оноогдоно", text: "Гишүүд журмын шалгуураар үнэлнэ." },
  { icon: <HiOutlineClipboardCheck size={18} />, title: "Дүгнэлт ирнэ", text: "Гарын үсэгтэй дүгнэлтийг «Миний тайлангууд» хэсгээс татна." },
];

// Shown after a report is submitted: the number to keep, what happens next,
// and where to go from here.
export default function SubmitSuccessCard({
  isEdit,
  isGeneralEvaluation,
  reportNumber,
  onBackToReports,
  onReset,
}: SubmitSuccessCardProps) {
  const buttonClass =
    "inline-flex h-11 items-center justify-center bg-color-primary px-6 text-sm font-semibold text-white transition hover:bg-color-primary-dark";
  const secondaryClass =
    "inline-flex h-11 items-center justify-center border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

  return (
    <div className="border border-slate-200 bg-white shadow-soft">
      <div className="px-8 pb-8 pt-12 text-center sm:px-16">
        <span className="mx-auto flex h-16 w-16 items-center justify-center bg-teal-50 text-teal-600">
          <HiCheckCircle size={40} />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
          {isGeneralEvaluation ? "Дүгнэлт амжилттай илгээгдлээ" : isEdit ? "Тайлан дахин илгээгдлээ" : "Тайлан амжилттай илгээгдлээ"}
        </h2>
        {reportNumber && (
          <p className="mt-3 inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
            Тайлангийн дугаар <span className="font-mono text-base font-bold text-slate-900">{reportNumber}</span>
          </p>
        )}
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
          {isGeneralEvaluation
            ? "Таны ерөнхий үнэлгээний дүгнэлтийг хүлээн авлаа."
            : "Тайлангийн явцыг хяналтын самбар болон «Миний тайлангууд» хэсгээс хянана."}
        </p>
      </div>

      {!isGeneralEvaluation && (
        <ol className="grid gap-px border-y border-slate-200 bg-slate-200 sm:grid-cols-3">
          {NEXT_STEPS.map((step, index) => (
            <li key={step.title} className="bg-white px-6 py-5">
              <div className="flex items-center gap-2 text-teal-700">
                <span className="text-xs font-bold">{index + 1}</span>
                {step.icon}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-xs text-slate-500">{step.text}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 px-8 py-6">
        {isEdit ? (
          <button type="button" onClick={onBackToReports} className={buttonClass}>
            Миний тайлангууд руу буцах
          </button>
        ) : (
          <>
            <Link href="/sender/reports" className={buttonClass}>
              Миний тайлангууд
            </Link>
            <button type="button" onClick={onReset} className={secondaryClass}>
              {isGeneralEvaluation ? "Дахин дүгнэлт илгээх" : "Дахин тайлан илгээх"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
