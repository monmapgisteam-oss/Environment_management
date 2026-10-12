import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import dataStore from '@/lib/arcgis/data';
import { hashPin, verifyPin } from '@/lib/signature';

const KNOWN_SIGNATURES: Record<string, string> = {
  'manager@tailan.mn': '1234',
  'staff@tailan.mn': '1111',
  'staff2@tailan.mn': '2222',
  'staff3@tailan.mn': '3333',
};

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

    const knownSignature = KNOWN_SIGNATURES[user.email];
    if (knownSignature && numericSignature !== knownSignature) {
      return NextResponse.json({ error: 'Тоон гарын үсэг буруу байна.' }, { status: 400 });
    }

    if (user.signaturePinHash) {
      if (!verifyPin(numericSignature, user.signaturePinHash)) {
        return NextResponse.json({ error: 'Тоон гарын үсэг буруу байна.' }, { status: 400 });
      }
    } else {
      await dataStore.user.update({
        where: { id: user.id },
        data: { signaturePinHash: hashPin(numericSignature) },
      });
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
