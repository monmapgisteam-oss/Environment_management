import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

// The admin approves or rejects a self-registered sender company. Approval lets
// its users sign in and shows its conclusion to the review managers.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!(await getApiUser('admin'))) return unauthorized();
  const { id } = await props.params;
  const body = (await request.json().catch(() => null)) ?? {};
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'Үйлдэл буруу байна.' }, { status: 400 });
  }

  const company = await dataStore.company.findUnique({ where: { id }, include: { users: { select: { id: true } } } });
  if (!company || company.type !== 'sender') return NextResponse.json({ error: 'Байгууллага олдсонгүй.' }, { status: 404 });

  try {
    const approve = body.action === 'approve';
    await dataStore.company.update({ where: { id }, data: { approvalStatus: approve ? 'approved' : 'rejected' } });

    if (approve) {
      try {
        const [managers, conclusions] = await Promise.all([
          dataStore.user.findMany({ where: { role: 'review_manager' }, select: { id: true } }),
          dataStore.report.findMany({
            where: { senderCompanyId: id, title: GENERAL_EVALUATION_CONCLUSION_TITLE, status: { not: 'draft' } },
            select: { id: true, projectName: true },
          }),
        ]);
        await dataStore.notification.createMany({
          data: [
            ...company.users.map((user) => ({
              userId: user.id,
              reportId: null,
              title: 'Бүртгэл баталгаажлаа',
              message: `${company.name} байгууллагын бүртгэлийг системийн админ баталгаажууллаа.`,
            })),
            ...conclusions.flatMap((report) =>
              managers.map((manager) => ({
                userId: manager.id,
                reportId: report.id,
                title: 'Шинэ дүгнэлт ирлээ',
                message: `${company.name} "${report.projectName ?? ''}" төслийн ерөнхий үнэлгээний дүгнэлт илгээлээ.`,
              })),
            ),
          ],
        });
      } catch (notifyError) {
        console.error('[admin/companies] notification failed:', notifyError);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/companies] update failed:', error);
    return NextResponse.json({ error: 'Хадгалахад алдаа гарлаа.' }, { status: 500 });
  }
}
