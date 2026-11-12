import type { ComponentProps } from 'react';
import type SignatureBadge from '@/components/signature/SignatureBadge';

// The detail page's data shapes come with its page view (shared/views/report.ts).
export type { AssignedStaffMember, EvaluationSummary, ReportDetail, ScoreApproval } from '@shared/views/report';

export type ViewerRole = ComponentProps<typeof SignatureBadge>['viewerRole'];
