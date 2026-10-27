import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';

export type CompanyDecision = 'approve' | 'reject';

// Admin approves or rejects a self-registered sender company (browser side).
// Rejecting asks first. Returns true when the change was saved.
export async function decideCompany(
  company: { id: string; name: string; registerNumber: string },
  action: CompanyDecision,
): Promise<boolean> {
  if (action === 'reject') {
    const ok = await confirmDialog({
      title: 'Бүртгэлийг татгалзах',
      message: `${company.name} (РД ${company.registerNumber}) нэвтрэх боломжгүй хэвээр үлдэнэ. Дараа нь баталгаажуулж болно.`,
      confirmLabel: 'Татгалзах',
      danger: true,
    });
    if (!ok) return false;
  }
  try {
    const res = await fetch(`/api/admin/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
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
