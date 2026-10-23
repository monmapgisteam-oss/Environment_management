import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { clientIp, limitRequest } from '@/lib/auth/rateLimit';
import { conclusionFileError, parseConclusion, parseSignup, type SignupInput } from '@/lib/auth/signup';
import { findSenderCompanyByRegister } from '@/lib/reports/companies';
import { CONCLUSION_PROVINCE, GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { withNextReportNumber } from '@/lib/reports/reportNumber';
import { uploadAttachment } from '@/lib/db/storage';

const PERFORMANCE_REPORT_TYPE = 'Биелэлтийн тайлан';
// Owner of the conclusion upload until the user record exists.
const PENDING_UPLOAD_OWNER = 'signup-pending';

// Upload record id inside a "convex-upload:<id>" reference.
function uploadId(reference: string) {
  return reference.slice(reference.indexOf(':') + 1);
}

// Email and register number must both be new: a register number already in
// the system cannot be claimed again; the admin adds further users to it.
async function accountConflict(input: SignupInput) {
  if (await dataStore.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    return 'Энэ имэйл хаягаар бүртгэл үүссэн байна. Нэвтэрнэ үү.';
  }
  if (await findSenderCompanyByRegister(input.registerNumber)) {
    return 'Энэ регистрийн дугаартай байгууллага бүртгэлтэй байна. Нэвтрэх эрх авахын тулд системийн админд хандана уу.';
  }
  return null;
}

// Sign-up has two steps. The first posts the account fields as JSON and is only
// checked. The second posts everything as multipart form data with the general
// evaluation conclusion PDF; then the company, its first user and the
// conclusion are created together. The company waits for the admin to approve
// it (anyone could type another organisation's register number), so nobody is
// signed in yet.
export async function POST(request: Request) {
  const isFinal = (request.headers.get('content-type') || '').includes('multipart/form-data');
  const limit = isFinal
    ? await limitRequest(`signup:ip:${clientIp(request)}`, 10, 60 * 60 * 1000)
    : await limitRequest(`signup-check:ip:${clientIp(request)}`, 15, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.' }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  let file: File | null = null;
  if (isFinal) {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'Хүсэлт буруу байна.' }, { status: 400 });
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') body[key] = value;
    }
    const upload = form.get('file');
    file = upload && typeof upload !== 'string' ? upload : null;
  } else {
    body = (await request.json().catch(() => null)) ?? {};
  }

  const parsed = parseSignup(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error, step: 1 }, { status: 400 });
  const { input } = parsed;

  let conclusion = null;
  if (isFinal) {
    const parsedConclusion = parseConclusion(body);
    if ('error' in parsedConclusion) return NextResponse.json({ error: parsedConclusion.error, step: 2 }, { status: 400 });
    const fileError = conclusionFileError(file);
    if (fileError) return NextResponse.json({ error: fileError, step: 2 }, { status: 400 });
    conclusion = parsedConclusion.input;
  }

  try {
    const conflict = await accountConflict(input);
    if (conflict) return NextResponse.json({ error: conflict, step: 1 }, { status: 409 });
    if (!conclusion || !file) return NextResponse.json({ success: true });

    const reportType =
      (await dataStore.reportType.findFirst({ where: { name: PERFORMANCE_REPORT_TYPE } })) ??
      (await dataStore.reportType.findFirst({ where: { isActive: true } }));
    if (!reportType) throw new Error('No report type found.');

    // The file goes up first: it is the step most likely to fail, and nothing
    // is created yet when it does.
    const attachment = await uploadAttachment(file, PENDING_UPLOAD_OWNER);
    const company = await dataStore.company.create({
      data: { name: input.companyName, registerNumber: input.registerNumber, type: 'sender', approvalStatus: 'pending' },
    });
    const user = await dataStore.user.create({
      data: {
        name: input.contactName,
        email: input.email,
        password: hashPassword(input.password),
        role: 'sender',
        companyId: company.id,
        phone: input.phone ?? input.companyPhone,
        position: input.position ?? 'Тайлан хариуцсан мэргэжилтэн',
      },
    });
    const userId = user.id;
    await dataStore.upload.updateMany({ where: { id: uploadId(attachment.url) }, data: { ownerUserId: userId } });
    const report = await withNextReportNumber((reportNumber) =>
      dataStore.report.create({
        data: {
          reportNumber,
          conclusionNumber: conclusion.conclusionNumber,
          reportTypeId: reportType.id,
          reportCategory: conclusion.projectCategory,
          senderCompanyId: company.id,
          title: GENERAL_EVALUATION_CONCLUSION_TITLE,
          projectName: conclusion.projectName,
          // Conclusions keep their type in the description.
          description: conclusion.conclusionType,
          fileUrl: JSON.stringify([attachment]),
          implementerName: conclusion.implementerName,
          implementerRegister: input.registerNumber,
          status: 'submitted',
          year: conclusion.year,
          submittedAt: new Date(),
          location: {
            create: { province: CONCLUSION_PROVINCE, district: conclusion.district, khoroo: 'Тодорхойгүй' },
          },
        },
      }),
    );

    // The admins review the new company; managers hear about its conclusion
    // once it is approved. A notification failure must not fail the sign-up.
    try {
      const admins = await dataStore.user.findMany({ where: { role: 'admin' }, select: { id: true } });
      if (admins.length > 0) {
        await dataStore.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            reportId: report.id,
            title: 'Шинэ байгууллага бүртгүүллээ',
            message: `${company.name} (РД ${company.registerNumber}) бүртгүүлж, баталгаажуулалт хүлээж байна. «Компаниуд» хэсгээс шалгана уу.`,
          })),
        });
      }
    } catch (notifyError) {
      console.error('[auth/signup] notification failed:', notifyError);
    }

    return NextResponse.json({ success: true, pending: true }, { status: 201 });
  } catch (error) {
    console.error('[auth/signup] failed:', error);
    return NextResponse.json({ error: 'Бүртгэл үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
