import AuthForm from '@/components/AuthForm';

export default function SenderLoginPage() {
  return (
    <AuthForm
      title="Тайлан илгээх байгууллага"
      subtitle="Илгээх байгууллагын систем рүү нэвтрэх."
      defaultEmail="sender1@tailan.mn"
      defaultPassword="Sender123!"
      allowedRoles={['sender']}
    />
  );
}
