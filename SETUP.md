# Convex setup

`main` uses the Convex database at `https://hearty-caterpillar-651.convex.cloud` and its HTTP Actions origin `https://hearty-caterpillar-651.convex.site`. The complete ArcGIS-backed application is preserved on `arcgis-feature-service`.

## Local configuration

Use Node.js 20.19 or newer and run `npm install`. Copy the values from `.env.example` into `.env.local` and set:

- `JWT_SECRET`: session and private attachment-link signing secret.
- `CONVEX_DEPLOYMENT=dev:hearty-caterpillar-651`: the CLI deployment selector.
- `CONVEX_URL=https://hearty-caterpillar-651.convex.cloud`: server-side query/mutation endpoint.
- `CONVEX_SITE_URL=https://hearty-caterpillar-651.convex.site`: HTTP Actions origin.
- `CONVEX_SERVER_SECRET`: at least 32 random characters, shared only by Next.js and Convex.
- `APP_URL`: the app's public origin, used in signer QR codes.
- `TRUST_PROXY_HOPS`: number of trusted reverse proxies, default 1.

Keep all credentials in ignored environment files. Never put the server secret in a `NEXT_PUBLIC_*` variable. Existing sessions use the same JWT secret after migration.

## Deploy functions and add missing reference data

Authenticate the Convex CLI with the deployment's existing account, or use a deployment-scoped deploy key. Set `CONVEX_SERVER_SECRET` in the deployment's environment to match the local server. The CLI supports reading a value with `convex env set CONVEX_SERVER_SECRET --from-file <private-file>`.

```bash
npm run convex:push
npm run setup
npm run db:verify
npm run dev
```

`convex:push` deploys to the configured development deployment. Production uses `npm run convex:deploy` with the production deployment's deploy key, URL, and server secret. Do not point the application at a different deployment than the one you deploy functions to.

`setup` safely adds missing core report types and plan/performance scoring sheets for every category. It does not create fictional business reports, scores, or signatures. The admin dashboard lists remaining setup problems.

The application continues to use `lib/db` throughout. It converts JavaScript dates to epoch milliseconds at the Convex boundary. Every function authenticates the server secret; private storage URLs stay on the server and file viewers receive expiring application links. Login and signature attempt counters run atomically in Convex, with the existing local outage fallback.

## ArcGIS-to-Convex cutover

Retain the ArcGIS credentials in `.env.local` only while copying the archived data. The application itself no longer reads ArcGIS records. Basemaps/geocoding are separate from database storage.

```bash
npm run db:backup
npm run migrate:convex -- --backup=backups/convex-cutover-<timestamp>
npm run migrate:convex -- --backup=backups/convex-cutover-<timestamp> --apply
npm run setup
```

The backup stores both databases and their file bytes privately under the ignored `backups/` directory. The migration defaults to a dry run. It retains all reports, report IDs, scoring records, and upload IDs from both databases. Matching company registrations, account emails, and report-type slugs are consolidated to the active ArcGIS identities, with references updated. It refuses to silently remap an evaluator who has signed an evaluation.

Colliding report numbers receive fresh `RPT-<year>-<sequence>` numbers; `merge-plan.json` records the original/new mapping. Historical criteria remain stored for existing scores but are deactivated where the current source sheet replaces them. Signed evaluation hashes and signature IDs remain intact. Both `upload:` and historical `convex-upload:` references work.

The importer checkpoints uploaded files, aborts if data changed since backup, verifies every merged record, and compares every stored file against its original bytes. All record changes commit in one transaction. Re-running the same completed import skips the merge. It never deletes ArcGIS records. Keep both databases quiet during the final merge; after cutover, write only to Convex.

## Schema and deployment checks

Edit `lib/db/schema.json` and the corresponding `lib/db/models.ts` types together, then run `npm run convex:push`. Nullable fields are optional in the Convex schema so existing documents remain valid when a new nullable field is added.

```bash
npm test
npm run lint
npm run build
```

On a host that restricts Turbopack's build-worker ports, use `npm run build -- --webpack`.

For a deployed Next.js host, set `JWT_SECRET`, `CONVEX_URL`, `CONVEX_SITE_URL`, `CONVEX_SERVER_SECRET`, `APP_URL`, and (when needed) `TRUST_PROXY_HOPS`. Convex schema/functions are deployed separately using the matching CLI credentials. An HTTP 503 during login means the database lookup failed; check the deployment URL, shared secret, deployed functions, and network access.
