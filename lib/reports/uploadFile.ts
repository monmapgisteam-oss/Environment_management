// Uploads one file through /api/upload for a sender form. A failure throws an
// Error whose message names the file and the server's reason (not a PDF, too
// large, signed out ...), so the form can show exactly what went wrong.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function uploadReportFile(file: File, purpose = 'report-attachment') {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: файлын хэмжээ 25MB-аас ихгүй байна.`);
  const body = new FormData();
  body.append('file', file);
  body.append('purpose', purpose);
  let res: Response;
  try {
    res = await fetch('/api/upload', { method: 'POST', body });
  } catch {
    throw new Error('Сүлжээний алдаа гарлаа. Холболтоо шалгаад дахин оролдоно уу.');
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; name?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(`${file.name}: ${data.error || 'файл хуулахад алдаа гарлаа.'}`);
  return { url: data.url, name: data.name || file.name };
}

export function uploadErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Файл хуулах үед алдаа гарлаа. Дахин оролдоно уу.';
}
