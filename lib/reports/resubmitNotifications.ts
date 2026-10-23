import dataStore from '@/lib/db';

// A returned report came back from the sender: tell every review manager and
// every staff member assigned to it, so the request that sent it back can be
// checked again. `fixed` lists the sections the sender fixed, when known.
export async function notifyReportResubmitted(params: {
  reportId: string;
  reportNumber: string;
  senderName: string;
  fixed?: string[];
}) {
  const { reportId, reportNumber, senderName, fixed = [] } = params;
  const [managers, assignments] = await Promise.all([
    dataStore.user.findMany({ where: { role: 'review_manager' }, select: { id: true } }),
    dataStore.reportAssignment.findMany({ where: { reportId }, select: { evaluatorUserId: true } }),
  ]);
  const managerIds = new Set(managers.map((manager) => manager.id));
  const staffIds = new Set(assignments.map((assignment) => assignment.evaluatorUserId).filter((id) => !managerIds.has(id)));
  const what = fixed.length ? ` Засагдсан хэсэг: ${fixed.join('; ')}` : '';

  const data = [
    ...[...managerIds].map((userId) => ({
      userId,
      reportId,
      title: 'Тайлан засагдаж ирлээ',
      message: `${senderName} "${reportNumber}" тайланг засаж дахин илгээлээ.${what}`.slice(0, 1000),
    })),
    ...[...staffIds].map((userId) => ({
      userId,
      reportId,
      title: 'Танд оноогдсон тайлан засагдаж ирлээ',
      message: `${senderName} "${reportNumber}" тайланг засаж дахин илгээлээ. Засварыг шалгаад үнэлгээгээ хянана уу.${what}`.slice(0, 1000),
    })),
  ];
  if (data.length > 0) await dataStore.notification.createMany({ data });
}
