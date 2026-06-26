import AuthForm from '@/components/AuthForm';

export default function AdminLoginPage() {
  return (
    <AuthForm
      title="Системийн админ"
      subtitle="Системийн удирдлагын самбар руу нэвтрэх."
      defaultEmail="admin@tailan.mn"
      defaultPassword="Admin123!"
      allowedRoles={['admin']}
    />
  );
}
