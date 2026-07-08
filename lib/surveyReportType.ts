export function normalizeSurveyReportType(value: unknown): string {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return '';
  if (text.includes('төлөвлөгөө') || text.includes('plan')) return 'Төлөвлөгөө';
  if (text.includes('биелэлт') || text.includes('тайлан') || text.includes('report')) return 'Тайлан';
  return String(value).trim();
}
