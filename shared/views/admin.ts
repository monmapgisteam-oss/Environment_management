import type { Broadcast } from '@shared/db/models';
import type { Payload } from '@shared/db/types';
import type { CompanyPoint } from '@shared/map/types';
import type { PendingCompany } from '@shared/reports/pendingCompany';

// Page views of the admin area. Keys are view paths under /api/views.

// A sent report on the admin dashboard: its type, company (the effective one
// for imported reports) and location. Drafts are private to their senders and
// never listed.
export type AdminReportRow = Payload<'report', { include: { reportType: true; senderCompany: true; location: true } }>;

// Setup the workflow needs and the service still lacks (lib/setupCheck).
export type AdminSetupProblem = { message: string; href: string };

// A company and the reports it sent (components/admin/CompaniesView).
export type AdminCompanyReport = {
  id: string;
  reportNumber: string;
  reportTypeName: string;
  title: string;
  implementerName: string | null;
  implementerRegister: string | null;
  approvedDate: string | null;
  submittedAt: string | null;
  status: string;
  finalScore: number | null;
  location: { addressDetail: string | null } | null;
};

export type AdminCompanyRow = {
  id: string;
  name: string;
  registerNumber: string;
  type: string;
  contacts: { name: string; email: string; phone: string | null; position: string | null }[];
  reports: AdminCompanyReport[];
};

// One scoring criterion and how many scores use it (components/admin/CriteriaManager).
export type AdminCriterionRow = {
  id: string;
  name: string;
  category: string | null;
  sheet: 'plan' | 'performance' | null;
  maxScore: number;
  sortOrder: number;
  isActive: boolean;
  scoreCount: number;
};

// One non-admin account (components/admin/UsersView). Never a password or PIN
// hash: only whether a signature PIN exists.
export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  role: string;
  company: { id: string; name: string; registerNumber: string; approvalStatus: 'pending' | 'approved' | 'rejected' | null } | null;
  isActive: boolean;
  mustChangePassword: boolean;
  hasSignature: boolean;
  openAssignments: number;
};

export type AdminReportTypeRow = Payload<'reportType', { include: { _count: { select: { reports: true } } } }>;

export interface AdminViews {
  // /admin (dashboard)
  admin: {
    reports: AdminReportRow[];
    companyCount: number;
    userCount: number;
    evaluatorCount: number;
    pendingCompanies: number;
    setupProblems: AdminSetupProblem[];
  };
  // /admin/companies
  'admin/companies': { rows: AdminCompanyRow[]; pending: PendingCompany[] };
  // /admin/criteria
  'admin/criteria': { criteria: AdminCriterionRow[] };
  // /admin/feedback: feedback messages, newest first, one per message.
  'admin/feedback': { feedback: { id: string; message: string; createdAt: Date }[] };
  // /admin/map: every report location with coordinates.
  'admin/map': { points: CompanyPoint[] };
  // /admin/notifications: active users each audience reaches, and the latest broadcasts.
  'admin/notifications': { counts: Record<string, number>; broadcasts: Broadcast[] };
  // /admin/settings
  'admin/settings': { reportTypes: AdminReportTypeRow[] };
  // /admin/users
  'admin/users': { users: AdminUserRow[] };
}
