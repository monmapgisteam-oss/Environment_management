import AuthForm from '@/components/auth/AuthForm';
import { signedInSummary } from '@/lib/auth';
import { REVIEWER_ACCOUNTS, REVIEWER_ROLES } from '@shared/constants';

const DEV = process.env.NODE_ENV !== 'production';

export default async function ReviewerLoginPage() {
  const signedInAs = await signedInSummary();
  return (
    <AuthForm
      title="БОМТ хянах байгууллага"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      signedInAs={signedInAs}
      allowedRoles={REVIEWER_ROLES}
      // Test accounts reach the browser only in development.
      exampleEmail={DEV ? REVIEWER_ACCOUNTS[0].email : ''}
      examplePassword={DEV ? REVIEWER_ACCOUNTS[0].password : ''}
    />
  );
}
