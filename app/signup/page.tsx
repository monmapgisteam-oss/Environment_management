import AuthLayout from '@/components/auth/AuthLayout';
import SignupForm from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <AuthLayout size="lg">
      <SignupForm />
    </AuthLayout>
  );
}
