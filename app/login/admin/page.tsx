import AuthForm from '@/components/auth/AuthForm';
import { signedInSummary } from '@/lib/auth';
import { ADMIN_ACCOUNTS, ADMIN_ROLES } from '@/lib/constants';

export default async function AdminLoginPage() {
  const signedInAs = await signedInSummary();
  return (
    <AuthForm
      title="Системийн админ"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      signedInAs={signedInAs}
      allowedRoles={ADMIN_ROLES}
      exampleEmail={ADMIN_ACCOUNTS[0].email}
      examplePassword={ADMIN_ACCOUNTS[0].password}
    />
  );
}
