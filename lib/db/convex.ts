import { ConvexHttpClient } from 'convex/browser';

/** Server-side Convex client. Never import this from client components. */
let client: ConvexHttpClient | undefined;

export function convex(): ConvexHttpClient {
  if (!client) {
    const url = process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url) throw new Error('Set CONVEX_URL to the Convex deployment URL.');
    client = new ConvexHttpClient(url);
  }
  return client;
}

export function serverSecret(): string {
  const secret = process.env.CONVEX_SERVER_SECRET?.trim();
  if (!secret) throw new Error('CONVEX_SERVER_SECRET is required.');
  return secret;
}
