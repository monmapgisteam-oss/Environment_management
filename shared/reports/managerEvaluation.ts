import { uniqueAssignmentsByEvaluator } from '@shared/reports/assignments';

type Assignment = {
  evaluatorUserId: string;
  evaluator: { id?: string | null; role: string };
  assignedAt?: Date | string | null;
  evaluation?: { status?: string | null; signatureStatus?: string | null } | null;
};

export function isVerifiedEvaluation(evaluation: Assignment['evaluation']) {
  return evaluation?.status === 'SIGNED' && evaluation.signatureStatus === 'VERIFIED';
}

// Managers have their own assignment, but do not count as committee members.
export function managerEvaluationState<T extends Assignment>(assignments: T[], managerId: string) {
  const unique = uniqueAssignmentsByEvaluator(assignments);
  const members = unique.filter((assignment) => assignment.evaluator.role === 'evaluator');
  const signedMembers = members.filter((assignment) => isVerifiedEvaluation(assignment.evaluation));
  const ownAssignment = unique.find((assignment) => assignment.evaluatorUserId === managerId);
  return {
    members,
    signedMembers,
    allMembersSigned: members.length > 0 && signedMembers.length === members.length,
    ownAssignment,
    ownSigned: isVerifiedEvaluation(ownAssignment?.evaluation),
  };
}

export const MANAGER_SCORE_REQUIRED_ERROR = 'Эхлээд өөрийн үнэлгээг өгч, тоон гарын үсгээр баталгаажуулна уу.';

// The approval API and the report's action card use the same readiness check.
export function managerApprovalError(
  report: { status: string; finalScore: number | null },
  assignments: Assignment[],
  managerId: string,
) {
  const state = managerEvaluationState(assignments, managerId);
  if (report.status !== 'completed' || !state.allMembersSigned || report.finalScore == null) {
    return 'Бүх гишүүн гарын үсгээр үнэлгээгээ баталгаажуулаагүй байна.';
  }
  if (!state.ownSigned) return MANAGER_SCORE_REQUIRED_ERROR;
  return null;
}

export function managerScoringError(status: string, assignments: Assignment[], managerId: string, released: boolean) {
  if (released || !['submitted', 'assigned', 'in_review', 'completed'].includes(status)) {
    return 'Энэ тайланг одоогоор үнэлэх боломжгүй.';
  }
  const state = managerEvaluationState(assignments, managerId);
  if (state.ownSigned) return 'Гарын үсгээр баталгаажсан тул засах боломжгүй.';
  return null;
}
