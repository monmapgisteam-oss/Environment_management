import { AsyncLocalStorage } from 'node:async_hooks';

// The route handlers were written as Next.js route handlers: they take a Web
// Request and return a Web Response. This module provides the few Next.js
// helpers they use (NextResponse with cookies, cookies(), headers()), so the
// same handlers run inside Fastify (src/http/adapter.ts).

type RequestContext = { request: Request };
export const requestContext = new AsyncLocalStorage<RequestContext>();

function current(): Request {
  const context = requestContext.getStore();
  if (!context) throw new Error('No request in progress.');
  return context.request;
}

export type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  path?: string;
  maxAge?: number;
};

export function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    parts.push(`Expires=${new Date(Date.now() + options.maxAge * 1000).toUTCString()}`);
  }
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  return parts.join('; ');
}

// Response cookies are kept beside the headers: a Web Response may refuse a
// Set-Cookie header, and the adapter writes these to the reply itself.
class ResponseCookies {
  readonly list: string[] = [];
  readonly names = new Set<string>();
  set(name: string, value: string, options?: CookieOptions) {
    this.names.add(name);
    this.list.push(serializeCookie(name, value, options));
  }
  delete(name: string) {
    this.names.add(name);
    this.list.push(serializeCookie(name, '', { path: '/', maxAge: 0 }));
  }
}

export class NextResponse extends Response {
  readonly cookies = new ResponseCookies();

  static json(data: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
    return new NextResponse(JSON.stringify(data), { ...init, headers });
  }
}

export type NextRequest = Request;

export function parseCookies(header: string | null): Map<string, string> {
  const result = new Map<string, string>();
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name || result.has(name)) continue;
    try {
      result.set(name, decodeURIComponent(part.slice(index + 1).trim()));
    } catch {
      result.set(name, part.slice(index + 1).trim());
    }
  }
  return result;
}

// Cookies of the request in progress (next/headers `cookies()`).
export async function cookies() {
  const values = parseCookies(current().headers.get('cookie'));
  return {
    get(name: string) {
      const value = values.get(name);
      return value === undefined ? undefined : { name, value };
    },
  };
}

// Headers of the request in progress (next/headers `headers()`).
export async function headers() {
  return current().headers;
}
