import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { adapt, MAX_BODY_BYTES, MAX_JSON_BYTES, sendWebResponse, toWebRequest } from '@/http/adapter';
import { NextResponse, requestContext } from '@/http/next';
import { getCurrentUser, publicUser } from '@/lib/auth';
import { encodeView } from '@shared/views/encoding';
import type { MeResponse } from '@shared/views';
import { routes } from '@/routes';
import { sweepExpiredCounters, sweepOrphanUploads } from '@/lib/db/cleanup';
import { views } from '@/views';
import { stripSecrets } from '@/views/mask';
import { isCompanyApproved } from '@shared/auth/accounts';
import { ViewNotFoundError, ViewRedirectError, type ViewDefinition } from '@/views/define';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

for (const name of ['JWT_SECRET', 'ARCGIS_PORTAL_URL', 'ARCGIS_DATA_SERVICE_URL', 'ARCGIS_CLIENT_ID', 'ARCGIS_CLIENT_SECRET']) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required.`);
}
if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET ?? '').length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
// Printed QR codes and signer links name this address; without it they would
// take the host from request headers.
if (process.env.NODE_ENV === 'production' && !/^https?:\/\/[^/]+/.test(process.env.APP_URL?.trim() ?? '')) {
  throw new Error('APP_URL (the public site address) is required in production.');
}

const proxyHops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS) || 1);

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    // Request logs carry no query string: file links hold a bearer token there.
    serializers: {
      req: (request: { method: string; url: string; ip?: string }) => ({
        method: request.method,
        url: request.url.replace(/\?.*$/, ''),
        remoteAddress: request.ip,
      }),
    },
  },
  // The backend is reached only through the reverse proxy (and the frontend
  // server). Trust as many X-Forwarded-* hops as the deployment says.
  trustProxy: (_address: string, hop: number) => hop < proxyHops,
  bodyLimit: MAX_BODY_BYTES,
  // Route handlers read the body themselves (JSON or multipart form data).
  return503OnClosing: true,
  // Slow or stalled clients are cut off (nginx also limits them).
  connectionTimeout: 130_000,
  requestTimeout: 130_000,
  keepAliveTimeout: 65_000,
  maxParamLength: 200,
});

// Leave every body unread: the Web Request handed to the handler streams it.
app.removeAllContentTypeParsers();
app.addContentTypeParser('*', (_request, _payload, done) => done(null));

// API calls that change data must come from this app's own pages. The
// session cookie is SameSite=Lax, which stops other sites but not a sibling
// subdomain; checking where the request came from closes that gap.
function crossSiteWrite(request: FastifyRequest) {
  if (SAFE_METHODS.includes(request.method)) return false;
  const fetchSite = request.headers['sec-fetch-site'];
  if (typeof fetchSite === 'string' && fetchSite) return fetchSite !== 'same-origin' && fetchSite !== 'none';
  const origin = request.headers.origin;
  // No Origin and no Sec-Fetch-Site: not a browser (scripts, tests), which
  // carries no victim's cookie on its own.
  if (!origin) return false;
  return origin !== `${request.protocol}://${request.host}`;
}

// Bodies over the limit are refused before any handler reads them.
app.addHook('onRequest', async (request, reply) => {
  const length = Number(request.headers['content-length']);
  const multipart = String(request.headers['content-type'] ?? '').toLowerCase().startsWith('multipart/form-data');
  if (Number.isFinite(length) && length > (multipart ? MAX_BODY_BYTES : MAX_JSON_BYTES)) {
    return reply.code(413).send({ error: 'Хүсэлт хэт том байна.' });
  }
});

app.addHook('onRequest', async (request, reply) => {
  if (crossSiteWrite(request)) {
    process.stdout.write(`${JSON.stringify({ type: 'security', time: new Date().toISOString(), event: 'request.cross_site', ip: request.ip, path: request.url.replace(/\?.*$/, ''), origin: request.headers.origin ?? null })}\n`);
    return reply.code(403).send({ error: 'Хүсэлтийг зөвшөөрөөгүй.' });
  }
});

app.addHook('onSend', async (_request, reply, payload) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Cross-Origin-Resource-Policy', 'same-origin');
  if (!reply.hasHeader('referrer-policy')) reply.header('Referrer-Policy', 'no-referrer');
  if (!reply.hasHeader('content-security-policy')) reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (!reply.hasHeader('cache-control')) reply.header('Cache-Control', 'no-store');
  return payload;
});

app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
  const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
  if (status === 500) request.log.error(error);
  reply.code(status).send({ error: status === 413 ? 'Хүсэлт хэт том байна.' : 'Серверийн алдаа гарлаа. Дахин оролдоно уу.' });
});

app.setNotFoundHandler((_request, reply) => {
  reply.code(404).send({ error: 'Олдсонгүй.' });
});

app.get('/healthz', async () => ({ ok: true }));

// The API the browser calls (formerly Next.js route handlers).
for (const { url, module } of routes) {
  for (const method of METHODS) {
    const handler = (module as Record<string, unknown>)[method];
    if (typeof handler === 'function') app.route({ method, url, handler: adapt(handler as Parameters<typeof adapt>[0]) });
  }
}

// Wraps a handler that needs the request context (cookies(), headers()).
function withContext(handler: (request: Request, params: Record<string, string>) => Promise<Response>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const webRequest = toWebRequest(request);
    const params = { ...((request.params ?? {}) as Record<string, string>) };
    const response = await requestContext.run({ request: webRequest }, () => handler(webRequest, params));
    return sendWebResponse(reply, webRequest, response);
  };
}

// Who is signed in, for the frontend's layouts and login pages.
app.get('/api/auth/me', withContext(async () => {
  const approved = await getCurrentUser({ allowPendingPassword: true });
  const user = approved ?? (await getCurrentUser({ allowPendingPassword: true, allowUnapprovedCompany: true }));
  const body: MeResponse = { user: user ? publicUser(user) : null, approved: !!approved };
  return new NextResponse(encodeView(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}));

// Page views (src/views): the data each frontend page renders.
function viewHandler(view: ViewDefinition) {
  return withContext(async (request, params) => {
    // Pages behind a forced password change still render under the dialog,
    // as they did before the split; API writes stay refused until it is done.
    const user = await getCurrentUser({
      allowPendingPassword: true,
      allowUnapprovedCompany: view.allowUnapprovedCompany || view.onlyUnapprovedCompany,
    });
    if (!user && !view.public) {
      const signedIn = await getCurrentUser({ allowPendingPassword: true, allowUnapprovedCompany: true });
      return NextResponse.json({ error: 'unauthorized' }, { status: signedIn ? 403 : 401 });
    }
    if (user && view.roles.length > 0 && !view.roles.includes(user.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (view.onlyUnapprovedCompany && (!user || user.role !== 'sender' || isCompanyApproved(user.company))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    try {
      const data = await view.load({ user: user!, params, query: new URL(request.url).searchParams });
      return new NextResponse(encodeView(stripSecrets(data)), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    } catch (error) {
      if (error instanceof ViewNotFoundError) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      if (error instanceof ViewRedirectError) return NextResponse.json({ $redirect: error.location });
      throw error;
    }
  });
}

for (const view of views) app.get(`/api/views/${view.name}`, viewHandler(view));

const port = Number(process.env.PORT) || 4000;
// Docker sets HOST=0.0.0.0; elsewhere only this machine can reach it.
const host = process.env.HOST || '127.0.0.1';

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});

// Daily housekeeping: delete uploads nothing uses any more and attempt
// counters / sign-out records that have expired (src/lib/db/cleanup.ts).
async function housekeeping() {
  try {
    const [uploads, counters] = [await sweepOrphanUploads(), await sweepExpiredCounters()];
    app.log.info({ uploads, counters }, 'housekeeping done');
  } catch (error) {
    app.log.error(error, 'housekeeping failed');
  }
}
if (process.env.HOUSEKEEPING !== 'off') {
  setTimeout(housekeeping, 5 * 60 * 1000).unref();
  setInterval(housekeeping, 24 * 60 * 60 * 1000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.close().then(() => process.exit(0), () => process.exit(1));
  });
}

export default app;
