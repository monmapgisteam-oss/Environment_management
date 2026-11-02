import AuthForm from '@/components/auth/AuthForm';
import { signedInSummary } from '@/lib/auth';
import { ADMIN_ACCOUNTS, ADMIN_ROLES } from '@/lib/constants';

const DEV = process.env.NODE_ENV !== 'production';

export default async function AdminLoginPage() {
  const signedInAs = await signedInSummary();
  return (
    <AuthForm
      title="Системийн админ"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      signedInAs={signedInAs}
      allowedRoles={ADMIN_ROLES}
      // Test accounts reach the browser only in development.
      exampleEmail={DEV ? ADMIN_ACCOUNTS[0].email : ''}
      examplePassword={DEV ? ADMIN_ACCOUNTS[0].password : ''}
    />
  );
}
