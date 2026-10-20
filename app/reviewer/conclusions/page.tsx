import ConclusionSectionPage from '@/components/conclusions/ConclusionSectionPage';
import { fetchConclusionRows } from '@/lib/reports/conclusionReports';
import type { ConclusionSearchParams } from '@/lib/reports/conclusions';

type Props = {
  searchParams: Promise<ConclusionSearchParams>;
};

export default async function ReviewerConclusionsPage(props: Props) {
  const searchParams = await props.searchParams;
  const rows = await fetchConclusionRows(searchParams);

  return (
    <ConclusionSectionPage rows={rows} search={searchParams} role="reviewer" />
  );
}
