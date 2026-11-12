import { Readable, Transform } from 'node:stream';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { NextResponse, parseCookies, requestContext, serializeCookie } from './next';
import { renewedToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { MAX_UPLOAD_REQUEST_BYTES } from '@/lib/reports/fileType';

// Largest request body any handler accepts: one uploaded file with its
// multipart envelope. The proxy refuses bigger bodies first; this also stops
// a chunked body that sends no Content-Length.
export const MAX_BODY_BYTES = MAX_UPLOAD_REQUEST_BYTES;
// Any body that is not a file upload (JSON forms, scores, comments).
export const MAX_JSON_BYTES = 1024 * 1024;

export class BodyTooLargeError extends Error {
  readonly statusCode = 413;
  constructor() {
    super('Request body is too large.');
  }
}

function limited(source: NodeJS.ReadableStream, max: number) {
  let total = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      total += chunk.length;
      if (total > max) callback(new BodyTooLargeError());
      else callback(null, chunk);
    },
  });
  source.on('error', (error) => counter.destroy(error));
  return source.pipe(counter);
}

// The Fastify request as a Web Request. The URL carries the public host and
// protocol (the proxy's X-Forwarded-* headers, see trustProxy in server.ts).
export function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, String(value));
  }
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  // Only multipart uploads may be large; JSON and other bodies stay small.
  const multipart = String(request.headers['content-type'] ?? '').toLowerCase().startsWith('multipart/form-data');
  const limit = multipart ? MAX_BODY_BYTES : MAX_JSON_BYTES;
  return new Request(`${request.protocol}://${request.host}${request.url}`, {
    method: request.method,
    headers,
    body: hasBody ? (Readable.toWeb(limited(request.raw, limit) as Readable) as ReadableStream) : undefined,
    // Required by Node when the body is a stream.
    duplex: 'half',
  } as RequestInit);
}

// Sliding session: a request carrying a session token older than 10 minutes
// gets a fresh one (lib/auth/session.ts), unless the handler already set or
// cleared the cookie itself (login, logout, password change).
function renewalCookie(request: Request, handled: Set<string>) {
  if (handled.has(SESSION_COOKIE)) return null;
  const token = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE);
  const renewed = token ? renewedToken(token) : null;
  return renewed ? serializeCookie(SESSION_COOKIE, renewed, sessionCookieOptions()) : null;
}

export async function sendWebResponse(reply: FastifyReply, request: Request, response: Response) {
  const cookies = response instanceof NextResponse ? [...response.cookies.list] : [];
  const handled = response instanceof NextResponse ? response.cookies.names : new Set<string>();
  const renewal = new URL(request.url).pathname === '/api/auth/logout' ? null : renewalCookie(request, handled);
  if (renewal) cookies.push(renewal);

  reply.status(response.status);
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') reply.header(name, value);
  });
  const setCookies = [...response.headers.getSetCookie(), ...cookies];
  if (setCookies.length) reply.header('set-cookie', setCookies);
  if (!response.body) return reply.send();
  return reply.send(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream));
}

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response> | Response;

// Runs a route handler written against Web Request/Response inside Fastify.
export function adapt(handler: Handler) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const webRequest = toWebRequest(request);
    const params = (request.params ?? {}) as Record<string, string>;
    const response = await requestContext.run({ request: webRequest }, () =>
      handler(webRequest, { params: Promise.resolve(params) }),
    );
    return sendWebResponse(reply, webRequest, response);
  };
}
