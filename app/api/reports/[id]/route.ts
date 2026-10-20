import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { canAccessReport, getApiUser, unauthorized } from '@/lib/auth';
import { serializeDocumentAttachments, serializeReportAttachments } from '@/lib/reports/attachments';
import { findSenderCompanyByRegister } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { REPORT_CATEGORIES } from '@/lib/constants';

// Returns a single report with everything the sender's edit form needs to
// pre-fill (type, location, attachments).
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getApiUser();
  if (!user) return unauthorized();
  const report = await dataStore.report.findUnique({
    where: { id: params.id },
    include: { reportType: true, location: true },
  });
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  if (!(await canAccessReport(user, report))) return unauthorized();
  return NextResponse.json(report);
}

// Updates a returned/draft report when the sender fixes it and resubmits. Clears
// the return flags and notifies the review manager(s) of the resubmission.
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getApiUser('sender');
    if (!user) return unauthorized();
    const existing = await dataStore.report.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    // Only the sender's own drafts and returned reports can be changed.
    if (!(await canAccessReport(user, existing)) || !['draft', 'needs_revision'].includes(existing.status)) {
      return unauthorized();
    }

    const data = await request.json();
    if ((data.title || '').trim() === GENERAL_EVALUATION_CONCLUSION_TITLE) {
      return NextResponse.json({ error: 'Ерөнхий үнэлгээний дүгнэлт илгээх хэсэг хаагдсан.' }, { status: 400 });
    }

    // Resolve the (possibly changed) report type the same way create does.
    const typeValue = data.reportType?.trim() || '';
    let reportType = typeValue
      ? await dataStore.reportType.findFirst({
          where: { OR: [{ id: typeValue }, { slug: typeValue }, { name: typeValue }] },
        })
      : null;
    if (!reportType) {
      reportType = await dataStore.reportType.findFirst({ where: { isActive: true } });
    }
    if (!reportType) {
      return NextResponse.json({ error: 'No report type found' }, { status: 400 });
    }

    const status = data.status === 'draft' ? 'draft' : 'submitted';
    const hasLocation =
      (data.latitude != null && data.longitude != null) || data.province || data.district || data.khoroo;
    const matchedCompany = await findSenderCompanyByRegister(data.implementerRegister);

    const report = await dataStore.report.update({
      where: { id: params.id },
      data: {
        reportTypeId: reportType.id,
        ...(matchedCompany ? { senderCompanyId: matchedCompany.id } : {}),
        title: data.title || 'Тайлан',
        description: data.description || null,
        fileUrl:
          data.attachmentKind === 'document'
            ? serializeDocumentAttachments(data.fileUrl)
            : serializeReportAttachments(data.fileUrl),
        reportCategory: REPORT_CATEGORIES.includes(data.reportCategory) ? data.reportCategory : null,
        implementerName: data.implementerName || null,
        implementerRegister: data.implementerRegister?.trim() || null,
        approvedDate: data.approvedDate ? new Date(data.approvedDate) : null,
        hasGreenery: data.hasGreenery === 'yes' ? true : data.hasGreenery === 'no' ? false : null,
        treeCount: data.hasGreenery === 'yes' && data.treeCount !== '' && data.treeCount != null ? parseInt(data.treeCount) : null,
        spentAmount: data.spentAmount !== '' && data.spentAmount != null ? parseInt(data.spentAmount) : null,
        status,
        // Fixing a returned report clears the previous return reason.
        returnReason: null,
        returnRequestedBy: null,
        submittedAt: status === 'draft' ? null : new Date(),
        ...(hasLocation
          ? {
              location: {
                upsert: {
                  create: {
                    province: data.province || 'Тодорхойгүй',
                    district: data.district || 'Тодорхойгүй',
                    khoroo: data.khoroo || 'Тодорхойгүй',
                    addressDetail: data.addressDetail || null,
                    latitude: data.latitude != null ? parseFloat(String(data.latitude)) : null,
                    longitude: data.longitude != null ? parseFloat(String(data.longitude)) : null,
                  },
                  update: {
                    province: data.province || 'Тодорхойгүй',
                    district: data.district || 'Тодорхойгүй',
                    khoroo: data.khoroo || 'Тодорхойгүй',
                    addressDetail: data.addressDetail || null,
                    latitude: data.latitude != null ? parseFloat(String(data.latitude)) : null,
                    longitude: data.longitude != null ? parseFloat(String(data.longitude)) : null,
                  },
                },
              },
            }
          : {}),
      },
      include: { senderCompany: true },
    });

    // Notify managers that a previously returned report has been resubmitted.
    if (status === 'submitted') {
      try {
        const isConclusion = report.title === GENERAL_EVALUATION_CONCLUSION_TITLE;
        const managers = await dataStore.user.findMany({
          where: { role: 'review_manager' },
          select: { id: true },
        });
        if (managers.length > 0) {
          await dataStore.notification.createMany({
            data: managers.map((manager) => ({
              userId: manager.id,
              reportId: report.id,
              title: isConclusion ? 'Дүгнэлт дахин ирлээ' : 'Тайлан дахин ирлээ',
              message: isConclusion
                ? `${report.senderCompany.name}-аас "${report.title}" дүгнэлтийг дахин илгээлээ.`
                : `${report.senderCompany.name}-аас "${report.title}" тайланг засаж дахин илгээлээ.`,
            })),
          });
        }
      } catch (notifyError) {
        console.error('Failed to create reviewer notification', notifyError);
      }
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
