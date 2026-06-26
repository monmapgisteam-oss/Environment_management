import AuthForm from '@/components/AuthForm';
import { ADMIN_ACCOUNTS, ADMIN_ROLES } from '@/lib/constants';

export default function AdminLoginPage() {
  return (
    <AuthForm
      title="Системийн админ"
      subtitle="Аккаунтаа сонгож нэвтэрнэ үү."
      allowedRoles={ADMIN_ROLES}
      accounts={ADMIN_ACCOUNTS}
    />
  );
}
