# Repository Guidelines

## Project Structure & Module Organization

This is a private Next.js App Router project for a report submission and evaluation system. Route pages and API handlers live under `app/`; major user areas include `app/sender`, `app/reviewer`, `app/evaluator`, `app/admin`, `app/geography`, and `app/api`. Reusable UI lives in `components/`. Shared utilities, auth, Prisma access, map helpers, constants, and clients live in `lib/`. Database schema and seed scripts are in `prisma/`. Static files belong in `public/`; local uploads under `public/uploads` are ignored.

## Build, Test, and Development Commands

- `npm install`: install dependencies and run `postinstall`, which generates the Prisma client.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: run `prisma generate` and create a production Next.js build.
- `npm run start`: serve the production build locally.
- `npm run lint`: run the configured Next.js lint command.
- `npm run prisma:generate`: regenerate Prisma client after schema changes.
- `npm run prisma:seed`: seed the database with sample data.
- `npx prisma migrate dev --name <change>`: create and apply a local migration.

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode enabled. Prefer React function components and keep component files in PascalCase, for example `StatusBadge.tsx` or `ReportTable.tsx`. Utility modules in `lib/` use camelCase filenames, such as `reviewedLocations.ts`. Use the `@/` path alias for project-root imports. Follow the existing two-space indentation style, Tailwind utility classes for styling, and small typed props objects for components.

## Testing Guidelines

There is no first-party test suite checked in yet. For now, validate changes with `npm run lint`, `npm run build`, and targeted manual checks through the relevant role flow. When adding tests, colocate them near the feature or use a root `tests/` directory, and name files after the behavior, such as `report-submission.test.ts`.

## Commit & Pull Request Guidelines

Recent commit messages are short and informal, so keep new commits concise but descriptive, for example `fix report return flow` or `add evaluator map filters`. Pull requests should include a summary, affected role or route, database or environment changes, screenshots for UI changes, and verification commands. Link related issues when available.

## Security & Configuration Tips

Keep secrets in `.env` or `.env.local`; these files are ignored. Required local values include `DATABASE_URL` and `JWT_SECRET`. Do not commit generated build output, `node_modules`, local uploads, or database credentials. Run `npm run prisma:generate` after changing `prisma/schema.prisma`.
