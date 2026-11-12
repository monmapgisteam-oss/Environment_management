'use client';

import { useState } from 'react';
import { LuShieldOff } from 'react-icons/lu';

// Ends every session of this account on all devices (a forgotten shared
// computer, a lost phone), then returns to the start page.
export default function SignOutEverywhere() {
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ everywhere: true }),
    }).catch(() => {});
    window.location.href = '/';
  };
  return (
    <section className="mt-6 border border-slate-200 bg-white px-6 py-5">
      <h2 className="text-sm font-semibold text-slate-900">Бүх төхөөрөмжөөс гарах</h2>
      <p className="mt-1 text-sm text-slate-500">
        Энэ бүртгэлээр нэвтэрсэн бүх төхөөрөмж, хөтчөөс нэг дор гарна. Өөр хүн таны бүртгэлийг ашигласан гэж сэжиглэвэл нууц үгээ мөн солино уу.
      </p>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="mt-4 inline-flex h-10 items-center gap-2 border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
      >
        <LuShieldOff size={16} />
        Бүх төхөөрөмжөөс гарах
      </button>
    </section>
  );
}
