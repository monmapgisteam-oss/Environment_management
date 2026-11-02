import AuthForm from '@/components/auth/AuthForm';
import { signedInSummary } from '@/lib/auth';
import { SENDER_ACCOUNTS, SENDER_ROLES } from '@/lib/constants';

const DEV = process.env.NODE_ENV !== 'production';

export default async function SenderLoginPage() {
  const signedInAs = await signedInSummary();
  return (
    <AuthForm
      title="БОМТ илгээх байгууллага"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      signedInAs={signedInAs}
      allowedRoles={SENDER_ROLES}
      // Test accounts reach the browser only in development.
      exampleEmail={DEV ? SENDER_ACCOUNTS[0].email : ''}
      examplePassword={DEV ? SENDER_ACCOUNTS[0].password : ''}
      signupHref="/signup"
    />
  );
}
