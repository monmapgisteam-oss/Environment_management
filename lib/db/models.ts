// Application records stored in Convex. IDs survive migration from ArcGIS.
export type Company = {
  id: string;
  name: string;
  registerNumber: string;
  type: 'sender' | 'reviewer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  companyId: string | null;
  role: 'admin' | 'sender' | 'review_manager' | 'evaluator';
  phone: string | null;
  position: string | null;
  signaturePinHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportType = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Report = {
  id: string;
  reportNumber: string;
  reportTypeId: string;
  reportCategory: string | null;
  senderCompanyId: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  implementerName: string | null;
  implementerRegister: string | null;
  approvedDate: Date | null;
  hasGreenery: boolean | null;
  treeCount: number | null;
  spentAmount: number | null;
  status: 'draft' | 'submitted' | 'assigned' | 'in_review' | 'return_requested' | 'needs_revision' | 'completed' | 'approved' | 'rejected';
  finalScore: number | null;
  returnReason: string | null;
  returnRequestedBy: string | null;
  year: number;
  submittedAt: Date | null;
  arcgisGlobalId: string | null;
  signedScanUrl: string | null;
  signedScanName: string | null;
  signedScanUploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportLocation = {
  id: string;
  reportId: string;
  province: string;
  district: string;
  khoroo: string;
  addressDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  geometryType: string | null;
  geometryFileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EvaluationCriterion = {
  id: string;
  name: string;
  category: string | null;
  maxScore: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportAssignment = {
  id: string;
  reportId: string;
  evaluatorUserId: string;
  assignedByUserId: string;
  status: 'pending' | 'submitted';
  deadline: Date | null;
  assignedAt: Date;
  submittedAt: Date | null;
};

export type Evaluation = {
  id: string;
  assignmentId: string;
  reportId: string;
  totalScore: number;
  comment: string | null;
  signature: string | null;
  status: string;
  signatureStatus: string;
  signedAt: Date | null;
  signatureId: string | null;
  documentHash: string | null;
  lockedAt: Date | null;
  arcgisGlobalId: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type EvaluationScore = {
  id: string;
  evaluationId: string;
  criterionId: string;
  score: number;
};

export type Notification = {
  id: string;
  userId: string;
  reportId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

export type ActivityLog = {
  id: string;
  userId: string;
  reportId: string | null;
  action: string;
  description: string | null;
  createdAt: Date;
};

export type Upload = { id: string; ownerUserId: string; name: string; storageId: string | null; createdAt: Date };

export type Models = {
  company: Company;
  user: User;
  reportType: ReportType;
  report: Report;
  reportLocation: ReportLocation;
  evaluationCriterion: EvaluationCriterion;
  reportAssignment: ReportAssignment;
  evaluation: Evaluation;
  evaluationScore: EvaluationScore;
  notification: Notification;
  activityLog: ActivityLog;
  upload: Upload;
};

export type Relations = {
  company: {
    users: { model: "user"; many: true; nullable: false };
    reports: { model: "report"; many: true; nullable: false };
  };
  user: {
    company: { model: "company"; many: false; nullable: true };
    notifications: { model: "notification"; many: true; nullable: false };
    evaluatorAssignments: { model: "reportAssignment"; many: true; nullable: false };
    managerAssignments: { model: "reportAssignment"; many: true; nullable: false };
    activityLogs: { model: "activityLog"; many: true; nullable: false };
  };
  reportType: {
    reports: { model: "report"; many: true; nullable: false };
  };
  report: {
    reportType: { model: "reportType"; many: false; nullable: false };
    senderCompany: { model: "company"; many: false; nullable: false };
    location: { model: "reportLocation"; many: false; nullable: true };
    assignments: { model: "reportAssignment"; many: true; nullable: false };
    evaluations: { model: "evaluation"; many: true; nullable: false };
    notifications: { model: "notification"; many: true; nullable: false };
    activityLogs: { model: "activityLog"; many: true; nullable: false };
  };
  reportLocation: {
    report: { model: "report"; many: false; nullable: false };
  };
  evaluationCriterion: {
    scores: { model: "evaluationScore"; many: true; nullable: false };
  };
  reportAssignment: {
    report: { model: "report"; many: false; nullable: false };
    evaluator: { model: "user"; many: false; nullable: false };
    assignedBy: { model: "user"; many: false; nullable: false };
    evaluation: { model: "evaluation"; many: false; nullable: true };
  };
  evaluation: {
    assignment: { model: "reportAssignment"; many: false; nullable: false };
    report: { model: "report"; many: false; nullable: false };
    scores: { model: "evaluationScore"; many: true; nullable: false };
  };
  evaluationScore: {
    evaluation: { model: "evaluation"; many: false; nullable: false };
    criterion: { model: "evaluationCriterion"; many: false; nullable: false };
  };
  notification: {
    user: { model: "user"; many: false; nullable: false };
    report: { model: "report"; many: false; nullable: true };
  };
  activityLog: {
    user: { model: "user"; many: false; nullable: false };
    report: { model: "report"; many: false; nullable: true };
  };
  upload: {
  };
};
