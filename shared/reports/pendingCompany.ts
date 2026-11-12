// A self-registered company waiting for the review manager's decision.
export type PendingCompany = {
  id: string;
  name: string;
  registerNumber: string;
  createdAt: string;
  rejected: boolean;
  contact: { name: string; email: string; phone: string | null; position: string | null } | null;
  conclusion: { reportId: string; projectName: string | null; conclusionNumber: string | null; fileName: string; fileUrl: string } | null;
};
