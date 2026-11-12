// The data contract between the backend's page views (backend/src/views) and
// the frontend pages that render them. Each key is the view's path under
// /api/views; ":name" segments are URL parameters. The area files declare
// their views' data types.
//
// Add a view: declare its data type in the area file, implement it in
// backend/src/views/<area> with defineView, and load it in the page with
// loadView (frontend/lib/api/server.ts).

import type { AdminViews } from '@shared/views/admin';
import type { EvaluatorViews } from '@shared/views/evaluator';
import type { ReportViews } from '@shared/views/report';
import type { ReviewerViews } from '@shared/views/reviewer';
import type { SenderViews } from '@shared/views/sender';
import type { PublicUser } from '@shared/views/user';

export type { PublicUser } from '@shared/views/user';

export interface Views extends SenderViews, ReviewerViews, EvaluatorViews, AdminViews, ReportViews {
  shell: ShellView;
}

// Data for the signed-in page frame (sidebar submenu of report types).
export type ShellView = { reportTypes: { id: string; name: string; slug: string }[] };

// The signed-in user (GET /api/auth/me).
export type MeResponse = {
  // The user, approved or not; null when signed out.
  user: PublicUser | null;
  // false for a sender whose company the admin has not approved (yet).
  approved: boolean;
};

export type ViewName = keyof Views;
