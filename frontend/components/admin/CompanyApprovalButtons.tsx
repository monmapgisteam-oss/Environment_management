'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { decideCompany } from '@/lib/companyApproval';

type Props = {
  company: { id: string; name: string; registerNumber: string };
  // A rejected company can still be approved later, but not rejected again.
  rejected?: boolean;
};

// Approve / reject buttons for a self-registered company, used wherever the
// admin checks it (company list, conclusion page).
export default function CompanyApprovalButtons({ company, rejected = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const decide = async (action: 'approve' | 'reject') => {
    setBusy(true);
    if (await decideCompany(company, action)) router.refresh();
    setBusy(false);
  };

  return (
    <div className="flex shrink-0 gap-2">
      {!rejected && (
        <button
          type="button"
          onClick={() => decide('reject')}
          disabled={busy}
          className="h-9 border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          Татгалзах
        </button>
      )}
      <button
        type="button"
        onClick={() => decide('approve')}
        disabled={busy}
        className="h-9 bg-[#0F766E] px-4 text-xs font-semibold text-white hover:bg-[#115E59] disabled:opacity-50"
      >
        Баталгаажуулах
      </button>
    </div>
  );
}
