import dataStore from '@/lib/db';
import { PERFORMANCE_TYPE_SLUG, PLAN_TYPE_SLUG, reportKind, type ReportKind } from '@shared/reports/terms';

export const MISSING_TYPE_ERROR = 'Тайлангийн төрөл тохируулагдаагүй байна. Админд хандана уу.';

const SLUG_FOR_KIND: Record<ReportKind, string> = { plan: PLAN_TYPE_SLUG, performance: PERFORMANCE_TYPE_SLUG };

// The report type a sender's form asks for, by its fixed slug. The form sends
// `reportTypeSlug`; an older client sends the type's name. Never falls back to
// "any active type": a plan filed under the wrong type is scored on the wrong
// sheet, so a missing type is an error the admin must fix.
export async function findSubmitReportType(data: { reportTypeSlug?: unknown; reportType?: unknown }) {
  const requested = typeof data.reportTypeSlug === 'string' ? data.reportTypeSlug : null;
  const kind = requested === PLAN_TYPE_SLUG ? 'plan' : requested === PERFORMANCE_TYPE_SLUG ? 'performance' : reportKind(typeof data.reportType === 'string' ? data.reportType : null);
  if (!kind) return null;
  return dataStore.reportType.findFirst({ where: { slug: SLUG_FOR_KIND[kind] } });
}

export async function findReportTypeByKind(kind: ReportKind) {
  return dataStore.reportType.findFirst({ where: { slug: SLUG_FOR_KIND[kind] } });
}
