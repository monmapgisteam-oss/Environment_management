export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import dataStore from "@/lib/db";
import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/auth";
import { materializeSurveyReportByObjectId } from "@/lib/survey/reports";
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from "@/lib/reports/conclusions";

async function resolveAssignableReportId(reportId: string) {
  const match = /^survey-(\d+)$/.exec(reportId);
  if (!match) return reportId;
  const report = await materializeSurveyReportByObjectId(Number(match[1]));
  return report.id;
}

export async function POST(request: Request) {
  try {
    const current = await getApiUser("review_manager");
    if (!current) return unauthorized();

    const data = await request.json();
    const rawReportId = String(data.reportId || "");
    const reportId: string = rawReportId ? await resolveAssignableReportId(rawReportId) : "";
    const evaluatorIds: string[] = Array.from(new Set((data.evaluators || []).filter(Boolean)));

    if (!reportId || evaluatorIds.length === 0) {
      return NextResponse.json(
        { error: "Тайлан болон гишүүн сонгоно уу." },
        { status: 400 },
      );
    }

    const targetReport = await dataStore.report.findUnique({
      where: { id: reportId },
      select: { title: true },
    });
    if (!targetReport || targetReport.title === GENERAL_EVALUATION_CONCLUSION_TITLE) {
      return NextResponse.json(
        { error: "Ерөнхий үнэлгээний дүгнэлт нь оноох тайлан биш." },
        { status: 400 },
      );
    }

    const assignedByUserId = current.id;

    // Don't assign the same staff member to a report twice.
    const existing = await dataStore.reportAssignment.findMany({
      where: { reportId, evaluatorUserId: { in: evaluatorIds } },
      include: { evaluation: true },
    });
    const existingIds = new Set(existing.map((assignment) => assignment.evaluatorUserId));
    const toAssign = evaluatorIds.filter((id) => !existingIds.has(id));

    const deadline = data.deadline
      ? new Date(data.deadline)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (toAssign.length > 0) {
      await dataStore.reportAssignment.createMany({
        data: toAssign.map((evaluatorUserId) => ({
          reportId,
          evaluatorUserId,
          assignedByUserId,
          status: "pending",
          deadline,
        })),
      });

      const report = await dataStore.report.update({
        where: { id: reportId },
        data: { status: "assigned" },
      });

      // Let each newly assigned staff member know they have work to do.
      await dataStore.notification.createMany({
        data: toAssign.map((userId) => ({
          userId,
          reportId,
          title: "Танд тайлан оноогдлоо",
          message: `"${report.title}" тайланд үнэлгээ хийх үүрэг даалгавар ирлээ.`,
        })),
      });

      // Confirm the distribution back to the manager who made it.
      const assignedStaff = await dataStore.user.findMany({
        where: { id: { in: toAssign } },
        select: { name: true },
      });
      const staffNames = assignedStaff.map((s) => s.name).join(", ");
      await dataStore.notification.create({
        data: {
          userId: assignedByUserId,
          reportId,
          title: "Тайлан амжилттай оноогдлоо",
          message: `Та ${staffNames}-д "${report.title}" тайланг оноож өглөө.`,
        },
      });
    }

    return NextResponse.json(
      { success: true, assigned: toAssign.length },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to assign evaluators" },
      { status: 500 },
    );
  }
}
