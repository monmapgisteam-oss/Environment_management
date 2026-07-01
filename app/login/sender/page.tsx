import AuthForm from '@/components/AuthForm';
import { SENDER_ACCOUNTS, SENDER_ROLES } from '@/lib/constants';

export default function SenderLoginPage() {
  return (
    <AuthForm
      title="Тайлан илгээх байгууллага"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      allowedRoles={SENDER_ROLES}
      exampleEmail={SENDER_ACCOUNTS[0].email}
      examplePassword={SENDER_ACCOUNTS[0].password}
    />
  );
}
