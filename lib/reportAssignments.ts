type AssignmentEvaluation = {
  status?: string | null;
  signatureStatus?: string | null;
  signedAt?: Date | string | null;
  submittedAt?: Date | string | null;
} | null;

type AssignmentLike = {
  evaluatorUserId?: string | null;
  evaluator?: { id?: string | null } | null;
  assignedAt?: Date | string | null;
  submittedAt?: Date | string | null;
  evaluation?: AssignmentEvaluation;
};

function evaluatorKey(assignment: AssignmentLike) {
  return assignment.evaluatorUserId || assignment.evaluator?.id || null;
}

function timeValue(value?: Date | string | null) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime() || 0;
}

function activityTime(assignment: AssignmentLike) {
  return Math.max(
    timeValue(assignment.evaluation?.signedAt),
    timeValue(assignment.evaluation?.submittedAt),
    timeValue(assignment.submittedAt),
    timeValue(assignment.assignedAt),
  );
}

function qualityScore(assignment: AssignmentLike) {
  const signed = assignment.evaluation?.status === 'SIGNED' ? 4 : 0;
  const verified = assignment.evaluation?.signatureStatus === 'VERIFIED' ? 2 : 0;
  const evaluated = assignment.evaluation ? 1 : 0;
  return signed + verified + evaluated;
}

function signedTime(assignment: AssignmentLike) {
  return Math.max(
    timeValue(assignment.evaluation?.signedAt),
    timeValue(assignment.evaluation?.submittedAt),
    timeValue(assignment.submittedAt),
  );
}

function isBetterAssignment(candidate: AssignmentLike, existing: AssignmentLike) {
  const candidateQuality = qualityScore(candidate);
  const existingQuality = qualityScore(existing);
  if (candidateQuality !== existingQuality) return candidateQuality > existingQuality;

  const candidateSigned = candidate.evaluation?.status === 'SIGNED';
  const existingSigned = existing.evaluation?.status === 'SIGNED';
  if (candidateSigned && existingSigned) {
    const candidateTime = signedTime(candidate);
    const existingTime = signedTime(existing);
    if (candidateTime && existingTime && candidateTime !== existingTime) {
      return candidateTime < existingTime;
    }
  }

  return activityTime(candidate) > activityTime(existing);
}

export function uniqueAssignmentsByEvaluator<T extends AssignmentLike>(assignments: T[]) {
  const byEvaluator = new Map<string, T>();
  const withoutEvaluator: T[] = [];

  for (const assignment of assignments) {
    const key = evaluatorKey(assignment);
    if (!key) {
      withoutEvaluator.push(assignment);
      continue;
    }

    const existing = byEvaluator.get(key);
    if (!existing || isBetterAssignment(assignment, existing)) {
      byEvaluator.set(key, assignment);
    }
  }

  return [...byEvaluator.values(), ...withoutEvaluator].sort(
    (a, b) => timeValue(b.assignedAt) - timeValue(a.assignedAt),
  );
}
