import AuthForm from '@/components/auth/AuthForm';
import { ADMIN_ACCOUNTS, ADMIN_ROLES } from '@/lib/constants';

export default function AdminLoginPage() {
  return (
    <AuthForm
      title="Системийн админ"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      allowedRoles={ADMIN_ROLES}
      exampleEmail={ADMIN_ACCOUNTS[0].email}
      examplePassword={ADMIN_ACCOUNTS[0].password}
    />
  );
}
