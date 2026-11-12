import { NextResponse } from '@/http/next';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';

// The review manager approves or rejects a self-registered sender company
// after checking its conclusion. Approval lets its users sign in. A rejection
// needs a reason: it is posted as a comment on the company's conclusion, which
// the sender sees on the registration page.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const manager = await getApiUser('review_manager');
  if (!manager) return unauthorized();
  const { id } = await props.params;
  const body = (await request.json().catch(() => null)) ?? {};
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'Үйлдэл буруу байна.' }, { status: 400 });
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 2000) : '';
  if (body.action === 'reject' && !reason) {
    return NextResponse.json({ error: 'Татгалзсан шалтгааныг бичнэ үү.' }, { status: 400 });
  }

  const company = await dataStore.company.findUnique({ where: { id }, include: { users: { select: { id: true } } } });
  if (!company || company.type !== 'sender') return NextResponse.json({ error: 'Байгууллага олдсонгүй.' }, { status: 404 });

  try {
    const approve = body.action === 'approve';
    await dataStore.company.update({ where: { id }, data: { approvalStatus: approve ? 'approved' : 'rejected' } });

    if (!approve) {
      try {
        const conclusion = await dataStore.report.findFirst({
          where: { senderCompanyId: id, title: GENERAL_EVALUATION_CONCLUSION_TITLE },
          select: { id: true },
        });
        if (conclusion) {
          await dataStore.reportComment.create({
            data: { reportId: conclusion.id, userId: manager.id, authorName: manager.name, authorRole: 'review_manager', body: `Татгалзсан шалтгаан: ${reason}` },
          });
        }
        await dataStore.notification.createMany({
          data: company.users.map((user) => ({
            userId: user.id,
            reportId: conclusion?.id ?? null,
            title: 'Бүртгэл татгалзагдлаа',
            message: `Шалтгаан: ${reason} Засаад дахин илгээнэ үү.`,
          })),
        });
      } catch (notifyError) {
        console.error('[admin/companies] rejection note failed:', notifyError);
      }
    }

    if (approve) {
      // The managers already heard about the conclusion when the company signed up.
      try {
        await dataStore.notification.createMany({
          data: company.users.map((user) => ({
            userId: user.id,
            reportId: null,
            title: 'Бүртгэл баталгаажлаа',
            message: `${company.name} байгууллагын бүртгэлийг хянах байгууллага баталгаажууллаа. Одоо БОМТ илгээх боломжтой.`,
          })),
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
