import AuthForm from '@/components/auth/AuthForm';
import { signedInSummary } from '@/lib/auth';
import { REVIEWER_ACCOUNTS, REVIEWER_ROLES } from '@/lib/constants';

export default async function ReviewerLoginPage() {
  const signedInAs = await signedInSummary();
  return (
    <AuthForm
      title="БОМТ хянах байгууллага"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      signedInAs={signedInAs}
      allowedRoles={REVIEWER_ROLES}
      exampleEmail={REVIEWER_ACCOUNTS[0].email}
      examplePassword={REVIEWER_ACCOUNTS[0].password}
    />
  );
}
