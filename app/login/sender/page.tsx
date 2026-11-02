import AuthForm from '@/components/auth/AuthForm';
import { signedInSummary } from '@/lib/auth';
import { SENDER_ACCOUNTS, SENDER_ROLES } from '@/lib/constants';

export default async function SenderLoginPage() {
  const signedInAs = await signedInSummary();
  return (
    <AuthForm
      title="БОМТ илгээх байгууллага"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      signedInAs={signedInAs}
      allowedRoles={SENDER_ROLES}
      exampleEmail={SENDER_ACCOUNTS[0].email}
      examplePassword={SENDER_ACCOUNTS[0].password}
      signupHref="/signup"
    />
  );
}
