import { NextResponse } from '@/http/next';
import { uploadAttachment } from '@/lib/db/storage';
import { getCurrentUser } from '@/lib/auth';
import { limitRequest } from '@/lib/auth/rateLimit';

const UPLOADS_PER_HOUR = 60;
import { CONTENT_TYPE, detectFileKind, MAX_FILE_BYTES, tooLargeRequest } from '@/lib/reports/fileType';

// Files are ArcGIS attachments of upload records, which also record the owner.
// Every file is identified by its first bytes: senders upload PDF only; review
// staff may also upload a PNG or JPEG (a scanned, signed score sheet). The
// stored type comes from those bytes, never from what the browser claims.
export async function POST(request: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return NextResponse.json({ error: 'Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.' }, { status: 401 });
    // A cap per user keeps one account from filling the file store.
    const quota = await limitRequest(`upload:${current.id}`, UPLOADS_PER_HOUR, 60 * 60 * 1000);
    if (!quota.ok) {
      return NextResponse.json(
        { error: 'Хэт олон файл хуулсан байна. Түр хүлээгээд дахин оролдоно уу.' },
        { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds) } },
      );
    }
    // Refused before the body is read into memory.
    if (tooLargeRequest(request)) {
      return NextResponse.json({ error: 'Файлын хэмжээ 25MB-аас ихгүй байна.' }, { status: 413 });
    }
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Файл сонгоогүй байна.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Файлын хэмжээ 25MB-аас ихгүй байна.' }, { status: 400 });
    }

    const kind = await detectFileKind(file);
    const allowed = current.role === 'sender' ? ['pdf'] : ['pdf', 'png', 'jpeg'];
    if (!kind || !allowed.includes(kind)) {
      return NextResponse.json(
        { error: current.role === 'sender' ? 'Зөвхөн PDF файл хавсаргана уу.' : 'PDF, PNG эсвэл JPG файл хавсаргана уу.' },
        { status: 400 },
      );
    }
    if (kind === 'pdf' && !/\.pdf$/i.test(file.name)) {
      return NextResponse.json({ error: 'Зөвхөн PDF файл хавсаргана уу.' }, { status: 400 });
    }

    const stored = new File([file], file.name, { type: CONTENT_TYPE[kind] });
    return NextResponse.json(await uploadAttachment(stored, current.id), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Файл хуулахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
