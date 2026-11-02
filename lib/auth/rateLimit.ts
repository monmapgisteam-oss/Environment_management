// Fixed-window request limiter. `limitRequest` counts in the ArcGIS service,
// so the limit holds across restarts and several server instances; if the
// service cannot be reached it falls back to `rateLimit`, which counts in this
// process only.

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

// With `count: false` it only reports whether the key is already over the
// limit (e.g. checking an account before the password, counting only failures).
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
  { count = true }: { count?: boolean } = {},
): RateLimitResult {
  let window = windows.get(key);
  if (!window || window.resetAt <= now) {
    if (!count) return { ok: true, remaining: limit, retryAfterSeconds: 0 };
    if (windows.size >= MAX_TRACKED_KEYS) sweep(now);
    window = { count: 0, resetAt: now + windowMs };
    windows.set(key, window);
  }
  if (count) window.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  const used = count ? window.count : window.count + 1;
  return { ok: used <= limit, remaining: Math.max(0, limit - window.count), retryAfterSeconds };
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

// Client address as seen by our own reverse proxy. The client can put
// anything at the start of X-Forwarded-For, so the address is taken
// TRUST_PROXY_HOPS entries from the end (the ones our proxies appended;
// default 1). "unknown" when no proxy header is set.
export function clientIp(request: Request): string {
  const hops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS) || 1);
  const forwarded = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const trusted = forwarded.length ? forwarded[Math.max(0, forwarded.length - hops)] : '';
  return trusted || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

// Shared counter in the ArcGIS service (lib/db/rateLimit.ts), with the
// in-process counter as a fallback so a service outage does not lock everyone
// out of login.
export async function limitRequest(
  key: string,
  limit: number,
  windowMs: number,
  options: { count?: boolean } = {},
): Promise<RateLimitResult> {
  try {
    // Loaded on use, so tests of the in-process counter need no database client.
    const { hit } = await import('@/lib/db/rateLimit');
    return await hit(key, limit, windowMs, options);
  } catch (error) {
    console.error('[rateLimit] shared counter unavailable, using local one:', error);
    return rateLimit(key, limit, windowMs, Date.now(), options);
  }
}
