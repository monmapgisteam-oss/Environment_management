// The two report types the workflow knows, by their fixed slugs. The admin
// may rename a type, so plan / performance is read from the slug; a bare name
// is only a fallback for code that has nothing else.
export const PLAN_TYPE_SLUG = 'type-1';
export const PERFORMANCE_TYPE_SLUG = 'type-2';
export const CORE_TYPE_SLUGS = [PLAN_TYPE_SLUG, PERFORMANCE_TYPE_SLUG];

export type ReportTypeRef = { slug?: string | null; name?: string | null } | string | null | undefined;
export type ReportKind = 'plan' | 'performance';

export function reportKind(type: ReportTypeRef): ReportKind | null {
  if (!type) return null;
  if (typeof type !== 'string') {
    if (type.slug === PLAN_TYPE_SLUG) return 'plan';
    if (type.slug === PERFORMANCE_TYPE_SLUG) return 'performance';
  }
  const name = typeof type === 'string' ? type : type.name;
  if (name?.includes('Жилийн')) return 'plan';
  if (name?.includes('Биелэлт')) return 'performance';
  return null;
}

// Word used for the documents in a list. Plans (Жилийн төлөвлөгөө) are called
// БОМТ (Байгаль орчны менежментийн төлөвлөгөө); everything else is a тайлан.
export type ReportNoun = {
  // "тайлан" / "БОМТ" after a number or as a subject.
  one: string;
  // Title of a list: "тайлангууд" / "БОМТ-ууд".
  many: string;
  // Genitive at the start of a label: "Тайлангийн" / "БОМТ-ний".
  of: string;
};

export const REPORT_NOUN: ReportNoun = { one: 'тайлан', many: 'тайлангууд', of: 'Тайлангийн' };
export const PLAN_NOUN: ReportNoun = { one: 'БОМТ', many: 'БОМТ-ууд', of: 'БОМТ-ний' };

// Title of an incoming-list page, matching its menu item: plans and the
// unfiltered list are "БОМТ-ууд"; the performance-report list says so.
export function listTitleNoun(type: ReportTypeRef) {
  return reportKind(type) === 'performance' ? 'биелэлтийн тайлангууд' : PLAN_NOUN.many;
}

export function nounForReportType(type: ReportTypeRef): ReportNoun {
  return reportKind(type) === 'plan' ? PLAN_NOUN : REPORT_NOUN;
}

// Word for the document on the submit form: a plan is filled in as a
// "төлөвлөгөө", every other type as a "тайлан".
export type FormWord = { capital: string; of: string };

export function formWordForReportType(type: ReportTypeRef): FormWord {
  return reportKind(type) === 'plan'
    ? { capital: 'Төлөвлөгөө', of: 'Төлөвлөгөөний' }
    : { capital: 'Тайлан', of: 'Тайлангийн' };
}
