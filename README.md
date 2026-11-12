# Байгаль орчны менежментийн төлөвлөгөөний систем

Official report submission and evaluation system for managing reports, reviews, scoring, and geographic information.

## Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS — `frontend/`
- **Backend:** Fastify API on Node.js, TypeScript — `backend/`
- **Shared code:** record types, view contracts and pure report helpers — `shared/`
- **Data and files:** private ArcGIS feature service (tables and attachments), reached only by the backend
- **Authentication:** JWT session cookie, issued and checked by the backend
- **Deployment:** Docker Compose: nginx reverse proxy, frontend, backend

## Features

### User Roles
- **Sender:** Submit reports and view feedback
- **Review Manager:** Assign reports to evaluators, manage workflow
- **Evaluator:** Review and score assigned reports
- **Admin:** System administration and configuration

### Core Functionality
- Role-based access control
- Report submission and tracking
- Dynamic evaluation criteria
- Geographic location mapping
- Real-time evaluation progress
- Activity logging
- Notification system
- Export capabilities (PDF, Excel)

## Architecture

```
browser ──> nginx (proxy, the only published port)
              ├─ /api/*  ──> backend  (Fastify) ──> ArcGIS feature service
              └─ /*      ──> frontend (Next.js) ──> backend /api/views/*, /api/auth/me
```

- The **backend** holds every secret (JWT secret, ArcGIS credential) and does all database work. `backend/src/routes/**/route.ts` are the API handlers the browser calls (Web `Request` in, `Response` out, run through `src/http/adapter.ts`). `backend/src/views/` are **page views**: the data each frontend page renders, loaded for the signed-in user at `GET /api/views/<page>`.
- The **frontend** renders pages only. Server components call the backend over the private Docker network with the visitor's cookie (`frontend/lib/api/server.ts`: `loadView`, `backendFetch`); layouts check the user through `/api/auth/me` (`frontend/lib/auth.ts`). It has no secrets and no outside network access.
- **nginx** sends `/api/*` to the backend and everything else to the frontend, so cookies and the backend's same-origin check work on one domain. It refuses `/api/views/*` and `/api/auth/me` from outside, limits login/sign-up attempts per address, and caps request bodies at 27 MB.
- `shared/views/` is the typed contract between page views and pages; `shared/db/` the record types.

## Run with Docker

```bash
cp .env.example .env        # fill in JWT_SECRET, ARCGIS_*, APP_URL
docker compose up -d --build
open http://localhost:8080  # HTTP_PORT in .env changes the port
```

Put HTTPS in front of the proxy for production (a load balancer or a TLS-terminating proxy that sets `X-Forwarded-Proto`), and set `TRUST_PROXY_HOPS=2` in that case. Session cookies are `Secure` in production. See [SETUP.md](SETUP.md).

## Local development

Use Node.js 20.12 or newer. Put the backend values in `.env.local` at the repository root (see `.env.example`), then:

```bash
npm run install:all
npm run dev:backend         # http://localhost:4000
npm run dev:frontend        # http://localhost:3000 (forwards /api to the backend)
```

Maintenance commands (backend, read `.env.local`):

```bash
npm run arcgis:provision                       # adds tables and fields from backend/src/lib/db/schema.json that the service lacks
npm --prefix backend run seed:criteria         # once per deployment: scoring sheets for each report category
npm --prefix backend run seed:report-types     # core report types; folds Survey123-made types into them
npm --prefix backend run fix:locations         # fills missing province/district of saved report locations
npm --prefix backend run fix:signatures        # clears signature PINs older versions stored in plaintext
SEED_PASSWORD=... npm --prefix backend run seed:evaluators   # 10 evaluator accounts staff1..staff10@tailan.mn
(cd frontend && python3 -I scripts/split-sample-tables.py public/samples/bomt-zagvaruud.pdf)   # regenerates public/samples/<category>/*.pdf (needs PyMuPDF)
```

## Data flow

Every API handler and page view reads/writes through `backend/src/lib/db` (a Prisma-style repository). The engine (`lib/db/engine.ts`) loads records from the ArcGIS feature service and filters, sorts and joins them in the backend; each write, including nested writes, is sent as one `applyEdits` call, so it applies completely or not at all. `lib/db/schema.json` defines the fields and relationships.

Only the backend calls the service, with an OAuth application credential. User passwords are salted scrypt hashes; sessions are JWT cookies. Uploaded files are attachments of upload records, and file viewers receive expiring application links. Page views never return password or signature-PIN hashes.

## Validation

```bash
npm run lint          # TypeScript checks of backend and frontend
npm test              # backend and frontend tests
npm run build         # backend bundle and Next.js standalone build
```

## Project structure

- `backend/src/server.ts`: Fastify server: same-origin check for writes, session renewal, routes, page views, `/api/auth/me`, `/healthz`.
- `backend/src/routes/`: API handlers; `npm --prefix backend run routes` regenerates `routes/index.ts` after adding or removing one.
- `backend/src/views/<area>/`: page views per portal; `define.ts` and `mask.ts` hold the helpers.
- `backend/src/lib/`: `auth` (sessions, `getApiUser`, `canAccessReport`), `db` (repository, ArcGIS client, schema, storage), `reports`, `map`.
- `backend/scripts/`, `backend/tests/`: maintenance scripts and tests.
- `frontend/app/`: pages. Each portal (`admin`, `reviewer`, `evaluator`, `sender`) and the shared `report` and `profile` areas have a `layout.tsx` that checks the user's role and renders the sidebar and header (`components/layout/AppShell.tsx`).
- `frontend/proxy.ts`: early redirect of signed-out visitors away from the portals (the backend still checks every request).
- `frontend/components/`, `frontend/lib/`: UI and browser helpers.
- `shared/`: code both sides use (`nav.ts`, `constants.ts`, `utils.ts`, `auth/roles.ts`, `reports/*`, `db/models.ts`, `views/*`).
- `nginx/default.conf`, `docker-compose.yml`, `*/Dockerfile`: deployment.

## UI Design

- **Primary Navy:** #0B2A4A
- **Button Navy:** #0F4C81
- **Aqua Accent:** #22D3EE
- **Background:** #EAFBFF
- **Surfaces:** #FFFFFF

## Status Badges

- Ноорог (Draft) - Gray
- Илгээгдсэн (Submitted) - Blue
- Гишүүдэд оноосон (Assigned) - Cyan
- Хянагдаж байна (In Review) - Yellow
- Засвар шаардсан (Needs Revision) - Orange
- Үнэлгээ дууссан (Completed) - Green
- Батлагдсан (Approved) - Green
- Татгалзсан (Rejected) - Red

## License

Proprietary
