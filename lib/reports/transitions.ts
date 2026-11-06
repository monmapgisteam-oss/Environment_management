import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';

// Which report statuses each workflow action may start from. Every API route
// that changes a report's status checks here first, so a report can't be moved
// into a state nobody can act on (e.g. returned after every evaluator signed,
// or assigned while the sender is still fixing it).
export type ReportAction = 'assign' | 'evaluate' | 'returnRequest' | 'returnToSender' | 'dismissReturn' | 'approve';

const ALLOWED_FROM: Record<ReportAction, string[]> = {
  assign: ['submitted', 'assigned', 'in_review'],
  evaluate: ['assigned', 'in_review'],
  returnRequest: ['assigned', 'in_review'],
  returnToSender: ['submitted', 'assigned', 'in_review', 'return_requested'],
  dismissReturn: ['return_requested'],
  approve: ['completed'],
};

const ERRORS: Record<ReportAction, string> = {
  assign: 'Энэ төлөвт байгаа тайланг гишүүдэд оноох боломжгүй.',
  evaluate: 'Энэ тайланг одоогоор үнэлэх боломжгүй (буцаагдсан эсвэл үнэлгээ дууссан).',
  returnRequest: 'Энэ тайланд буцаах хүсэлт илгээх боломжгүй.',
  returnToSender: 'Бүх гишүүн гарын үсгээр үнэлсэн тул тайланг буцаах боломжгүй.',
  dismissReturn: 'Энэ тайланд шийдвэрлэх буцаах хүсэлт алга.',
  approve: 'Бүх гишүүн гарын үсгээр үнэлгээгээ баталгаажуулаагүй байна.',
};

export function canTransition(status: string, action: ReportAction) {
  return ALLOWED_FROM[action].includes(status);
}

export function transitionError(action: ReportAction) {
  return ERRORS[action];
}

type SignableAssignment = {
  evaluatorUserId?: string | null;
  evaluator?: { id?: string | null; role?: string | null } | null;
  assignedAt?: Date | string | null;
  evaluation?: { status?: string | null; signatureStatus?: string | null } | null;
};

function isSigned(assignment: SignableAssignment) {
  return assignment.evaluation?.status === 'SIGNED' && assignment.evaluation?.signatureStatus === 'VERIFIED';
}

// Signing progress of a report's evaluators (one row per evaluator).
export function signingProgress(assignments: SignableAssignment[]) {
  const unique = uniqueAssignmentsByEvaluator(assignments);
  const signed = unique.filter(isSigned).length;
  return { total: unique.length, signed, anyScored: unique.some((a) => !!a.evaluation), allSigned: unique.length > 0 && signed === unique.length };
}

// The status a report goes back to when a return request is dismissed:
// whatever its evaluations say it is.
export function statusFromEvaluations(assignments: SignableAssignment[]) {
  // An early manager signature must not complete a report with no members,
  // or prevent assigning members after a returned report is resubmitted.
  const members = assignments.filter((assignment) => assignment.evaluator?.role !== 'review_manager');
  const progress = signingProgress(members);
  const anyScored = assignments.some((assignment) => !!assignment.evaluation);
  if (progress.total === 0) return anyScored ? 'in_review' : 'submitted';
  if (progress.allSigned) return 'completed';
  return anyScored ? 'in_review' : 'assigned';
}
