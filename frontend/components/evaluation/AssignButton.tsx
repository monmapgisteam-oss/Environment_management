'use client';

import { useState, type ReactNode } from 'react';
import AssignDialog, { type AssignStaffOption, type AssignTarget } from '@/components/evaluation/AssignDialog';
import { toast } from '@/lib/toast';

type Props = {
  report: AssignTarget;
  className?: string;
  children?: ReactNode;
};

// "Гишүүдэд оноох" anywhere a report is listed: loads the staff and current
// assignees, then opens the assign dialog in place instead of leaving the page.
export default function AssignButton({ report, className, children = 'Гишүүдэд оноох' }: Props) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ staff: AssignStaffOption[]; assigneeIds: string[] } | null>(null);

  const open = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments?${new URLSearchParams({ reportId: report.id })}`);
      if (!res.ok) throw new Error();
      setOptions(await res.json());
    } catch {
      toast('Гишүүдийн жагсаалтыг ачаалж чадсангүй.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={open} disabled={loading} className={`${className ?? ''} disabled:opacity-70`}>
        {loading ? 'Ачаалж байна...' : children}
      </button>
      {options && (
        <AssignDialog report={report} staff={options.staff} assigneeIds={options.assigneeIds} onClose={() => setOptions(null)} />
      )}
    </>
  );
}
