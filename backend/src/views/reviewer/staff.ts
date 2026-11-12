import dataStore from '@/lib/db';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';

async function fetchStaffMember(id: string) {
  return dataStore.user.findFirst({
    where: { id, role: 'evaluator' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      position: true,
      company: { select: { name: true } },
      evaluatorAssignments: {
        where: { report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } } },
        select: {
          id: true,
          status: true,
          deadline: true,
          report: { select: { id: true, reportNumber: true, title: true, status: true } },
          evaluation: { select: { totalScore: true } },
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  });
}

// One evaluator's profile, QR code and assigned reports.
export default defineView({
  name: 'reviewer/staff/:id',
  roles: ['review_manager'],
  async load({ params }) {
    const member = await fetchStaffMember(params.id);
    const qrUrl = member ? await createQrImageUrl(await getPublicProfileQrUrl(member.id)) : '';
    return { member, qrUrl };
  },
});
