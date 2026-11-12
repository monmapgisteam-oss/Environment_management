import { fetchReviewedCompanyPoints } from '@/lib/map/reviewedLocations';
import { defineView } from '../define';

// Pins of the reports assigned to this staff member.
export default defineView({
  name: 'evaluator/geography',
  roles: ['evaluator'],
  async load({ user }) {
    return { points: await fetchReviewedCompanyPoints({ evaluatorUserId: user.id }) };
  },
});
