import { NextResponse } from '@/http/next';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { serializeDocumentAttachments, serializeReportAttachments } from '@shared/reports/attachments';
import { attachmentError } from '@/lib/reports/attachmentOwnership';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { REPORT_CATEGORIES } from '@shared/constants';
import { withNextReportNumber } from '@/lib/reports/reportNumber';
import { resolveAdministrativeLocation } from '@shared/map/locationResolver';
import { submissionError } from '@/lib/reports/submitValidation';
import { findSubmitReportType, MISSING_TYPE_ERROR } from '@/lib/reports/reportTypes';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Attach the report to the logged-in sender's own company — not just
    // "whichever sender company happens to be first in the table", which
    // silently misfiled every submission once a second sender company existed.
    const currentUser = await getApiUser('sender');
    if (!currentUser || !currentUser.companyId) return unauthorized();
    if ((data.title || '').trim() === GENERAL_EVALUATION_CONCLUSION_TITLE) {
      return NextResponse.json({ error: 'Ерөнхий үнэлгээний дүгнэлт илгээх хэсэг хаагдсан.' }, { status: 400 });
    }
    const fileError = await attachmentError(data.fileUrl, currentUser);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    // A draft may be incomplete; a report that is sent may not.
    if (data.status !== 'draft') {
      const missing = submissionError(data);
      if (missing) return NextResponse.json({ error: missing }, { status: 400 });
    }

    // The sender's own company is the project implementer; the form does not ask for it.
    const senderCompany = currentUser.company;
    if (!senderCompany) {
      return NextResponse.json({ error: 'Байгууллагын мэдээлэл олдсонгүй.' }, { status: 400 });
    }

    const reportType = await findSubmitReportType(data);
    if (!reportType) {
      return NextResponse.json({ error: MISSING_TYPE_ERROR }, { status: 400 });
    }
    const reportTypeId = reportType.id;

    const status = data.status === 'draft' ? 'draft' : 'submitted';
    const latitude = data.latitude != null ? parseFloat(String(data.latitude)) : null;
    const longitude = data.longitude != null ? parseFloat(String(data.longitude)) : null;
    const hasLocation = (latitude != null && longitude != null) || data.province || data.district || data.khoroo;
    const place = hasLocation ? await resolveAdministrativeLocation(latitude, longitude, data) : {};

    // The number is always assigned here, never taken from the form.
    const report = await withNextReportNumber((reportNumber) =>
      dataStore.report.create({
        data: {
          reportNumber,
          reportTypeId,
          senderCompanyId: senderCompany.id,
          title: data.title || 'Тайлан',
          description: data.description || null,
          fileUrl:
            data.attachmentKind === 'document'
              ? serializeDocumentAttachments(data.fileUrl)
              : serializeReportAttachments(data.fileUrl),
          reportCategory: REPORT_CATEGORIES.includes(data.reportCategory) ? data.reportCategory : null,
          implementerName: senderCompany.name,
          implementerRegister: senderCompany.registerNumber,
          approvedDate: data.approvedDate ? new Date(data.approvedDate) : null,
          hasGreenery: data.hasGreenery === 'yes' ? true : data.hasGreenery === 'no' ? false : null,
          treeCount: data.hasGreenery === 'yes' && data.treeCount !== '' && data.treeCount != null ? parseInt(data.treeCount) : null,
          spentAmount: data.spentAmount !== '' && data.spentAmount != null ? parseInt(data.spentAmount) : null,
          status,
          year: new Date().getFullYear(),
          submittedAt: status === 'draft' ? null : new Date(),
          ...(hasLocation ? {
            location: {
              create: {
                province: place.province || 'Тодорхойгүй',
                district: place.district || 'Тодорхойгүй',
                khoroo: place.khoroo || 'Тодорхойгүй',
                addressDetail: data.addressDetail || null,
                latitude,
                longitude,
              },
            },
          } : {}),
        },
      }),
    );

    // Notify the review manager(s) that a new report is waiting to be reviewed.
    // Drafts stay private to the sender, so only notify on real submissions.
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
              title: isConclusion ? 'Шинэ дүгнэлт ирлээ' : 'Шинэ тайлан ирлээ',
              message: isConclusion
                ? `${senderCompany.name}-аас "${report.title}" дүгнэлт ирлээ.`
                : `${senderCompany.name}-аас "${report.title}" тайлан хянуулахаар ирлээ.`,
            })),
          });
        }
      } catch (notifyError) {
        // A notification failure must not fail the submission itself.
        console.error('Failed to create reviewer notification', notifyError);
      }
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Тайлан хадгалахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
