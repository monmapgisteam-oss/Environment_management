import AuthForm from '@/components/auth/AuthForm';
import { SENDER_ACCOUNTS, SENDER_ROLES } from '@/lib/constants';

export default function SenderLoginPage() {
  return (
    <AuthForm
      title="БОМТ илгээх байгууллага"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      allowedRoles={SENDER_ROLES}
      exampleEmail={SENDER_ACCOUNTS[0].email}
      examplePassword={SENDER_ACCOUNTS[0].password}
      signupHref="/signup"
    />
  );
}
