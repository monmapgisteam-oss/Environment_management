// View data travels from the backend to the frontend's server components as
// JSON. Dates are tagged so they arrive as Date objects again, the same as the
// pages had them when they read the database themselves.

type Tagged = { $date: string };

export function encodeView(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, item) {
    const raw = this[key];
    if (raw instanceof Date) return { $date: Number.isNaN(raw.getTime()) ? null : raw.toISOString() } satisfies { $date: string | null };
    return item;
  });
}

function isTagged(value: unknown): value is Tagged {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === '$date';
}

export function decodeView<T>(text: string): T {
  return JSON.parse(text, (_key, value) => {
    if (!isTagged(value)) return value;
    return value.$date === null ? new Date(NaN) : new Date(value.$date);
  }) as T;
}
