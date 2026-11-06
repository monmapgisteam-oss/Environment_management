# Байгаль орчны менежментийн төлөвлөгөөний систем

Official report submission and evaluation system for managing reports, reviews, scoring, and geographic information.

## Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data and files:** Convex database and file storage, accessed only from the server
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

Use Node.js 20.19 or newer. Install with `npm install`, then follow [SETUP.md](SETUP.md) to configure Convex.

For Vercel, the root `vercel.json` configures a single `web` service for the Next.js pages and API routes, with Convex hosted externally. See [Vercel service deployment](SETUP.md#vercel-service-deployment) for environment variables and `vercel dev --local` instructions.

```bash
npm run convex:push         # deploy functions, tables and indexes to the configured dev deployment
npm run setup               # add missing core types and category scoring sheets
npm run seed:criteria       # once per deployment: scoring sheets for each report category
npm run seed:report-types   # core report types; folds Survey123-made types into them
npm run fix:locations       # fills missing province/district of saved report locations from their coordinates
npm run fix:signatures      # once after upgrading: clears signature PINs older versions stored in plaintext
python3 -I scripts/split-sample-tables.py public/samples/bomt-zagvaruud.pdf   # regenerates public/samples/<category>/*.pdf (needs PyMuPDF) after replacing the regulation PDF
SEED_PASSWORD=... npm run seed:evaluators   # 10 evaluator accounts staff1..staff10@tailan.mn
npm run dev
```

## Data flow

Every application page and API reads/writes through `lib/db` (a Prisma-style repository). The shared engine (`lib/db/engine.ts`) runs inside authenticated Convex queries and mutations. Nested writes commit as one Convex transaction. `lib/db/schema.json` defines fields and relationships, and `convex/schema.ts` derives the deployment tables and indexes from it.

`main` uses Convex at `https://hearty-caterpillar-651.convex.cloud`. The `arcgis-feature-service` branch preserves the ArcGIS application at the cutover commit. Maps still use Esri basemaps and geocoding independently of database storage.

Only the Next.js server calls the Convex functions, authenticated with `CONVEX_SERVER_SECRET`. User passwords are salted scrypt hashes; sessions are JWT cookies. Uploaded files live in Convex storage and belong to upload records, and file viewers receive expiring application links.

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
- `lib/db/`: repository engine and Convex client, record types, schema, file storage, and login rate-limit counters.
- `convex/`: authenticated data, file storage, atomic rate-limit counters, and migration functions.
- `scripts/backup-databases.cjs`: private record and file backups.
- `scripts/migrate-arcgis-to-convex.cjs`: resumable merge with identity, relation, and file verification.
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
