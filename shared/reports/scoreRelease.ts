// Scores move in three signed steps: every evaluator signs their own scores,
// the manager checks them and signs the whole set, and only then does the
// sender see them. Reports finished before the manager step existed count as
// released once the signed scan was sent (a scan now needs the approval first).

type ReleaseFields = {
  status: string;
  scoresApprovedAt?: Date | null;
  signedScanUrl?: string | null;
};

export function scoresReleased(report: ReleaseFields) {
  return !!report.scoresApprovedAt || !!report.signedScanUrl;
}

// Status as the sender sees it: a scored report still reads "under review"
// until the manager has signed the scores off.
export function senderStatus(report: ReleaseFields) {
  if ((report.status === 'completed' || report.status === 'approved') && !scoresReleased(report)) return 'in_review';
  return report.status;
}
