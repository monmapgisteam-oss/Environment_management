import { fetchReviewedCompanyPoints } from '@/lib/map/reviewedLocations';
import { defineView } from '../define';

// A pin for every received report with a location.
export default defineView({
  name: 'reviewer/geography',
  roles: ['review_manager'],
  async load() {
    return { points: await fetchReviewedCompanyPoints() };
  },
});
