# Байгаль орчны менежментийн төлөвлөгөөний систем

Official report submission and evaluation system for managing reports, reviews, scoring, and geographic information.

## Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data and files:** Convex (database and file storage), accessed only from the server
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

Use Node.js 20.12 or newer. Install with `npm install`, then follow [SETUP.md](SETUP.md) to link a Convex deployment and copy the data from ArcGIS.

```bash
npx convex dev --once       # link the deployment and push functions and schema
npm run migrate:arcgis      # one time: copy ArcGIS data into an empty deployment
npm run seed:criteria       # once per deployment: scoring sheets for each report category
npm run dev
```

## Data flow

Every application page and API reads/writes through `lib/db` (a Prisma-style repository). Queries run inside Convex (`convex/engine.ts`), so each write, including nested writes, is a single transaction. `lib/db/schema.json` defines the fields and relationships.

Convex functions are called only by the Next.js server and check `CONVEX_SERVER_SECRET`. User passwords are salted scrypt hashes; sessions are JWT cookies. Uploaded files live in Convex storage, and file viewers receive expiring application links.

Survey123 records (layer 0 features and layer 1 evaluator rows) and their photos were copied from ArcGIS into Convex. New Survey123 field-app submissions no longer reach the app.

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
- `lib/db/`: data repository client, record types, schema, file storage, and survey records.
- `convex/`: Convex schema, repository engine, and server-only functions.
- `scripts/migrate-arcgis-to-convex.mjs`: one-time ArcGIS to Convex data copy.
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
