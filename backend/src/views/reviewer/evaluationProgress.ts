import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';

// Every report being scored, with who is assigned and whether they signed.
// Only signing state leaves the backend: no scores, comments or signatures.
export default defineView({
  name: 'reviewer/evaluation-progress',
  roles: ['review_manager'],
  async load() {
    const reports = await dataStore.report.findMany({
      where: {
        status: { in: ['assigned', 'in_review', 'completed'] },
        title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      },
      include: {
        reportType: true,
        senderCompany: true,
        location: true,
        assignments: {
          select: {
            evaluatorUserId: true,
            deadline: true,
            assignedAt: true,
            submittedAt: true,
            evaluator: { select: { id: true, name: true, role: true } },
            evaluation: { select: { status: true, signatureStatus: true, signedAt: true, submittedAt: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return { reports: await attachEffectiveSenderCompanies(reports) };
  },
});
