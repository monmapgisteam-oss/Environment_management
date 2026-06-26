import AuthForm from '@/components/AuthForm';
import { REVIEWER_ACCOUNTS, REVIEWER_ROLES } from '@/lib/constants';

export default function ReviewerLoginPage() {
  return (
    <AuthForm
      title="Тайлан хянах байгууллага"
      subtitle="Аккаунтаа сонгож нэвтэрнэ үү."
      allowedRoles={REVIEWER_ROLES}
      accounts={REVIEWER_ACCOUNTS}
    />
  );
}
