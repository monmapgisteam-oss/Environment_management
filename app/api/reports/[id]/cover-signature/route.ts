import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import dataStore from '@/lib/db';
import { verifyPin } from '@/lib/auth/signature';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'review_manager' && user.role !== 'evaluator')) {
      return NextResponse.json({ error: 'Гарын үсэг баталгаажуулах эрхгүй байна.' }, { status: 403 });
    }

    const { signature } = await request.json();
    const numericSignature = typeof signature === 'string' ? signature.trim() : '';
    if (!/^\d+$/.test(numericSignature)) {
      return NextResponse.json({ error: 'Тоон гарын үсгээ зөв оруулна уу.' }, { status: 400 });
    }

    const report = await dataStore.report.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!report) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }

    if (user.role === 'evaluator') {
      const assignment = await dataStore.reportAssignment.findFirst({
        where: { reportId: params.id, evaluatorUserId: user.id },
        select: { id: true },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Танд энэ тайлан оноогдоогүй байна.' }, { status: 403 });
      }
    }

    const existing = await dataStore.activityLog.findFirst({
      where: {
        reportId: params.id,
        userId: user.id,
        action: 'cover_signature_verified',
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'Гарын үсэг аль хэдийн баталгаажсан байна.' }, { status: 409 });
    }

    // Only the system-issued signature password signs; none is enrolled here.
    if (!user.signaturePinHash) {
      return NextResponse.json(
        { error: 'Танд тоон гарын үсэг олгогдоогүй байна. Админд хандаж гарын үсгийн нууц үгээ авна уу.' },
        { status: 400 },
      );
    }
    if (!verifyPin(numericSignature, user.signaturePinHash)) {
      return NextResponse.json({ error: 'Гарын үсгийн нууц үг буруу байна.' }, { status: 400 });
    }

    const log = await dataStore.activityLog.create({
      data: {
        reportId: params.id,
        userId: user.id,
        action: 'cover_signature_verified',
        description: 'Report cover numeric signature verified.',
      },
    });

    return NextResponse.json({ success: true, userId: user.id, verifiedAt: log.createdAt.toISOString() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Гарын үсэг баталгаажуулахад алдаа гарлаа.' }, { status: 500 });
  }
}
