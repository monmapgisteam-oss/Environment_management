import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';

// The admin approves or rejects a self-registered sender company. Approval lets
// its users sign in.
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
      // Managers already heard about the conclusion when the company signed up.
      try {
        await dataStore.notification.createMany({
          data: company.users.map((user) => ({
            userId: user.id,
            reportId: null,
            title: 'Бүртгэл баталгаажлаа',
            message: `${company.name} байгууллагын бүртгэлийг системийн админ баталгаажууллаа.`,
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
