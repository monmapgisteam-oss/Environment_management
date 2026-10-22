// Fixed-window request limiter kept in process memory. Good enough for the
// single-instance deployment this app runs on; with several instances each one
// counts separately, so the effective limit is `limit × instances`.

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  let window = windows.get(key);
  if (!window || window.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) sweep(now);
    window = { count: 0, resetAt: now + windowMs };
    windows.set(key, window);
  }
  window.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  return { ok: window.count <= limit, remaining: Math.max(0, limit - window.count), retryAfterSeconds };
}

function sweep(now: number) {
  for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
  // Still full after dropping expired windows: forget the oldest entries.
  if (windows.size >= MAX_TRACKED_KEYS) {
    for (const key of Array.from(windows.keys()).slice(0, MAX_TRACKED_KEYS / 2)) windows.delete(key);
  }
}

export function resetRateLimits() {
  windows.clear();
}

// Client address behind the usual reverse proxies; "unknown" when none is set.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip')?.trim() || 'unknown';
}
