export type Attachment = { url: string; name: string };

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
        .map((f: any) => ({ url: f.url, name: f.name || f.url.split('/').pop() }));
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
