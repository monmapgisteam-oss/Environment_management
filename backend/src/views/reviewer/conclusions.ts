import { fetchConclusionRows } from '@/lib/reports/conclusionReports';
import { fetchPendingCompanies } from '@/lib/reports/pendingCompanies';
import type { ConclusionSearchParams } from '@shared/reports/conclusions';
import { defineView } from '../define';

const SEARCH_KEYS = ['year', 'number', 'category', 'project', 'district', 'implementer', 'kind'] as const;

// The manager's conclusions, with the new registrations to approve on top.
export default defineView({
  name: 'reviewer/conclusions',
  roles: ['review_manager'],
  async load({ query }) {
    const search: ConclusionSearchParams = {};
    for (const key of SEARCH_KEYS) {
      const value = query.get(key);
      if (value !== null) search[key] = value;
    }
    const [rows, pending] = await Promise.all([fetchConclusionRows(search, { includePending: true }), fetchPendingCompanies()]);
    return { rows, pending };
  },
});
