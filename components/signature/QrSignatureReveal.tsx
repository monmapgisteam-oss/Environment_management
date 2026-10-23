import { HiSparkles } from 'react-icons/hi';

type Props = {
  registered: boolean;
};

// Shows whether the person has a registered numeric signature. The PIN itself
// is a secret that only its owner knows; it is never sent to the browser.
export default function QrSignatureReveal({ registered }: Props) {
  return (
    <div className="flex gap-3 border border-slate-200 bg-slate-50 p-4">
      <HiSparkles className="mt-0.5 shrink-0 text-[#0F766E]" size={20} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Тоон гарын үсэг</p>
        <p className="mt-1 text-base font-semibold text-slate-900">{registered ? 'Бүртгэгдсэн' : 'Бүртгэгдээгүй'}</p>
      </div>
    </div>
  );
}
