export type Attachment = { url: string; name: string };

// Builds a URL that forces a file download (Content-Disposition: attachment)
// instead of opening in the browser. Supabase Storage honours the `download`
// query param and uses its value as the saved filename, so the monitoring team
// gets the sender's original file name. Falls back to the plain URL for any
// non-Supabase/legacy links.
export function downloadUrl(file: Attachment): string {
  try {
    const u = new URL(file.url, 'http://localhost');
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      u.searchParams.set('download', file.name || '');
      return u.toString();
    }
  } catch {
    // ignore and fall through
  }
  return file.url;
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
