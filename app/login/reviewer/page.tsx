import AuthForm from '@/components/auth/AuthForm';
import { REVIEWER_ACCOUNTS, REVIEWER_ROLES } from '@/lib/constants';

export default function ReviewerLoginPage() {
  return (
    <AuthForm
      title="Тайлан хянах байгууллага"
      subtitle="Имэйл, нууц үгээ оруулж нэвтэрнэ үү."
      allowedRoles={REVIEWER_ROLES}
      exampleEmail={REVIEWER_ACCOUNTS[0].email}
      examplePassword={REVIEWER_ACCOUNTS[0].password}
    />
  );
}
