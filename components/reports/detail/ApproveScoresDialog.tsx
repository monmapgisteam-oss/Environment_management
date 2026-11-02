'use client';

import { useRouter } from 'next/navigation';
import SignaturePinDialog from '@/components/signature/SignaturePinDialog';
import { toast } from '@/lib/toast';
import { formatScore } from '@/lib/utils';

type Props = {
  reportId: string;
  reportNumber: string;
  evaluatorCount: number;
  finalScore: number | null;
  onClose: () => void;
};

// The manager's one signature: approving the evaluators' signed scores, which
// releases them to the sender (api/reports/[id]/approve-scores).
export default function ApproveScoresDialog({ reportId, reportNumber, evaluatorCount, finalScore, onClose }: Props) {
  const router = useRouter();

  const sign = async (pin: string) => {
    const res = await fetch(`/api/reports/${reportId}/approve-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature: pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || 'Баталгаажуулахад алдаа гарлаа.';
    toast('Үнэлгээг баталлаа. Илгээгч байгууллагад дүн харагдана.');
    onClose();
    router.refresh();
    return null;
  };

  return (
    <SignaturePinDialog
      title="Үнэлгээг батлах"
      summary={[
        { label: 'Тайлан', value: reportNumber },
        { label: 'Гарын үсэг зурсан гишүүн', value: `${evaluatorCount} / ${evaluatorCount}` },
        { label: 'Эцсийн оноо', value: formatScore(finalScore) },
      ]}
      note="Баталсны дараа үнэлгээ өөрчлөгдөхгүй бөгөөд илгээгч байгууллага дүнгээ харна."
      confirmLabel="Гарын үсэг зурж батлах"
      onSign={sign}
      onClose={onClose}
    />
  );
}
