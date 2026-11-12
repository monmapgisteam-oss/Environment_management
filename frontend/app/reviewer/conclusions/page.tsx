import ConclusionSectionPage from '@/components/conclusions/ConclusionSectionPage';
import PendingCompanies from '@/components/admin/PendingCompanies';
import { loadView } from '@/lib/api/server';
import type { ConclusionSearchParams } from '@shared/reports/conclusions';

type Props = {
  searchParams: Promise<ConclusionSearchParams>;
};

// The manager's conclusions, with the new registrations to approve on top.
export default async function ReviewerConclusionsPage(props: Props) {
  const searchParams = await props.searchParams;
  const { rows, pending } = await loadView('reviewer/conclusions', { query: searchParams });

  return (
    <ConclusionSectionPage rows={rows} search={searchParams} role="reviewer">
      <PendingCompanies companies={pending} />
    </ConclusionSectionPage>
  );
}
