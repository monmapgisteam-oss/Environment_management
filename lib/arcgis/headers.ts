/** Match the restriction configured on the ArcGIS credential, server-side. */
export function arcgisHeaders(): Record<string, string> {
  const referer = process.env.ARCGIS_HTTP_REFERER?.trim();
  if (!referer) return {};
  const parsed = new URL(referer);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('ARCGIS_HTTP_REFERER must be an HTTP(S) application URL.');
  }
  return { Referer: referer };
}
