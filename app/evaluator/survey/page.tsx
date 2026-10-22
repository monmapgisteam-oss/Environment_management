import PageHeader from '@/components/layout/PageHeader';
import { requireUser } from '@/lib/auth';
import SurveyLookup from '@/components/survey/SurveyLookup';

export default async function EvaluatorSurveyPage() {
  await requireUser('evaluator');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Тайлан хайх" subtitle="Байгууллагын регистрийн дугаараар тайлангийн мэдээлэл хайна." />

      <SurveyLookup role="staff" />
    </main>
  );
}
