// Comments the admin and review managers leave on a company's general
// evaluation conclusion (app/api/reports/[id]/comments).

export const COMMENT_MAX_LENGTH = 2000;
export const COMMENT_ROLES = ['admin', 'review_manager'] as const;

export function parseComment(value: unknown): { body: string } | { error: string } {
  const body = typeof value === 'string' ? value.trim() : '';
  if (!body) return { error: 'Тайлбараа бичнэ үү.' };
  if (body.length > COMMENT_MAX_LENGTH) return { error: `Тайлбар ${COMMENT_MAX_LENGTH} тэмдэгтээс хэтрэхгүй.` };
  return { body };
}
