import ConclusionSectionPage from '@/components/conclusions/ConclusionSectionPage';
import { requireUser } from '@/lib/auth';
import { fetchConclusionRows } from '@/lib/reports/conclusionReports';
import type { ConclusionSearchParams } from '@/lib/reports/conclusions';

type Props = {
  searchParams: Promise<ConclusionSearchParams>;
};

export default async function EvaluatorConclusionsPage(props: Props) {
  await requireUser('evaluator');

  const searchParams = await props.searchParams;
  const rows = await fetchConclusionRows(searchParams);

  return (
    <ConclusionSectionPage rows={rows} search={searchParams} role="staff" />
  );
}
