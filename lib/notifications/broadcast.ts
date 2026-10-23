import type { Broadcast } from '@/lib/db/models';

// Who an admin broadcast goes to. Only active accounts receive it; admins are
// never recipients.
export type BroadcastAudience = Broadcast['audience'];

export const BROADCAST_AUDIENCES: { value: BroadcastAudience; label: string; roles: string[] }[] = [
  { value: 'all', label: 'Бүх хэрэглэгч', roles: ['sender', 'review_manager', 'evaluator'] },
  { value: 'sender', label: 'Илгээгч байгууллагууд', roles: ['sender'] },
  { value: 'review', label: 'Хянах байгууллага (менежер, ажилтан)', roles: ['review_manager', 'evaluator'] },
  { value: 'evaluator', label: 'Үнэлгээний ажилтнууд', roles: ['evaluator'] },
  { value: 'review_manager', label: 'Хянах менежер', roles: ['review_manager'] },
];

export function audienceRoles(audience: BroadcastAudience): string[] {
  return BROADCAST_AUDIENCES.find((option) => option.value === audience)?.roles ?? [];
}

export function audienceLabel(audience: string) {
  return BROADCAST_AUDIENCES.find((option) => option.value === audience)?.label ?? audience;
}

export const BROADCAST_TITLE_MAX = 120;
export const BROADCAST_MESSAGE_MAX = 1000;

export type BroadcastInput = { title: string; message: string; audience: BroadcastAudience };

export function parseBroadcast(data: Record<string, unknown>): { input: BroadcastInput } | { error: string } {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  const audience = BROADCAST_AUDIENCES.find((option) => option.value === data.audience)?.value;
  if (!title) return { error: 'Гарчиг оруулна уу.' };
  if (title.length > BROADCAST_TITLE_MAX) return { error: `Гарчиг ${BROADCAST_TITLE_MAX} тэмдэгтээс ихгүй байна.` };
  if (!message) return { error: 'Мэдэгдлийн агуулгаа бичнэ үү.' };
  if (message.length > BROADCAST_MESSAGE_MAX) return { error: `Агуулга ${BROADCAST_MESSAGE_MAX} тэмдэгтээс ихгүй байна.` };
  if (!audience) return { error: 'Хүлээн авагчаа сонгоно уу.' };
  return { input: { title, message, audience } };
}
