# Байгаль орчны менежментийн төлөвлөгөөний систем

Official report submission and evaluation system for managing reports, reviews, scoring, and geographic information.

## Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data and files:** private ArcGIS feature service (tables and attachments), accessed only from the server
- **Authentication:** JWT with session cookies

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

## Setup

Use Node.js 20.12 or newer. Install with `npm install`, then follow [SETUP.md](SETUP.md) to configure the ArcGIS service.

```bash
npm run arcgis:provision    # adds tables and fields from lib/db/schema.json that the service lacks
npm run migrate:convex      # one time: copy the Convex data into the ArcGIS service
npm run seed:criteria       # once per deployment: scoring sheets for each report category
npm run seed:report-types   # core report types; folds Survey123-made types into them
npm run fix:locations       # fills missing province/district of saved report locations from their coordinates
npm run fix:signatures      # once after upgrading: clears signature PINs older versions stored in plaintext
python3 -I scripts/split-sample-tables.py public/samples/bomt-zagvaruud.pdf   # regenerates public/samples/<category>/*.pdf (needs PyMuPDF) after replacing the regulation PDF
SEED_PASSWORD=... npm run seed:evaluators   # 10 evaluator accounts staff1..staff10@tailan.mn
npm run dev
```

## Data flow

Every application page and API reads/writes through `lib/db` (a Prisma-style repository). The engine (`lib/db/engine.ts`) loads records from the ArcGIS feature service and filters, sorts and joins them on the server; each write, including nested writes, is sent as one `applyEdits` call, so it applies completely or not at all. `lib/db/schema.json` defines the fields and relationships.

Only the Next.js server calls the service, with an OAuth application credential. User passwords are salted scrypt hashes; sessions are JWT cookies. Uploaded files are attachments of upload records, and file viewers receive expiring application links.

## Validation

```bash
npm run lint          # TypeScript validation; replaces the removed next lint command
npm test              # repository engine tests
npm run build
```

## Project structure

- `app/`: pages and API handlers. Each portal (`admin`, `reviewer`, `evaluator`, `sender`) and the shared `report` and `profile` areas have a `layout.tsx` that checks the user's role and renders the sidebar and header (`components/layout/AppShell.tsx`). Pages render only their `<main>` content.
- `proxy.ts`: redirects requests without a valid session away from the portals before they render.
- `components/`: UI grouped by feature: `layout`, `ui`, `auth`, `reports`, `evaluation`, `submit`, `map`, `survey`, `conclusions`, `signature`, `admin`.
- `lib/auth/`: session tokens (`session.ts`), `getCurrentUser`, `requireUser` for pages, `getApiUser` for API routes, and report access checks.
- `lib/nav.ts`: sidebar menus for every portal.
- `lib/reports/`, `lib/map/`, `lib/survey/`: domain helpers.
- `lib/db/`: repository engine and ArcGIS client, record types, schema, file storage, and login rate-limit counters.
- `scripts/arcgis-provision.mjs`: adds missing tables and fields to the service.
- `scripts/migrate-convex-to-arcgis.mjs`: one-time Convex to ArcGIS data copy.
- `tests/`: Node test runner tests (`npm test`).

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
