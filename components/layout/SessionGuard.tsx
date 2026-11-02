'use client';

import { useEffect, useState } from 'react';
import { HiExclamation } from 'react-icons/hi';

type Session = { userId: string | null; name: string | null };

// Every tab of a browser shares one sign-in. When another tab signs in as
// someone else, or the session ends, this page would act as the wrong person:
// so the page checks on focus and blocks itself until it is reloaded.
export default function SessionGuard({ userId }: { userId: string }) {
  const [mismatch, setMismatch] = useState<Session | null>(null);

  useEffect(() => {
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== 'visible') return;
      checking = true;
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const session = (await res.json()) as Session;
        setMismatch(session.userId === userId ? null : session);
      } catch {
        // Offline: nothing to compare against.
      } finally {
        checking = false;
      }
    };
    // An API call answering 401 means the session is gone: check right away.
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 || response.status === 403) void check();
      return response;
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [userId]);

  if (!mismatch) return null;
  const signedOut = !mismatch.userId;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/70 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-md bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-amber-50 text-amber-600">
            <HiExclamation size={22} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {signedOut ? 'Нэвтрэх хугацаа дууссан' : 'Өөр хэрэглэгчээр нэвтэрсэн байна'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {signedOut
                ? 'Та системээс гарсан байна. Үргэлжлүүлэхийн тулд дахин нэвтэрнэ үү.'
                : `Энэ хөтөч дээр өөр цонхонд ${mismatch.name ?? 'өөр хэрэглэгч'}-ээр нэвтэрсэн тул энэ хуудас хуучирсан. Хуудсыг дахин ачаална уу. Олон эрхээр зэрэг ажиллах бол тус бүрийг тусдаа (private) цонхонд нээнэ үү.`}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => window.location.assign(signedOut ? '/' : window.location.pathname)}
            className="h-10 bg-[#0F766E] px-5 text-sm font-semibold text-white transition hover:bg-[#115E59]"
          >
            {signedOut ? 'Нэвтрэх' : 'Дахин ачаалах'}
          </button>
        </div>
      </div>
    </div>
  );
}
