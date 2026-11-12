import ConclusionSectionPage from '@/components/conclusions/ConclusionSectionPage';
import { requireUser } from '@/lib/auth';
import { loadView } from '@/lib/api/server';
import type { ConclusionSearchParams } from '@shared/reports/conclusions';

type Props = {
  searchParams: Promise<ConclusionSearchParams>;
};

export default async function EvaluatorConclusionsPage(props: Props) {
  await requireUser('evaluator');

  const searchParams = await props.searchParams;
  const { rows } = await loadView('evaluator/conclusions', { query: searchParams });

  return (
    <ConclusionSectionPage rows={rows} search={searchParams} role="staff" />
  );
}
