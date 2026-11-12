# ArcGIS setup

The application stores all operational data and uploaded files in a private ArcGIS feature service (`Hosted/Tailan` on `environment.ub.gov.mn`). Each model in `backend/src/lib/db/schema.json` is one table named `tailan_<model>` whose fields carry an `app_` prefix; report locations are a point layer. Uploaded files are attachments of `tailan_upload` records. Only the backend talks to the service, with an OAuth application credential, so the token never reaches the frontend or the browser.

## 1. Install

With Docker, nothing else is needed. For local development use Node.js 20.12 or later and run `npm run install:all`.

## 2. Configure

Add the backend values to `.env` for Docker Compose, or `.env.local` for local development (see `.env.example`):

```env
JWT_SECRET="<at least 32 random characters>"
ARCGIS_PORTAL_URL="https://environment.ub.gov.mn/gis"
ARCGIS_DATA_SERVICE_URL="https://environment.ub.gov.mn/hosting/rest/services/Hosted/Tailan/FeatureServer"
ARCGIS_CLIENT_ID="<OAuth application client ID>"
ARCGIS_CLIENT_SECRET="<OAuth application client secret>"
ARCGIS_HTTP_REFERER="<app URL, if the credential is referrer-restricted>"
APP_URL="https://<public site address>"
```

The service item must stay private and the OAuth application needs edit access to it.

### Connection troubleshooting

If login returns HTTP 503 and the server logs `getaddrinfo ENOTFOUND environment.ub.gov.mn`, the backend could not resolve the ArcGIS hostname. Check DNS and network access from the backend container (it uses the `egress` network in `docker-compose.yml`), including any required VPN. Confirm both ArcGIS URLs against the deployment's service addresses. Changing OAuth credentials does not fix a DNS failure.

OAuth requests retry a connection failure once. During a continuing outage, login pages remain available, but signing in requires the service to recover. The rate limiter's local fallback only counts attempts; it does not provide offline access to user accounts.

## 3. Schema changes

Fields and relationships are defined in `backend/src/lib/db/schema.json`, and `shared/db/models.ts` holds the matching TypeScript types. After editing the schema, update `models.ts` and add the new tables and fields to the service:

```bash
npm run arcgis:provision -- --dry-run   # lists what is missing
npm run arcgis:provision                # adds missing tables, fields and indexes
```

Provisioning only adds; it never removes or changes existing fields or records. It needs `ARCGIS_ADMIN_TOKEN`, a token of the service owner (the OAuth application credential cannot change the service definition). Generate one at `https://environment.ub.gov.mn/gis/sharing/rest/generateToken` with referer set to the value of `ARCGIS_HTTP_REFERER`.

## 4. Deploy with Docker Compose

```bash
docker compose up -d --build
docker compose ps            # backend, frontend and proxy should be healthy
```

- **proxy** (nginx, `nginx/default.conf`) is the only container with a published port (`HTTP_PORT`, default 8080).
- **frontend** (Next.js standalone server) has no secrets and sits on the internal network only.
- **backend** (Fastify) reads `.env` and also has outbound access for ArcGIS.
- All three run as non-root users on read-only file systems with all capabilities dropped.

Serve the site over HTTPS. Terminate TLS in front of the proxy and forward `X-Forwarded-Proto: https`. With a terminator in front:
- set `TRUST_PROXY_HOPS=2`;
- set `HTTP_BIND=127.0.0.1` (or firewall the port), so nobody reaches nginx around the terminator;
- enable the `set_real_ip_from` lines at the top of `nginx/default.conf`, so the login limit counts per visitor. The session cookie is `Secure` in production, so plain HTTP only works on `localhost`. `APP_URL` must be the public HTTPS address; the backend refuses to start in production without it.

Updating: `git pull && docker compose up -d --build`. The build runs the backend type check; seeding and provisioning stay manual (section 3 and README).

Logs: `docker compose logs -f backend` (JSON). Request logs in the backend and nginx leave out query strings, because file links carry a token there.

Sessions: the cookie is `__Host-tailan_session` in production. It is renewed while in use, and it always ends 12 hours after sign-in. The backend container receives only the variables listed in `docker-compose.yml`, so `ARCGIS_ADMIN_TOKEN` never reaches it.
