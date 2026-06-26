import AuthForm from '@/components/AuthForm';

export default function ReviewerLoginPage() {
  return (
    <AuthForm
      title="Тайлан хянах байгууллага"
      subtitle="Менежер болон ажилтан энэ хэсгээр нэвтэрнэ."
      defaultEmail="manager@tailan.mn"
      defaultPassword="Manager123!"
      allowedRoles={['review_manager', 'evaluator']}
    />
  );
}
