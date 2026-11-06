import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { canAccessReport, getApiUser, unauthorized } from '@/lib/auth';
import { deleteUploads, droppedReferences } from '@/lib/db/storage';
import { notifyReportResubmitted } from '@/lib/reports/resubmitNotifications';
import { attachmentError } from '@/lib/reports/attachmentOwnership';
import { parseAttachments, serializeDocumentAttachments, serializeReportAttachments } from '@/lib/reports/attachments';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { scoresReleased, senderStatus } from '@/lib/reports/scoreRelease';
import { REPORT_CATEGORIES } from '@/lib/constants';
import { resolveAdministrativeLocation } from '@/lib/map/locationResolver';
import { submissionError } from '@/lib/reports/submitValidation';
import { findSubmitReportType, MISSING_TYPE_ERROR } from '@/lib/reports/reportTypes';
import { MAIN_DOCUMENT_ID } from '@/lib/reports/materials';
import { statusFromEvaluations } from '@/lib/reports/transitions';

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
    return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
  }
  if (!(await canAccessReport(user, report))) return unauthorized();
  // The sender gets the score only after the manager signed it off.
  if (user.role === 'sender' && !scoresReleased(report)) {
    return NextResponse.json({ ...report, status: senderStatus(report), finalScore: null });
  }
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
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }
    // Only the sender's own drafts and returned reports can be changed.
    if (!(await canAccessReport(user, existing)) || !['draft', 'needs_revision'].includes(existing.status)) {
      return unauthorized();
    }

    const data = await request.json();
    // Files already on the report may stay; new ones must be the company's own PDF uploads.
    const fileError = await attachmentError(
      data.fileUrl,
      user,
      parseAttachments(existing.fileUrl).map((file) => file.url),
    );
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    if ((data.title || '').trim() === GENERAL_EVALUATION_CONCLUSION_TITLE) {
      return NextResponse.json({ error: 'Ерөнхий үнэлгээний дүгнэлт илгээх хэсэг хаагдсан.' }, { status: 400 });
    }
    // A returned report is fixed and sent, never put back into drafts: that
    // would drop the reviewer's notes and hide it from the review queue.
    if (data.status === 'draft' && existing.status === 'needs_revision') {
      return NextResponse.json({ error: 'Буцаагдсан тайланг ноорог болгох боломжгүй. Засаад илгээнэ үү.' }, { status: 400 });
    }
    if (data.status !== 'draft') {
      // Reports filed under the older document lists have no main document row.
      const legacy =
        existing.status === 'needs_revision' &&
        !parseAttachments(existing.fileUrl).some((file) => file.materialId === MAIN_DOCUMENT_ID);
      const missing = submissionError(data, !legacy);
      if (missing) return NextResponse.json({ error: missing }, { status: 400 });
    }

    // Resolve the report type the same way create does.
    const reportType = await findSubmitReportType(data);
    if (!reportType) {
      return NextResponse.json({ error: MISSING_TYPE_ERROR }, { status: 400 });
    }

    const status = data.status === 'draft' ? 'draft' : 'submitted';
    const latitude = data.latitude != null ? parseFloat(String(data.latitude)) : null;
    const longitude = data.longitude != null ? parseFloat(String(data.longitude)) : null;
    const hasLocation = (latitude != null && longitude != null) || data.province || data.district || data.khoroo;
    const place = hasLocation ? await resolveAdministrativeLocation(latitude, longitude, data) : {};
    const locationData = {
      province: place.province || 'Тодорхойгүй',
      district: place.district || 'Тодорхойгүй',
      khoroo: place.khoroo || 'Тодорхойгүй',
      addressDetail: data.addressDetail || null,
      latitude,
      longitude,
    };
    // The sender's own company is the project implementer; the form does not ask for it.
    const senderCompany = user.company;
    if (!senderCompany) {
      return NextResponse.json({ error: 'Байгууллагын мэдээлэл олдсонгүй.' }, { status: 400 });
    }

    // Once evaluators are assigned, the type and category (which pick the
    // scoring sheet) stay as they were scored.
    const assignments = await dataStore.reportAssignment.findMany({
      where: { reportId: params.id },
      include: { evaluator: { select: { id: true, role: true } }, evaluation: true },
    });
    const scoringStarted = assignments.length > 0;

    const report = await dataStore.report.update({
      where: { id: params.id },
      data: {
        reportTypeId: scoringStarted ? existing.reportTypeId : reportType.id,
        senderCompanyId: senderCompany.id,
        title: data.title || 'Тайлан',
        description: data.description || null,
        fileUrl:
          data.attachmentKind === 'document'
            ? serializeDocumentAttachments(data.fileUrl)
            : serializeReportAttachments(data.fileUrl),
        reportCategory: scoringStarted
          ? existing.reportCategory
          : REPORT_CATEGORIES.includes(data.reportCategory)
          ? data.reportCategory
          : null,
        implementerName: senderCompany.name,
        implementerRegister: senderCompany.registerNumber,
        approvedDate: data.approvedDate ? new Date(data.approvedDate) : null,
        hasGreenery: data.hasGreenery === 'yes' ? true : data.hasGreenery === 'no' ? false : null,
        treeCount: data.hasGreenery === 'yes' && data.treeCount !== '' && data.treeCount != null ? parseInt(data.treeCount) : null,
        spentAmount: data.spentAmount !== '' && data.spentAmount != null ? parseInt(data.spentAmount) : null,
        // A fixed report goes back to where scoring stood.
        status: status === 'submitted' && scoringStarted ? statusFromEvaluations(assignments) : status,
        // Fixing a returned report clears the previous return reason.
        returnReason: null,
        returnRequestedBy: null,
        revisionItems: null,
        submittedAt: status === 'draft' ? null : new Date(),
        // A draft counts for the year it is actually sent in.
        ...(status === 'submitted' && existing.status === 'draft' ? { year: new Date().getFullYear() } : {}),
        ...(hasLocation
          ? {
              location: {
                upsert: { create: locationData, update: locationData },
              },
            }
          : {}),
      },
      include: { senderCompany: true },
    });

    // Files the sender took out of the report while editing are deleted for good.
    await deleteUploads(droppedReferences(parseAttachments(existing.fileUrl), parseAttachments(report.fileUrl)));

    // A returned report fixed through the full form: managers and its assigned
    // staff are told. A first submission from a draft goes to managers only.
    if (status === 'submitted' && existing.status === 'needs_revision') {
      try {
        await notifyReportResubmitted({ reportId: report.id, reportNumber: report.reportNumber, senderName: report.senderCompany.name });
      } catch (notifyError) {
        console.error('Failed to create resubmit notifications', notifyError);
      }
    } else if (status === 'submitted') {
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
              // A draft sent for the first time is a new report, not a resubmission.
              title: isConclusion ? 'Шинэ дүгнэлт ирлээ' : 'Шинэ тайлан ирлээ',
              message: isConclusion
                ? `${report.senderCompany.name}-аас "${report.title}" дүгнэлт ирлээ.`
                : `${report.senderCompany.name}-аас "${report.title}" тайлан хянуулахаар ирлээ.`,
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
    return NextResponse.json({ error: 'Тайлан хадгалахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}

// The sender deletes one of their own drafts, with its files. Only drafts:
// anything sent is part of the review record.
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getApiUser('sender');
    if (!user) return unauthorized();
    const report = await dataStore.report.findUnique({ where: { id: params.id } });
    if (!report || !(await canAccessReport(user, report))) {
      return NextResponse.json({ error: 'Ноорог олдсонгүй.' }, { status: 404 });
    }
    if (report.status !== 'draft') {
      return NextResponse.json({ error: 'Зөвхөн ноорог устгах боломжтой.' }, { status: 400 });
    }
    const where = { reportId: report.id };
    await dataStore.reportLocation.deleteMany({ where });
    await dataStore.activityLog.deleteMany({ where });
    await dataStore.notification.deleteMany({ where });
    await dataStore.report.deleteMany({ where: { id: report.id } });
    await deleteUploads(parseAttachments(report.fileUrl).map((file) => file.url));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[report delete] failed:', error);
    return NextResponse.json({ error: 'Ноорог устгахад алдаа гарлаа.' }, { status: 500 });
  }
}
