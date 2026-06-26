import AuthForm from '@/components/AuthForm';
import { SENDER_ACCOUNTS, SENDER_ROLES } from '@/lib/constants';

export default function SenderLoginPage() {
  return (
    <AuthForm
      title="Тайлан илгээх байгууллага"
      subtitle="Байгууллагаа сонгож нэвтэрнэ үү."
      allowedRoles={SENDER_ROLES}
      accounts={SENDER_ACCOUNTS}
    />
  );
}
