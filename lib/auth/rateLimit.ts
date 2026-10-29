// Fixed-window request limiter. `limitRequest` counts in the ArcGIS service,
// so the limit holds across restarts and several server instances; if the
// service cannot be reached it falls back to `rateLimit`, which counts in this
// process only.

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

// Shared counter in the ArcGIS service (lib/db/rateLimit.ts), with the
// in-process counter as a fallback so a service outage does not lock everyone
// out of login.
export async function limitRequest(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    // Loaded on use, so tests of the in-process counter need no database client.
    const { hit } = await import('@/lib/db/rateLimit');
    return await hit(key, limit, windowMs);
  } catch (error) {
    console.error('[rateLimit] shared counter unavailable, using local one:', error);
    return rateLimit(key, limit, windowMs);
  }
}
