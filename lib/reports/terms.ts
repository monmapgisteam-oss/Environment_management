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
export function listTitleNoun(reportTypeName: string | null | undefined) {
  return reportTypeName?.includes('Биелэлт') ? 'биелэлтийн тайлангууд' : PLAN_NOUN.many;
}

export function nounForReportType(reportTypeName: string | null | undefined): ReportNoun {
  return reportTypeName?.includes('Жилийн') ? PLAN_NOUN : REPORT_NOUN;
}
