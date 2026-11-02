import ConclusionSectionPage from '@/components/conclusions/ConclusionSectionPage';
import PendingCompanies from '@/components/admin/PendingCompanies';
import { fetchConclusionRows } from '@/lib/reports/conclusionReports';
import { fetchPendingCompanies } from '@/lib/reports/pendingCompanies';
import type { ConclusionSearchParams } from '@/lib/reports/conclusions';

type Props = {
  searchParams: Promise<ConclusionSearchParams>;
};

// The manager's conclusions, with the new registrations to approve on top.
export default async function ReviewerConclusionsPage(props: Props) {
  const searchParams = await props.searchParams;
  const [rows, pending] = await Promise.all([fetchConclusionRows(searchParams, { includePending: true }), fetchPendingCompanies()]);

  return (
    <ConclusionSectionPage rows={rows} search={searchParams} role="reviewer">
      <PendingCompanies companies={pending} />
    </ConclusionSectionPage>
  );
}
