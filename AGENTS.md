# Repository Guidelines

## Project Structure & Module Organization

This is a private Next.js App Router project for a report submission and evaluation system. Route pages and API handlers live under `app/`; major user areas include `app/sender`, `app/reviewer`, `app/evaluator`, `app/admin`, `app/geography`, and `app/api`. Reusable UI lives in `components/`. Shared utilities, auth, map helpers, constants, and clients live in `lib/`. All application data is stored in a private ArcGIS Enterprise Feature Service: the data repository, schema, and transport live in `lib/arcgis/`, and provisioning scripts are in `scripts/`. Static files belong in `public/`; local uploads under `public/uploads` are ignored.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production Next.js build.
- `npm run start`: serve the production build locally.
- `npm run lint`: type-check the project with `tsc --noEmit`.
- `npm run arcgis:provision`: add missing application tables to the Feature Service (needs `ARCGIS_ADMIN_TOKEN`).
- `npm run arcgis:verify`: check that the Feature Service matches `lib/arcgis/schema.json`.

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode enabled. Prefer React function components and keep component files in PascalCase, for example `StatusBadge.tsx` or `ReportTable.tsx`. Utility modules in `lib/` use camelCase filenames, such as `reviewedLocations.ts`. Use the `@/` path alias for project-root imports. Follow the existing two-space indentation style, Tailwind utility classes for styling, and small typed props objects for components.

## Testing Guidelines

There is no first-party test suite checked in yet. For now, validate changes with `npm run lint`, `npm run build`, and targeted manual checks through the relevant role flow. When adding tests, colocate them near the feature or use a root `tests/` directory, and name files after the behavior, such as `report-submission.test.ts`.

## Commit & Pull Request Guidelines

Recent commit messages are short and informal, so keep new commits concise but descriptive, for example `fix report return flow` or `add evaluator map filters`. Pull requests should include a summary, affected role or route, database or environment changes, screenshots for UI changes, and verification commands. Link related issues when available.

## Security & Configuration Tips

Keep secrets in `.env` or `.env.local`; these files are ignored. Required local values include `JWT_SECRET`, `ARCGIS_PORTAL_URL`, `ARCGIS_DATA_SERVICE_URL`, `ARCGIS_CLIENT_ID`, `ARCGIS_CLIENT_SECRET`, and `ARCGIS_HTTP_REFERER`. Do not commit generated build output, `node_modules`, local uploads, or ArcGIS credentials. Run `npm run arcgis:provision` after changing `lib/arcgis/schema.json`.
