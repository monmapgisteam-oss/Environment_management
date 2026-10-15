# Convex setup

The application stores all operational data, uploaded files, and the copied Survey123 records in a [Convex](https://convex.dev) deployment. Next.js talks to Convex only from the server, and every Convex function checks a shared secret, so records never reach the browser directly.

## 1. Install

Use Node.js 20.12 or later and run `npm install`.

## 2. Link a Convex deployment

```bash
npx convex dev --once
```

The first run asks you to log in and choose a project, then writes `CONVEX_DEPLOYMENT` and the deployment URLs to `.env.local`. It also pushes the functions in `convex/` and the schema generated from `lib/db/schema.json`.

Add the server values to `.env.local`:

```env
JWT_SECRET="<random string>"
CONVEX_URL="https://<deployment>.convex.cloud"
CONVEX_SERVER_SECRET="<random string, 32+ characters>"
```

Set the same secret on the Convex deployment:

```bash
npx convex env set CONVEX_SERVER_SECRET "<same value>"
```

## 3. Copy data from ArcGIS (one time)

The data previously lived in a private ArcGIS Feature Service. To copy it, run the script from a machine that can reach the ArcGIS portal, with the old `ARCGIS_*` values still in `.env.local`:

```bash
npm run migrate:arcgis -- --dry-run   # read only: prints what would be copied
npm run migrate:arcgis                # copies tables, survey records and files
```

The script refuses to run if any Convex table already has data. It keeps record IDs, converts dates to epoch milliseconds, moves upload files and Survey123 photos into Convex storage, and rewrites `arcgis-attachment:` file references to `convex-upload:` references. Survey layer 0 stays layer 0; the `repeat_1` table becomes layer 1.

After a successful copy you can delete the `ARCGIS_*` values.

## 4. Schema changes

Fields and relationships are defined in `lib/db/schema.json`. `convex/schema.ts` builds the Convex tables and indexes from it, and `lib/db/models.ts` holds the matching TypeScript types. After editing the schema, update `models.ts` and run `npx convex dev --once` (or `npm run convex:deploy` for a production deployment).

## 5. Deploying (Vercel or any Node host)

Set these environment variables for every environment that runs the app (Production and Preview on Vercel):

- `JWT_SECRET`
- `CONVEX_URL`
- `CONVEX_SERVER_SECRET`

Push Convex function changes before deploying the app that depends on them.
