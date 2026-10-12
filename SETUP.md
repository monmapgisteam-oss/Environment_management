# ArcGIS setup

The application stores all operational data and uploaded files in a new **private hosted Feature Service**. Setup starts with empty tables. It does not copy or modify the old PostgreSQL database or Supabase bucket.

For a disposable, public test service only, set `ARCGIS_ALLOW_PUBLIC_TEST_SERVICE=true` before provisioning. This bypasses the privacy check, but does not grant schema-administration access and must never be used with real user records, password/PIN hashes, notifications, or uploads.

## 1. Install

Use Node.js 20.12 or later and run `npm install`.

## 2. Configure provisioning credentials

Put these values in `.env.local` (or the existing local `env` file for command-line setup):

```env
ARCGIS_PORTAL_URL="https://www.arcgis.com"
ARCGIS_OWNER="your-arcgis-username"
ARCGIS_ADMIN_TOKEN="your-owner-or-admin-token"
ARCGIS_SERVICE_NAME="tailan_app"
```

The account must be able to create hosted feature services and modify their schema. Keep credentials out of source control and out of `NEXT_PUBLIC_*` variables.

For an existing private service, you can obtain the provisioning credential through `npm run arcgis:login`. Configure the client ID/secret and service URL first, register `http://localhost:3000/` as the OAuth redirect URL, and stop any development server using port 3000. Open the local link and sign in as the service owner or an organization administrator. The helper uses authorization code flow with PKCE and state validation, verifies administration access, and saves only the provisioning token locally. It does not create tables; run `npm run arcgis:provision` afterward.

If the runtime credential only supports app authentication, register a separate OAuth credential for **user authentication** and configure `ARCGIS_OWNER_CLIENT_ID` (and `ARCGIS_OWNER_CLIENT_SECRET` if required). The owner login helper uses these values without changing runtime app authentication. Register the callback in **Redirect URLs**, independently of **Allowed referrers**. `npm run arcgis:login -- --restore-dev` restarts the project development server when sign-in completes or times out.

Run:

```bash
npm run arcgis:create
```

This creates a private service, writes its URL and server credential to `.env.local`, generates a JWT secret if missing, and provisions the empty datasets. It refuses to use a service shared publicly or with the organization. It never deletes existing datasets. If interrupted, rerun the command using the saved service URL.

If you create the private service manually, configure `ARCGIS_DATA_SERVICE_URL`, `ARCGIS_DATA_TOKEN`, `ARCGIS_ADMIN_TOKEN`, `ARCGIS_PORTAL_URL`, and `JWT_SECRET`, then run `npm run arcgis:provision`.

`npm run arcgis:schema` prints the proposed layer/table definitions without contacting ArcGIS.

## 3. Schema

| Dataset | Purpose |
| --- | --- |
| `tailan_company` | Companies and registration numbers |
| `tailan_user` | User profiles, roles, password hashes, signature PIN hashes |
| `tailan_reportType` | Report categories |
| `tailan_report` | Reports, statuses, greenery, spending, attachment references |
| `tailan_reportLocation` | Point layer: addresses and coordinates |
| `tailan_evaluationCriterion` | Scoring criteria |
| `tailan_reportAssignment` | Staff assignments and deadlines |
| `tailan_evaluation` | Evaluations and signature metadata |
| `tailan_evaluationScore` | Per-criterion scores |
| `tailan_notification` | User notifications |
| `tailan_activityLog` | Activity history |
| `tailan_upload` | Upload ownership, filename, and binary attachments |

There is one spatial layer and eleven tables in a single service. The extra upload table supports files uploaded before the sender creates a report. Table IDs are discovered by name, not hardcoded. Application fields use the `app_` prefix to avoid reserved ArcGIS field names. `app_id` and foreign-key strings link records; joins are handled by the repository rather than native relationship classes. Unique indexes enforce IDs, email addresses, registration numbers, report numbers, assignment/evaluation links, and signature IDs.

Nested report/location and evaluation/score writes are submitted in a single service-level edit with `rollbackOnFailure=true`. Separate workflow API calls are not database transactions. Direct edits in ArcGIS must preserve the application IDs and references; ArcGIS does not enforce these foreign keys automatically.

## 4. First account

The tables remain empty until you explicitly create an account or submit data. To enable login, configure:

```env
ARCGIS_BOOTSTRAP_EMAIL="your-admin-email"
ARCGIS_BOOTSTRAP_NAME="Administrator"
ARCGIS_BOOTSTRAP_PASSWORD="a-long-unique-password"
```

Then run `npm run arcgis:bootstrap`. This creates only the first administrator and refuses to run again once users exist. It stores a salted scrypt hash, never the plain password. Remove the bootstrap password from the environment afterward.

The existing application does not provide account creation UI. Additional users/companies must be provisioned through the typed repository or a trusted server-side administration script; passwords must be produced with `hashPassword` from `lib/password.ts`. Add report types through the admin settings page. Configure evaluation criteria in ArcGIS before assigning scores.

## 5. Runtime and deployment

The app requires a service URL, JWT secret, and either an OAuth client ID/secret or a static service token:

```env
ARCGIS_DATA_SERVICE_URL="https://.../FeatureServer"
ARCGIS_CLIENT_ID="your-oauth-client-id"
ARCGIS_CLIENT_SECRET="your-oauth-client-secret"
JWT_SECRET="a-long-random-secret"
```

The OAuth application must have access to the private service and the required feature editing privileges. The server exchanges its client ID/secret for an access token, shares concurrent refresh requests, and renews the token one minute before it expires. The secret and access tokens never go to the browser. OAuth takes precedence when both client values are configured. Token issuance alone does not prove that the application can access or administer a particular feature service.

If the credential restricts allowed HTTP Referers, set `ARCGIS_HTTP_REFERER` to the exact permitted URL, such as `http://localhost:3000/`. All authenticated service, attachment, and setup requests include that header. This is separate from the OAuth redirect URI. A valid application token may query the service but still receive 403 for schema administration; use the owner sign-in helper for that step.

Alternatively, omit both OAuth client values and set `ARCGIS_DATA_TOKEN` to a server-side token with query/edit access. Static tokens require manual rotation. `ARCGIS_ADMIN_TOKEN` is a separate owner/admin credential used for provisioning; an OAuth application token may lack schema administration permission. The application reports token failures rather than silently falling back to PostgreSQL, Supabase, or in-memory data. Configure runtime variables on your deployment platform as well; `.env.local` is not committed.

Use `node scripts/arcgis.cjs inspect-auth` to diagnose OAuth access to the portal, service, and administration endpoints without printing credentials. `node scripts/arcgis.cjs inspect` checks service privacy and administration access using the provisioning credential.

Run `npm run dev` and open `http://localhost:3000`. The normal Next.js runtime reads `.env.local`; the legacy `env` filename is loaded only by setup tooling.

Uploads are ArcGIS attachments. Durable references are stored in report records; viewers get signed `/api/attachments` links valid for one hour. The proxy streams file bytes without exposing the ArcGIS token. File uploads require an authenticated user.

Survey records live in the same private service: layer 0 holds one point per report and the `repeat_1` table holds one score row per evaluator. Run `npm run arcgis:survey-schema` (needs `ARCGIS_ADMIN_TOKEN`) to create the survey fields and table on a new service. Browsers read survey points through `/api/survey/features` and photos through `/api/survey/attachments/...`, so the service token stays on the server. Set `ARCGIS_SYNC_DISABLED=true` to disable score writes to the survey records.

## 6. Verification

```bash
npm run lint
npm test
npm run build
npm run arcgis:verify
```

The first three checks run without live service credentials. `arcgis:verify` checks the actual service's privacy, fields, unique indexes, geometry, attachments, and pagination support. Before deploying, exercise sender upload/submission, manager assignment, evaluator scoring/signing, notifications, and signed-scan download with real role accounts. Mocked tests do not substitute for that live acceptance check.

Reference: [ArcGIS service edits](https://developers.arcgis.com/rest/services-reference/enterprise/apply-edits-feature-service/) and [schema provisioning](https://developers.arcgis.com/rest/services-reference/online/add-to-definition-feature-service/).
