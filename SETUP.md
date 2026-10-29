# ArcGIS setup

The application stores all operational data and uploaded files in a private ArcGIS feature service (`Hosted/Tailan` on `environment.ub.gov.mn`). Each model in `lib/db/schema.json` is one table named `tailan_<model>` whose fields carry an `app_` prefix; report locations are a point layer. Uploaded files are attachments of `tailan_upload` records. Next.js talks to the service only from the server with an OAuth application credential, so records and the token never reach the browser.

## 1. Install

Use Node.js 20.12 or later and run `npm install`.

## 2. Configure

Add the server values to `.env.local` (see `.env.example`):

```env
JWT_SECRET="<random string>"
ARCGIS_PORTAL_URL="https://environment.ub.gov.mn/gis"
ARCGIS_DATA_SERVICE_URL="https://environment.ub.gov.mn/hosting/rest/services/Hosted/Tailan/FeatureServer"
ARCGIS_CLIENT_ID="<OAuth application client ID>"
ARCGIS_CLIENT_SECRET="<OAuth application client secret>"
ARCGIS_HTTP_REFERER="<app URL, if the credential is referrer-restricted>"
```

The service item must stay private and the OAuth application needs edit access to it.

## 3. Schema changes

Fields and relationships are defined in `lib/db/schema.json`, and `lib/db/models.ts` holds the matching TypeScript types. After editing the schema, update `models.ts` and add the new tables and fields to the service:

```bash
npm run arcgis:provision -- --dry-run   # lists what is missing
npm run arcgis:provision                # adds missing tables, fields and indexes
```

Provisioning only adds; it never removes or changes existing fields or records. It needs `ARCGIS_ADMIN_TOKEN`, a token of the service owner (the OAuth application credential cannot change the service definition). Generate one at `https://environment.ub.gov.mn/gis/sharing/rest/generateToken` with referer set to the value of `ARCGIS_HTTP_REFERER`.

## 4. Copy data from Convex (one time)

From 2026-10-15 the data lived in Convex. To move it back, provision the service first, then run, with `CONVEX_URL` and `CONVEX_SERVER_SECRET` still in `.env.local`:

```bash
npm run migrate:convex -- --dry-run   # read only: record counts on both sides
npm run migrate:convex -- --replace   # back up, clear and refill the ArcGIS tables
```

Without `--replace` the script refuses to run while any `tailan_` table has records. With it, the current ArcGIS records are saved to `backups/arcgis-<time>.json` first. Record IDs and timestamps are kept, files are copied into attachments, and `convex-upload:` file references become `upload:` references. Afterwards delete the `CONVEX_*` values.

## 5. Deploying (Vercel or any Node host)

Set these environment variables for every environment that runs the app (Production and Preview on Vercel):

- `JWT_SECRET`
- `ARCGIS_PORTAL_URL`
- `ARCGIS_DATA_SERVICE_URL`
- `ARCGIS_CLIENT_ID`
- `ARCGIS_CLIENT_SECRET`
- `ARCGIS_HTTP_REFERER` (if the credential is referrer-restricted)
