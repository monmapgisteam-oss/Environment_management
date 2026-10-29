# Repository Guidelines

## Project Structure & Module Organization

This is a private Next.js App Router project for a report submission and evaluation system. Route pages and API handlers live under `app/`; major user areas include `app/sender`, `app/reviewer`, `app/evaluator`, `app/admin`, `app/geography`, and `app/api`. Each portal has a `layout.tsx` that checks the role and renders the shared sidebar and header (`components/layout/AppShell.tsx`); pages render only their `<main>`. Sidebar menus live in `lib/nav.ts`. Reusable UI lives in `components/`, grouped by feature folder (`layout`, `ui`, `reports`, `map`, and so on). Shared helpers live in `lib/` feature folders: `lib/auth`, `lib/reports`, `lib/map`, `lib/survey`; `lib/constants.ts` and `lib/utils.ts` stay at the top level. All application data and files are stored in the private ArcGIS feature service `Hosted/Tailan` (tables `tailan_<model>`, files as attachments of `tailan_upload`): the repository engine, ArcGIS client, schema, and storage helpers live in `lib/db/`, and the provisioning and one-time Convex migration scripts in `scripts/`. Static files belong in `public/`; local uploads under `public/uploads` are ignored.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production Next.js build.
- `npm run start`: serve the production build locally.
- `npm run lint`: type-check the project with `tsc --noEmit`.
- `npm test`: run the repository engine tests in `tests/`.
- `npm run arcgis:provision`: add tables, fields, and indexes from `lib/db/schema.json` that the ArcGIS service lacks (`-- --dry-run` to list them).

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode enabled. Prefer React function components and keep component files in PascalCase, for example `StatusBadge.tsx` or `ReportTable.tsx`. Utility modules in `lib/` use camelCase filenames, such as `reviewedLocations.ts`. Use the `@/` path alias for project-root imports. Follow the existing two-space indentation style, Tailwind utility classes for styling, and small typed props objects for components.

## Testing Guidelines

Tests live in `tests/` and run with `npm test` (Node test runner; `.ts` files load through `scripts/register-typescript.cjs`). Name files after the behavior, such as `sidebar-nav.test.cjs`. Also validate changes with `npm run lint`, `npm run build`, and targeted manual checks through the relevant role flow.

## Commit & Pull Request Guidelines

Recent commit messages are short and informal, so keep new commits concise but descriptive, for example `fix report return flow` or `add evaluator map filters`. Pull requests should include a summary, affected role or route, database or environment changes, screenshots for UI changes, and verification commands. Link related issues when available.

## Security & Configuration Tips

New pages under a portal are protected by that portal's layout and `proxy.ts`. New API routes must check the caller themselves with `getApiUser(...roles)` from `@/lib/auth` and return `unauthorized()` when it is null; for report data, also call `canAccessReport`.

Keep secrets in `.env` or `.env.local`; these files are ignored. Required local values include `JWT_SECRET`, `ARCGIS_PORTAL_URL`, `ARCGIS_DATA_SERVICE_URL`, `ARCGIS_CLIENT_ID`, and `ARCGIS_CLIENT_SECRET` (plus `ARCGIS_HTTP_REFERER` when the credential is referrer-restricted). Do not commit generated build output, `node_modules`, local uploads, or secrets. After changing `lib/db/schema.json`, update `lib/db/models.ts` and run `npm run arcgis:provision` (needs a service owner token in `ARCGIS_ADMIN_TOKEN`).
