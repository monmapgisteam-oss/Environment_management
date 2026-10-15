// Convex functions are publicly callable. Every function here serves only the
// Next.js server, which proves itself with a shared secret.
export function assertServer(secret: string) {
  const expected = process.env.CONVEX_SERVER_SECRET;
  if (!expected || expected.length < 32) throw new Error('CONVEX_SERVER_SECRET is not configured.');
  let diff = secret.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ secret.charCodeAt(i % (secret.length || 1));
  if (diff !== 0) throw new Error('Unauthorized.');
}
