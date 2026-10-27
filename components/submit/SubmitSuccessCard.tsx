"use client";

import Link from "next/link";
import { useState } from "react";
import { HiCheck, HiOutlineClipboardCopy } from "react-icons/hi";
import { REPORT_NOUN, type ReportNoun } from "@/lib/reports/terms";

type SubmitSuccessCardProps = {
  isEdit: boolean;
  isGeneralEvaluation: boolean;
  // Number the server assigned to the saved report, when known.
  reportNumber: string | null;
  // A plan is called БОМТ, a performance report тайлан.
  noun?: ReportNoun;
  onBackToReports: () => void;
  onReset: () => void;
};

// What happens to the report from here; the first step is the one just done.
const STEPS = [
  { title: "Илгээгдсэн", text: "Таны илгээсэн мэдээлэл хадгалагдлаа." },
  { title: "Хянах байгууллага хүлээн авна", text: "Хянах менежерт мэдэгдэл очсон." },
  { title: "Гишүүд үнэлнэ", text: "Үнэлгээний гишүүд журмын шалгуураар үнэлнэ." },
  { title: "Дүгнэлт ирнэ", text: "Гарын үсэгтэй дүгнэлтийг «Миний төлөвлөгөө, тайлан» хэсгээс татна." },
];

// Shown after a report is submitted: the number to keep, what happens next,
// and where to go from here.
export default function SubmitSuccessCard({
  isEdit,
  isGeneralEvaluation,
  reportNumber,
  noun = REPORT_NOUN,
  onBackToReports,
  onReset,
}: SubmitSuccessCardProps) {
  const [copied, setCopied] = useState(false);
  const label = noun.one === "тайлан" ? "Тайлан" : noun.one;
  const title = isGeneralEvaluation
    ? "Дүгнэлт амжилттай илгээгдлээ"
    : isEdit
      ? `${label} дахин илгээгдлээ`
      : `${label} амжилттай илгээгдлээ`;

  const copyNumber = async () => {
    if (!reportNumber) return;
    try {
      await navigator.clipboard.writeText(reportNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copying is a convenience; the number stays on screen.
    }
  };

  const buttonClass =
    "inline-flex h-11 items-center justify-center bg-color-primary px-6 text-sm font-semibold text-white transition hover:bg-color-primary-dark";
  const secondaryClass =
    "inline-flex h-11 items-center justify-center border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

  return (
    <div className="mx-auto max-w-3xl overflow-hidden border border-slate-200 bg-white shadow-soft">
      {/* Confirmation */}
      <div className="relative bg-gradient-to-b from-teal-50 dark:from-teal-950/40 to-white dark:to-transparent px-6 pb-8 pt-12 text-center sm:px-12">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white ring-8 ring-teal-100">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white">
            <HiCheck size={32} />
          </span>
        </span>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          {isGeneralEvaluation
            ? "Таны ерөнхий үнэлгээний дүгнэлтийг хүлээн авлаа."
            : `Явцыг хяналтын самбар болон «Миний төлөвлөгөө, тайлан» хэсгээс хянана.`}
        </p>

        {reportNumber && (
          <div className="mx-auto mt-6 inline-flex items-stretch border border-slate-200 bg-white text-left">
            <div className="px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{noun.of} дугаар</p>
              <p className="font-mono text-lg font-bold text-slate-900">{reportNumber}</p>
            </div>
            <button
              type="button"
              onClick={copyNumber}
              className="flex items-center gap-1.5 border-l border-slate-200 px-4 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
              aria-label="Дугаарыг хуулах"
            >
              {copied ? <HiCheck size={16} /> : <HiOutlineClipboardCopy size={16} />}
              {copied ? "Хуулсан" : "Хуулах"}
            </button>
          </div>
        )}
      </div>

      {/* What happens next */}
      {!isGeneralEvaluation && (
        <div className="border-t border-slate-200 px-6 py-7 sm:px-10">
          <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Дараагийн алхам</p>
          <ol className="grid gap-5 sm:grid-cols-4 sm:gap-0">
            {STEPS.map((step, index) => {
              const done = index === 0;
              const current = index === 1;
              const last = index === STEPS.length - 1;
              return (
                <li key={step.title} className="relative flex gap-3 sm:block sm:pr-4">
                  {/* Connector to the next step */}
                  {!last && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-4 top-9 h-[calc(100%-1rem)] w-0.5 sm:left-9 sm:top-4 sm:h-0.5 sm:w-[calc(100%-2.25rem)] ${
                        done ? "bg-teal-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      done
                        ? "bg-teal-600 text-white"
                        : current
                          ? "bg-white text-teal-700 ring-2 ring-teal-600"
                          : "bg-white text-slate-400 ring-1 ring-slate-300"
                    }`}
                  >
                    {done ? <HiCheck size={16} /> : index + 1}
                  </span>
                  <div className="sm:mt-3">
                    <p className={`text-sm font-semibold ${done || current ? "text-slate-900" : "text-slate-500"}`}>{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Where to go */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-center">
        {isEdit ? (
          <button type="button" onClick={onBackToReports} className={buttonClass}>
            Миний төлөвлөгөө, тайлан руу буцах
          </button>
        ) : (
          <>
            <button type="button" onClick={onReset} className={secondaryClass}>
              {isGeneralEvaluation ? "Дахин дүгнэлт илгээх" : `Шинэ ${noun.one} илгээх`}
            </button>
            <Link href="/sender/reports" className={buttonClass}>
              Миний төлөвлөгөө, тайлан
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
