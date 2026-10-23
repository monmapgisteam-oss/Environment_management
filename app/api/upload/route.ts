import { NextResponse } from 'next/server';
import { uploadAttachment } from '@/lib/db/storage';
import { getCurrentUser } from '@/lib/auth';
import { isPdfName } from '@/lib/reports/attachments';

// Files live in Convex storage; upload ownership records in the upload table.
export async function POST(request: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const purpose = formData.get('purpose');
    // Senders attach PDF only. The name, the type and the first bytes must all
    // say PDF, so a renamed file of another kind is refused.
    if (current.role === 'sender') {
      const header = await file.slice(0, 5).text();
      if (!isPdfName(file.name) || (file.type && file.type !== 'application/pdf') || header !== '%PDF-') {
        return NextResponse.json({ error: 'Зөвхөн PDF файл хавсаргана уу.' }, { status: 400 });
      }
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be 25MB or smaller' }, { status: 400 });
    }
    const isAllowedDocument =
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/vnd.oasis.opendocument.text' ||
      /\.(pdf|docx?|odt)$/i.test(file.name.toLowerCase());

    if (purpose === 'report-photo') {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image uploads are allowed for reports' }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image must be 10MB or smaller' }, { status: 400 });
      }
    }
    if (purpose === 'report-attachment') {
      if (!file.type.startsWith('image/') && !isAllowedDocument) {
        return NextResponse.json({ error: 'Only image, PDF, or Word document uploads are allowed for reports' }, { status: 400 });
      }
      if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image must be 10MB or smaller' }, { status: 400 });
      }
      if (isAllowedDocument && file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'Document must be 25MB or smaller' }, { status: 400 });
      }
    }
    if (purpose === 'report-document') {
      if (!isAllowedDocument) {
        return NextResponse.json({ error: 'Only PDF or Word document uploads are allowed' }, { status: 400 });
      }
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'Document must be 25MB or smaller' }, { status: 400 });
      }
    }

    return NextResponse.json(await uploadAttachment(file, current.id), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
