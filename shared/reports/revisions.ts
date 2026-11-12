import type { ReportTypeRef } from '@shared/reports/terms';
import type { Attachment } from '@shared/reports/attachments';
import { materialsFor, materialsTitle } from '@shared/reports/materials';

// When a report goes back to the sender, the reviewer picks the scoring
// criteria that fall short, each with its own comment (`score:<id>` items).
// The sender reads them and sends a corrected report and Хавсралт
// (/sender/revise/<id>).
//
// File sections, used when the sender replaces files:
//   criterion:<id>  evidence for a scoring criterion (older reports)
//   material:<id>   a document (lib/reports/materials.ts)
//   general         the other attached files

export type RevisionItem = { key: string; label: string; comment: string };

export type ReportSection = {
  key: string;
  label: string;
  // Group the row belongs to, shown as a small heading.
  group: string;
  files: Attachment[];
};

type CriterionLike = { id: string; name: string };

const GENERAL_KEY = 'general';
const MAX_COMMENT = 1000;

// Files stored under a section, by the ids the submit form saved on them.
export function filesOfSection(attachments: Attachment[], key: string): Attachment[] {
  if (key === GENERAL_KEY) return attachments.filter((file) => !file.criterionId && !file.materialId);
  const [kind, id] = splitKey(key);
  if (kind === 'criterion') return attachments.filter((file) => file.criterionId === id);
  if (kind === 'material') return attachments.filter((file) => file.materialId === id);
  return [];
}

// What a reviewer can point at when returning a report: the criteria of the
// sheet it is scored on.
export function criteriaSections(criteria: CriterionLike[]): ReportSection[] {
  return criteria.map((criterion) => ({
    key: `score:${criterion.id}`,
    label: criterion.name,
    group: 'Үнэлгээний шалгуур',
    files: [],
  }));
}

function splitKey(key: string): [string, string] {
  const at = key.indexOf(':');
  return at < 0 ? [key, ''] : [key.slice(0, at), key.slice(at + 1)];
}

// Every upload section of a report, in the order of the submit form, with the
// files currently in it. The form no longer asks for evidence per criterion, so
// a criterion shows only when an older report still carries files under it.
export function reportSections(params: {
  reportType: ReportTypeRef;
  reportCategory: string | null | undefined;
  criteria: CriterionLike[];
  attachments: Attachment[];
}): ReportSection[] {
  const { reportType, reportCategory, criteria, attachments } = params;
  const sections: ReportSection[] = [];
  const materialGroup = materialsTitle(reportType);
  for (const material of materialsFor(reportType, reportCategory)) {
    const key = `material:${material.id}`;
    sections.push({ key, label: material.label, group: materialGroup, files: filesOfSection(attachments, key) });
  }
  for (const criterion of criteria) {
    const key = `criterion:${criterion.id}`;
    const files = filesOfSection(attachments, key);
    if (files.length > 0) {
      sections.push({ key, label: criterion.name, group: 'Үнэлгээний шалгуурын нотлох файл', files });
    }
  }
  // Files saved under a row the form no longer has (an older material list)
  // still get a section, so they can be flagged and replaced.
  const known = new Set(sections.map((section) => section.key));
  const leftover = [
    ...new Set(
      attachments
        .map((file) => (file.criterionId ? `criterion:${file.criterionId}` : file.materialId ? `material:${file.materialId}` : null))
        .filter((key): key is string => !!key && !known.has(key)),
    ),
  ];
  leftover.forEach((key, index) => {
    sections.push({ key, label: `Өмнөх хавсралт ${index + 1}`, group: 'Бусад', files: filesOfSection(attachments, key) });
  });
  sections.push({ key: GENERAL_KEY, label: 'Бусад хавсралт', group: 'Бусад', files: filesOfSection(attachments, GENERAL_KEY) });
  return sections;
}

export function parseRevisionItems(value: string | null | undefined): RevisionItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RevisionItem =>
        !!item && typeof item.key === 'string' && typeof item.label === 'string' && typeof item.comment === 'string',
    );
  } catch {
    return [];
  }
}

// Keeps only items for sections the report has, with a comment, one per
// section; labels come from the section so a client cannot rename them.
export function cleanRevisionItems(input: unknown, sections: Pick<ReportSection, 'key' | 'label'>[]): RevisionItem[] {
  if (!Array.isArray(input)) return [];
  const labels = new Map(sections.map((section) => [section.key, section.label]));
  const seen = new Set<string>();
  const items: RevisionItem[] = [];
  for (const raw of input) {
    const key = typeof raw?.key === 'string' ? raw.key : '';
    const comment = typeof raw?.comment === 'string' ? raw.comment.trim().slice(0, MAX_COMMENT) : '';
    const label = labels.get(key);
    if (!label || !comment || seen.has(key)) continue;
    seen.add(key);
    items.push({ key, label, comment });
  }
  return items;
}

export function serializeRevisionItems(items: RevisionItem[]): string | null {
  return items.length ? JSON.stringify(items) : null;
}

// The report's files after the sender fixed the flagged sections: files of a
// fixed section are replaced by the ones kept plus the new uploads; all other
// files stay as they were. `kept` may only name files already in that section.
export function applySectionFixes(
  attachments: Attachment[],
  fixes: { key: string; keepUrls: string[]; added: Attachment[] }[],
): Attachment[] {
  const fixedKeys = new Set(fixes.map((fix) => fix.key));
  const untouched = attachments.filter((file) => ![...fixedKeys].some((key) => filesOfSection([file], key).length > 0));
  const result = [...untouched];
  for (const fix of fixes) {
    const keep = new Set(fix.keepUrls);
    result.push(...filesOfSection(attachments, fix.key).filter((file) => keep.has(file.url)));
    const [kind, id] = splitKey(fix.key);
    for (const file of fix.added) {
      result.push({
        url: file.url,
        name: file.name,
        ...(kind === 'criterion' ? { criterionId: id } : {}),
        ...(kind === 'material' ? { materialId: id } : {}),
      });
    }
  }
  return result;
}

// A section with a short-lived view link for each file (signed by the backend).
export type SignedSectionFile = Attachment & { viewUrl: string };
export type SignedReportSection = Omit<ReportSection, 'files'> & { files: SignedSectionFile[] };
