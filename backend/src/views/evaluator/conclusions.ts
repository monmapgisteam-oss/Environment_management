import { fetchConclusionRows } from '@/lib/reports/conclusionReports';
import type { ConclusionSearchParams } from '@shared/reports/conclusions';
import { defineView } from '../define';

const SEARCH_KEYS = ['year', 'number', 'category', 'project', 'district', 'implementer', 'kind'] as const;

// The page's search filters, as the conclusion list reads them.
function conclusionSearch(query: URLSearchParams): ConclusionSearchParams {
  const search: ConclusionSearchParams = {};
  for (const key of SEARCH_KEYS) {
    const value = query.get(key);
    if (value !== null) search[key] = value;
  }
  return search;
}

export default defineView({
  name: 'evaluator/conclusions',
  roles: ['evaluator'],
  async load({ query }) {
    return { rows: await fetchConclusionRows(conclusionSearch(query)) };
  },
});
