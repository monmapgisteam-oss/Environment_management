import { defineView } from '../define';
import { fetchSenderReports } from './dashboard';
import { senderTableRow } from './tableRows';

// The company's sent reports, newest first.
export default defineView({
  name: 'sender/reports',
  roles: ['sender'],
  async load({ user }) {
    const reports = user.companyId ? await fetchSenderReports(user.companyId) : [];
    return {
      reports: reports
        .map(senderTableRow)
        .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()),
    };
  },
});
