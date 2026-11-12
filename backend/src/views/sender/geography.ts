import { fetchSenderCompanyPoints } from '@/lib/map/senderLocations';
import { defineView, redirect } from '../define';

// Locations of the company's sent reports.
export default defineView({
  name: 'sender/geography',
  roles: ['sender'],
  async load({ user }) {
    if (!user.companyId) redirect('/login/sender');
    return { points: await fetchSenderCompanyPoints(user.companyId) };
  },
});
