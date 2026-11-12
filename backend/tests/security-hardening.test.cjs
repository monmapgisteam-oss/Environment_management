const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.JWT_SECRET ||= 'test-secret-for-attachment-tokens';
const jwt = require('jsonwebtoken');
const { isUploadReference, verifyAttachmentToken } = require('../src/lib/db/storage.ts');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('every response carries the security headers and image optimisation accepts no remote host', async () => {
  const { default: config } = await import('../../frontend/next.config.mjs');
  const [{ source, headers }] = await config.headers();
  assert.equal(source, '/(.*)');
  const keys = headers.map((h) => h.key);
  for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Strict-Transport-Security']) {
    assert.ok(keys.includes(key), key);
  }
  assert.deepEqual(config.images.remotePatterns, []);
});

test('signed scan references must point at an app upload, never an outside address', () => {
  assert.equal(isUploadReference('upload:51b63a99-ae48-4f02-996a-986197559089'), true);
  assert.equal(isUploadReference('https://example.com/scan.pdf'), false);
  assert.equal(isUploadReference('javascript:alert(1)'), false);
  assert.equal(isUploadReference('upload:../etc/passwd'), false);
  assert.equal(isUploadReference(null), false);
});

test('attachment tokens are rejected when forged, expired, signed with the raw secret or issued for another purpose', async () => {
  const { signingKey } = require('../src/lib/auth/keys.ts');
  const { createSignedUrl } = require('../src/lib/db/storage.ts');
  const reference = 'upload:51b63a99-ae48-4f02-996a-986197559089';
  const key = signingKey('attachment');
  const good = jwt.sign({ reference, sid: 's1' }, key, { expiresIn: 60, audience: 'tailan-attachment' });
  assert.deepEqual(verifyAttachmentToken(good), { reference, sid: 's1' });
  const made = decodeURIComponent((await createSignedUrl(reference)).split('token=')[1]);
  assert.deepEqual(verifyAttachmentToken(made), { reference, sid: null });
  // The raw JWT_SECRET is no longer a signing key for anything.
  const rawSecret = jwt.sign({ reference }, process.env.JWT_SECRET, { expiresIn: 60, audience: 'tailan-attachment' });
  assert.equal(verifyAttachmentToken(rawSecret), null);
  const wrongSecret = jwt.sign({ reference }, 'other', { expiresIn: 60, audience: 'tailan-attachment' });
  assert.equal(verifyAttachmentToken(wrongSecret), null);
  const expired = jwt.sign({ reference }, key, { expiresIn: -1, audience: 'tailan-attachment' });
  assert.equal(verifyAttachmentToken(expired), null);
  // A session token must not open files, even with the same audience.
  const session = jwt.sign({ reference }, signingKey('session'), { expiresIn: 60, audience: 'tailan-attachment' });
  assert.equal(verifyAttachmentToken(session), null);
  assert.equal(verifyAttachmentToken(''), null);
  // Outside and protocol-relative addresses are never turned into file links.
  await assert.rejects(createSignedUrl('https://evil.example/x.pdf'));
  await assert.rejects(createSignedUrl('//evil.example/x.pdf'));
  assert.equal(await createSignedUrl('/samples/a.pdf'), '/samples/a.pdf');
});

test('no signature PIN is hardcoded, stored in plaintext or shown on the public card', () => {
  const sources = [
    'backend/src/views/report/qrProfile.ts',
    'backend/src/routes/evaluations/submit/route.ts',
    'backend/src/routes/reports/[id]/approve-scores/route.ts',
  ].map((file) => [file, read(file)]);
  for (const [file, source] of sources) {
    assert.ok(!/KNOWN_SIGNATURES|SIGNATURE_BY_EMAIL/.test(source), `${file} keeps a PIN table`);
    assert.ok(!/'\d{4}'/.test(source), `${file} contains a literal PIN`);
  }
  assert.ok(!/signature:\s*numericSignature/.test(read('backend/src/routes/evaluations/submit/route.ts')), 'submit stores the raw PIN');
  const card = read('backend/src/views/report/qrProfile.ts');
  assert.ok(!/signature:\s*true|evaluation:/.test(card), 'public card reads evaluation signatures');
  assert.ok(!/email:\s*true/.test(card), 'public card selects the email');
});

test('login sets a secure cookie in production and notifications are scoped to the caller', () => {
  assert.match(read('backend/src/lib/auth/session.ts'), /secure:\s*process\.env\.NODE_ENV === 'production'/);
  assert.match(read('backend/src/routes/auth/login/route.ts'), /sessionCookieOptions\(\)/);
  // Attempts are counted in the shared (ArcGIS) store, not per server.
  assert.match(read('backend/src/routes/auth/login/route.ts'), /limitRequest\(/);
  const notifications = read('backend/src/routes/notifications/route.ts');
  const patch = notifications.slice(notifications.indexOf('export async function PATCH'), notifications.indexOf('export async function GET'));
  assert.match(patch, /getCurrentUser\(\)/);
  assert.match(patch, /userId:\s*user\.id/);
});

test('pages send a nonce-based content security policy with no inline-script allowance', () => {
  const csp = read('frontend/lib/csp.ts');
  assert.match(csp, /'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  const scripts = csp.slice(csp.indexOf('script-src'), csp.indexOf('style-src'));
  assert.ok(!scripts.includes('unsafe-inline'), 'script-src allows inline scripts');
  assert.match(read('frontend/proxy.ts'), /response\.headers\.set\('Content-Security-Policy', policy\)/);
  assert.match(read('frontend/app/layout.tsx'), /nonce=\{nonce\}/);
});

test('an unapproved company signs in to the registration page only', () => {
  const auth = read('backend/src/lib/auth/index.ts');
  // Everywhere else the unapproved sender still counts as signed out.
  assert.match(auth, /!isCompanyApproved\(user\.company\) && !allowUnapprovedCompany\) return null/);
  // The frontend sends such a sender to the registration page.
  assert.match(read('frontend/lib/auth.ts'), /redirect\(REGISTRATION_PATH\)/);
  assert.match(read('backend/src/routes/registration/conclusion/route.ts'), /getRegistrationApiUser\(\)/);
  assert.match(read('frontend/app/registration/layout.tsx'), /requireRegistrationUser\(\)/);
  assert.match(read('backend/src/routes/auth/login/route.ts'), /REGISTRATION_PATH : ROLE_HOME/);
});
