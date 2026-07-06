import { NextResponse } from 'next/server';
import { supabaseAdmin, ensureBucket, STORAGE_BUCKET } from '@/lib/supabase';

// Uploads an attachment to a private Supabase Storage bucket and returns the
// stored object path. We store files in Supabase (not the local/public folder)
// because Vercel's filesystem is ephemeral — files written there disappear and
// are never visible to the monitoring team. The path is saved on the report; the
// review pages turn it into a short-lived signed URL (see lib/supabase
// signAttachments) so only people viewing the report can open/download it.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const purpose = formData.get('purpose');
    if (purpose === 'report-photo') {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image uploads are allowed for reports' }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image must be 10MB or smaller' }, { status: 400 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await ensureBucket();

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload failed', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Store the object path (not a URL); signed URLs are generated at view time.
    return NextResponse.json({ url: objectPath, name: file.name }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
