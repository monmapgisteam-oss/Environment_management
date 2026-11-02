// What a file really is, from its first bytes, not from the name or the type
// the browser claims. Only these kinds are ever stored.
export type FileKind = 'pdf' | 'png' | 'jpeg';

export const CONTENT_TYPE: Record<FileKind, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
};

export async function detectFileKind(file: Blob): Promise<FileKind | null> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'pdf'; // %PDF-
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';
  if (starts(0xff, 0xd8, 0xff)) return 'jpeg';
  return null;
}

// Upload size cap, also checked from Content-Length before a body is read.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
// Room for the multipart envelope around one file.
export const MAX_UPLOAD_REQUEST_BYTES = MAX_FILE_BYTES + 1024 * 1024;

export function tooLargeRequest(request: Request) {
  const length = Number(request.headers.get('content-length'));
  return Number.isFinite(length) && length > MAX_UPLOAD_REQUEST_BYTES;
}
