export type Attachment = { url: string; name: string; criterionId?: string };

export function isImageAttachment(file: Attachment): boolean {
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name || file.url);
}

export function isDocumentAttachment(file: Attachment): boolean {
  return /\.(pdf|docx?|odt)$/i.test(file.name || file.url);
}

export function isReportAttachment(file: Attachment): boolean {
  return isImageAttachment(file) || isDocumentAttachment(file);
}

// Builds a URL that forces a file download (Content-Disposition: attachment)
// instead of opening in the browser. The attachment proxy uses the `download`
// parameter as the saved filename. Preserve relative links on the current host.
export function downloadUrl(file: Attachment): string {
  try {
    const u = new URL(file.url, 'http://localhost');
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      u.searchParams.set('download', file.name || '');
      return file.url.startsWith('/') ? `${u.pathname}${u.search}${u.hash}` : u.toString();
    }
  } catch {
    // ignore and fall through
  }
  return file.url;
}

export function serializeImageAttachments(fileUrl: string | null | undefined): string | null {
  const imageAttachments = parseAttachments(fileUrl).filter(isImageAttachment);
  return imageAttachments.length ? JSON.stringify(imageAttachments) : null;
}

export function serializeDocumentAttachments(fileUrl: string | null | undefined): string | null {
  const documentAttachments = parseAttachments(fileUrl).filter(isDocumentAttachment);
  return documentAttachments.length ? JSON.stringify(documentAttachments) : null;
}

export function serializeReportAttachments(fileUrl: string | null | undefined): string | null {
  const reportAttachments = parseAttachments(fileUrl).filter(isReportAttachment);
  return reportAttachments.length ? JSON.stringify(reportAttachments) : null;
}

// Attachments are stored on Report.fileUrl as a JSON array of { url, name } so
// the reviewer sees the sender's original file name. Older records may hold a
// plain (comma-separated) list of URLs, which we still parse for compatibility.
export function parseAttachments(fileUrl: string | null | undefined): Attachment[] {
  if (!fileUrl) return [];
  try {
    const parsed = JSON.parse(fileUrl);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((f: any) => f && f.url)
        .map((f: any) => ({
          url: f.url,
          name: f.name || f.url.split('/').pop(),
          ...(typeof f.criterionId === 'string' && f.criterionId ? { criterionId: f.criterionId } : {}),
        }));
    }
    return [];
  } catch {
    return fileUrl
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)
      .map((u) => ({ url: u, name: decodeURIComponent(u.split('/').pop() || u) }));
  }
}
