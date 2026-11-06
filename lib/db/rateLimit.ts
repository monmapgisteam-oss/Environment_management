import { createHash } from 'crypto';
import { api } from '@/convex/_generated/api';
import { convex, serverSecret } from './convex';
import type { RateLimitResult } from '@/lib/auth/rateLimit';

// Shared counters are incremented atomically inside a Convex mutation.
export async function hit(key: string, limit: number, windowMs: number, { count = true }: { count?: boolean } = {}): Promise<RateLimitResult> {
  return convex().mutation(api.rateLimit.hit, {
    secret: serverSecret(), key: createHash('sha256').update(key).digest('hex'), limit, windowMs, count,
  });
}
