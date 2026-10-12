# Тайлан илгээх, үнэлгээ өгөх систем

Official report submission and evaluation system for managing reports, reviews, scoring, and geographic information.

## Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data and files:** Private ArcGIS Feature Service and attachments
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

Use Node.js 20.12 or newer. Install with `npm install`, then follow [SETUP.md](SETUP.md) to create a private ArcGIS service and its empty tables. PostgreSQL and Supabase are no longer runtime dependencies.

```bash
npm run arcgis:create     # create private service and empty application schema
npm run arcgis:bootstrap  # optional: create the first administrator
npm run dev
```

There are no demo accounts or imported records. Configure the bootstrap account in your local environment before running its command.

## Data flow

Every application page and API reads/writes through `lib/arcgis/data.ts`. The repository uses ArcGIS REST queries and service-level `applyEdits`, including nested writes with rollback. `lib/arcgis/schema.json` defines the fields and relationships; no Prisma client is loaded.

The private service contains a locations point layer, ten application tables, and an uploads table with attachments. Keeping locations separate preserves the application's existing record structure. User passwords are salted scrypt hashes. The service credential stays on the server; file viewers receive expiring application links.

Survey records (layer 0 and the `repeat_1` table) live in the same private service and use the same credential. No data is read from other ArcGIS services.

## Validation

```bash
npm run lint          # TypeScript validation; replaces the removed next lint command
npm test              # repository, storage, authentication, and schema tests
npm run build
npm run arcgis:verify # live service schema and privacy checks
```

## Project structure

- `app/`: role pages and API handlers
- `components/`: reusable UI
- `lib/arcgis/`: data repository, record types, schema, transport, and attachment storage
- `scripts/arcgis.cjs`: service creation, provisioning, verification, and first-account setup

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
