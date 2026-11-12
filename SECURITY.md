# Security

This system holds sensitive records. This file lists the protections built into the code and the steps that only the people running it can take. Keep both halves true: a strong application on an unprotected server is not protected.

## Built in

### Architecture
- **Backend:** only the backend (Fastify) holds secrets and talks to the ArcGIS feature service.
- **Frontend:** the frontend has no secrets and no outside network access.
- **Proxy:** nginx is the only published port.
- **Containers:**
  - run as non-root on read-only file systems;
  - drop all capabilities and set `no-new-privileges`;
  - have memory and process limits;
  - use base images pinned by digest.
- **Backend environment:** the backend receives only the variables listed in `docker-compose.yml`. The ArcGIS owner token never reaches it.

### Sign-in and sessions
- **Password storage:** scrypt (N=2^15, r=8, p=3), timing-safe compare, and the same delay for unknown emails. Older hashes are replaced on the next sign-in.
- **Password rules:** at least 12 characters; common and trivial passwords are refused, as are passwords that contain the email name.
- **Login attempts:**
  - 30 per 15 minutes per address;
  - 10 failures per account per address;
  - 100 failures per account overall;
  - checked one at a time per account;
  - nginx adds its own per-address limit.
- **Session cookie:** `__Host-tailan_session`, `HttpOnly`, `Secure` and `SameSite=Lax`.
- **Session token:** an HS256 JWT signed with a key used only for sessions.
- **Session lifetime:**
  - a session ends after 2 hours without activity;
  - it always ends 12 hours after sign-in;
  - a password change or reset ends every other session.
- **Logout:** ends the session on the server, so a copied cookie stops working. The profile page also has "sign out everywhere".
- **Deactivated accounts:** lose access on their next request.
- **Signature PIN:** system-issued 6 digits, hashed. After 5 wrong PINs in 15 minutes, signing is locked, and attempts are checked one at a time.

### Access control
- **API routes:** every route checks role and object access (`getApiUser`, `canAccessReport`).
- **Page views:** they check roles and access again, and return only what the page shows.
- **Never returned:** password, PIN or signature hashes.
- **Senders:** see only their company's reports, and no scores until the manager releases them.
- **Evaluators:**
  - see only assigned reports, and only their own scores;
  - see no combined score and no colleagues before release;
  - open conclusions only of approved companies.
- **Company approval:** decisions follow the allowed states only. A rejected sign-up cannot hold a real company's register number.

### Requests and files
- **Cross-site writes:** refused (`Sec-Fetch-Site` / `Origin` check on every non-GET API call).
- **Request bodies:** JSON bodies are capped at 1 MB and uploads at 25 MB. nginx rejects larger ones first, and also enforces timeouts and a method allow-list.
- **Uploads:**
  - the file type is detected from its bytes (PDF, PNG, JPEG) and stored with that type;
  - limited to 60 per hour per user.
- **Attaching files:** a sender may attach only their company's own uploads that no other report uses. Files still used by a report are never deleted.
- **File links:**
  - expire after 15 minutes;
  - are bound to the session that opened the page;
  - are signed with their own key;
  - are served with `nosniff`, a sandbox CSP and `no-referrer`.
- **Logs:** request logs never contain query strings.
- **Clean-up:** unused uploads are deleted after 7 days; expired counters daily.

### Browser
- **Content-Security-Policy:**
  - scripts run only with the request's nonce (`strict-dynamic`);
  - no inline script, no eval in production;
  - `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`;
  - `upgrade-insecure-requests`.
- **Headers:** HSTS (2 years), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP same-origin, `X-Robots-Tag: noindex`.

### Audit trail
The backend writes one JSON line with `"type":"security"` for each of these events:
- login success, failure and block;
- logout, and "sign out everywhere";
- password change;
- sign-up;
- account creation and changes;
- company approval and rejection;
- score approval;
- PIN failure and lock;
- upload block;
- cross-site request.

Each line holds the user id, client address and time; emails are hashed.

### Supply chain
- **CI** (`.github/workflows/ci.yml`) runs on every push and pull request:
  - type checks, tests and builds;
  - `npm audit` (high and critical);
  - gitleaks secret scan of the whole history;
  - Trivy scans of both images and of the Docker and Compose configuration.
- **Dependabot** opens weekly update pull requests for npm, Docker images and Actions.

## Operator checklist (needs your access)

1. **HTTPS only.** Put a TLS terminator in front of nginx with TLS 1.2+ and a valid certificate, and redirect HTTP to HTTPS. Then:
   - set `TRUST_PROXY_HOPS=2` and `HTTP_BIND=127.0.0.1`;
   - enable the `set_real_ip_from` lines in `nginx/default.conf`.
2. **Secrets.**
   - Generate a new `JWT_SECRET` (48+ random bytes) and rotate the ArcGIS client secret.
   - Keep `.env` at mode 600 on the server only.
   - Generate `ARCGIS_ADMIN_TOKEN` only when provisioning, then delete it.
3. **Separate staging data.** Development must not use the production ArcGIS service: create a staging service and a second OAuth app.
4. **ArcGIS.**
   - Keep the service item private.
   - Give the OAuth app access to `Hosted/Tailan` only.
   - Turn on the referer restriction.
   - Review sharing every quarter.
5. **Backups.** Back up the ArcGIS data on a schedule, encrypted (`age`/`gpg`), with one copy off-site, and test a restore. Encrypt or delete local plaintext dumps in `backups/`.
6. **Accounts.**
   - Use personal admin and manager accounts, as few as possible.
   - Deactivate leavers the same day.
   - Rotate the passwords of demo or seeded accounts before real data arrives.
7. **Logs and alerts.**
   - Ship container logs off the server.
   - Alert on bursts of `login.failure`, `pin.failure`, `pin.blocked` and `request.cross_site`, and on any `user.updated` at unusual hours.
8. **Server.**
   - Apply OS security updates automatically.
   - Firewall the host to 443 (and SSH from known addresses, key-only).
   - Keep Docker up to date.
   - Merge Dependabot updates promptly.
9. **Review.** Test on staging with real accounts of every role before go-live, and after major changes.

## Reporting a problem

Report suspected vulnerabilities privately to the system owner, not in public issues.
