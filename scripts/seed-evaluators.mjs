// Creates 10 evaluation members ("Үнэлгээний гишүүн") in the reviewer company,
// with emails staff1@tailan.mn … staff10@tailan.mn. They sign in through the
// reviewer portal (/login/reviewer). Safe to run again: an email that already
// exists is left alone.
//
//   SEED_PASSWORD=... npm run seed:evaluators -- --dry-run
//   SEED_PASSWORD=... npm run seed:evaluators
import { randomBytes, scryptSync } from 'crypto';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const COUNT = 10;

// Same format as hashPassword in lib/auth/password.ts.
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

const dryRun = process.argv.includes('--dry-run');
const password = process.env.SEED_PASSWORD;
const secret = process.env.CONVEX_SERVER_SECRET;
if (!process.env.CONVEX_URL || !secret) throw new Error('Set CONVEX_URL and CONVEX_SERVER_SECRET.');
if (!password || password.length < 8) throw new Error('Set SEED_PASSWORD (8+ characters).');
const convex = new ConvexHttpClient(process.env.CONVEX_URL);
const read = (model, op, args) => convex.query(anyApi.data.read, { secret, model, op, args });
const write = (model, op, args) =>
  dryRun ? Promise.resolve() : convex.mutation(anyApi.data.write, { secret, model, op, args });

const company = await read('company', 'findFirst', { where: { type: 'reviewer' } });
if (!company) throw new Error('No reviewer company found.');

const existing = new Set(
  (await read('user', 'findMany', { select: { email: true } })).map((user) => user.email),
);

for (let n = 1; n <= COUNT; n++) {
  const email = `staff${n}@tailan.mn`;
  if (existing.has(email)) {
    console.log(`${email} already exists, skipped.`);
    continue;
  }
  await write('user', 'create', {
    data: {
      name: `Үнэлгээний гишүүн ${n}`,
      email,
      password: hashPassword(password),
      role: 'evaluator',
      companyId: company.id,
      position: 'Үнэлгээний гишүүн',
    },
  });
  console.log(`${dryRun ? 'Would create' : 'Created'} ${email} in "${company.name}".`);
}
