import dataStore from '@/lib/db';
import { canAccessReport } from '@/lib/auth';
import { signSections } from '@/lib/reports/reportSections';
import { parseAttachments } from '@shared/reports/attachments';
import { documentRows } from '@shared/reports/materials';
import { filesOfSection } from '@shared/reports/revisions';
import { defineView } from '../define';
import { forSender } from '../mask';

// Fix a returned report: the reviewer's comments on the criteria that fell
// short, and the report's documents (with short-lived links) to replace.
export default defineView({
  name: 'sender/revise/:id',
  roles: ['sender'],
  async load({ user, params }) {
    const found = await dataStore.report.findUnique({ where: { id: params.id }, include: { reportType: true } });
    if (!found || !(await canAccessReport(user, found))) return { report: null, documents: [] };

    const report = forSender(found);
    const view = {
      id: report.id,
      reportNumber: report.reportNumber,
      title: report.title,
      status: report.status,
      returnReason: report.returnReason,
      revisionItems: report.revisionItems,
      reportType: report.reportType,
    };
    if (report.status !== 'needs_revision') return { report: view, documents: [] };

    const attachments = parseAttachments(report.fileUrl);
    const documents = await signSections(
      documentRows(report.reportType).map((row) => {
        const key = `material:${row.id}`;
        return { key, label: row.label, group: 'Бичиг баримт', files: filesOfSection(attachments, key) };
      }),
    );
    return { report: view, documents };
  },
});
