const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.JWT_SECRET ||= 'test-secret-for-attachment-tokens';
const jwt = require('jsonwebtoken');
const { isUploadReference, verifyAttachmentToken } = require('../lib/db/storage.ts');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('every response carries the security headers and image optimisation accepts no remote host', async () => {
  const { default: config } = await import('../next.config.mjs');
  const [{ source, headers }] = await config.headers();
  assert.equal(source, '/(.*)');
  const keys = headers.map((h) => h.key);
  for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Strict-Transport-Security']) {
    assert.ok(keys.includes(key), key);
  }
  assert.deepEqual(config.images.remotePatterns, []);
});

test('signed scan references must point at an app upload, never an outside address', () => {
  assert.equal(isUploadReference('convex-upload:51b63a99-ae48-4f02-996a-986197559089'), true);
  assert.equal(isUploadReference('https://example.com/scan.pdf'), false);
  assert.equal(isUploadReference('javascript:alert(1)'), false);
  assert.equal(isUploadReference('convex-upload:../etc/passwd'), false);
  assert.equal(isUploadReference(null), false);
});

test('attachment tokens are rejected when forged, expired or issued for another purpose', () => {
  const reference = 'convex-upload:51b63a99-ae48-4f02-996a-986197559089';
  const good = jwt.sign({ reference }, process.env.JWT_SECRET, { expiresIn: 60, audience: 'tailan-attachment' });
  assert.equal(verifyAttachmentToken(good), reference);
  const wrongSecret = jwt.sign({ reference }, 'other', { expiresIn: 60, audience: 'tailan-attachment' });
  assert.equal(verifyAttachmentToken(wrongSecret), null);
  const expired = jwt.sign({ reference }, process.env.JWT_SECRET, { expiresIn: -1, audience: 'tailan-attachment' });
  assert.equal(verifyAttachmentToken(expired), null);
  // A session token must not open files.
  const session = jwt.sign({ userId: 'u', role: 'admin', reference }, process.env.JWT_SECRET, { expiresIn: 60, audience: 'tailan-session' });
  assert.equal(verifyAttachmentToken(session), null);
  assert.equal(verifyAttachmentToken(''), null);
});

test('no signature PIN is hardcoded, stored in plaintext or shown on the public card', () => {
  const sources = [
    'app/api/reports/[id]/cover-signature/route.ts',
    'app/qr/profile/[id]/page.tsx',
    'app/api/evaluations/submit/route.ts',
    'components/signature/QrSignatureReveal.tsx',
  ].map((file) => [file, read(file)]);
  for (const [file, source] of sources) {
    assert.ok(!/KNOWN_SIGNATURES|SIGNATURE_BY_EMAIL/.test(source), `${file} keeps a PIN table`);
    assert.ok(!/'\d{4}'/.test(source), `${file} contains a literal PIN`);
  }
  assert.ok(!/signature:\s*numericSignature/.test(read('app/api/evaluations/submit/route.ts')), 'submit stores the raw PIN');
  const card = read('app/qr/profile/[id]/page.tsx');
  assert.ok(!/signature:\s*true|evaluation:/.test(card), 'public card reads evaluation signatures');
  assert.ok(!/email:\s*true/.test(card), 'public card selects the email');
});

test('login sets a secure cookie in production and notifications are scoped to the caller', () => {
  assert.match(read('app/api/auth/login/route.ts'), /secure:\s*process\.env\.NODE_ENV === 'production'/);
  assert.match(read('app/api/auth/login/route.ts'), /rateLimit\(/);
  const notifications = read('app/api/notifications/route.ts');
  const patch = notifications.slice(notifications.indexOf('export async function PATCH'), notifications.indexOf('export async function GET'));
  assert.match(patch, /getCurrentUser\(\)/);
  assert.match(patch, /userId:\s*user\.id/);
});
