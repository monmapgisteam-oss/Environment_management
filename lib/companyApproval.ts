import { promptDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';

export type CompanyDecision = 'approve' | 'reject';

// The review manager approves or rejects a self-registered sender company (browser side).
// Rejecting asks first. Returns true when the change was saved.
export async function decideCompany(
  company: { id: string; name: string; registerNumber: string },
  action: CompanyDecision,
): Promise<boolean> {
  // A rejected company sees the reason on its registration page and fixes it.
  let reason: string | undefined;
  if (action === 'reject') {
    const text = await promptDialog({
      title: 'Бүртгэлийг татгалзах',
      message: `${company.name} (РД ${company.registerNumber}) нэвтрэх боломжгүй хэвээр үлдэнэ. Шалтгааныг байгууллагад харуулна.`,
      confirmLabel: 'Татгалзах',
      danger: true,
      input: { label: 'Татгалзсан шалтгаан', placeholder: 'Жишээ: Дүгнэлтийн PDF уншигдахгүй байна.' },
    });
    if (text === null) return false;
    reason = text;
  }
  try {
    const res = await fetch(`/api/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error);
    toast(action === 'approve' ? `${company.name} баталгаажлаа.` : `${company.name}-ийн бүртгэлийг татгалзлаа.`);
    return true;
  } catch (error) {
    toast((error as Error).message || 'Хадгалахад алдаа гарлаа.', 'error');
    return false;
  }
}
