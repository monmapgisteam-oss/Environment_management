import { requireUser } from '@/lib/auth';
import SurveyLookup from '@/components/survey/SurveyLookup';

export default async function EvaluatorSurveyPage() {
  await requireUser('evaluator');

  return (
    <main className="flex-1 min-w-0 space-y-4 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Тайлан хайх</h1>
        <p className="text-sm text-slate-500">Байгууллагын регистрийн дугаараар тайлангийн мэдээлэл хайна.</p>
      </div>

      <SurveyLookup role="staff" />
    </main>
  );
}
