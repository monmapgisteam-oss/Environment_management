// Creates 10 evaluation members ("Үнэлгээний гишүүн") in the reviewer company,
// with emails staff1@tailan.mn … staff10@tailan.mn. They sign in through the
// reviewer portal (/login/reviewer). Safe to run again: an email that already
// exists is left alone.
//
// Every account gets its own random temporary password, printed once here
// for the admin to hand over privately; each member must replace it on first
// sign-in. Nothing else stores it.
//
//   npm run seed:evaluators -- --dry-run
//   npm run seed:evaluators
import { randomBytes } from 'crypto';
import { createRequire } from 'module';
import store from './data-store.cjs';

// data-store.cjs registered the TypeScript loader, so the app's own hashing is used.
const { hashPassword } = createRequire(import.meta.url)('../src/lib/auth/password.ts');

const COUNT = 10;

const dryRun = process.argv.includes('--dry-run');
const read = (model, op, args) => store.read(model, op, args);
const write = (model, op, args) =>
  dryRun ? Promise.resolve() : store.write(model, op, args);

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
  const password = randomBytes(12).toString('base64url');
  await write('user', 'create', {
    data: {
      name: `Үнэлгээний гишүүн ${n}`,
      email,
      password: await hashPassword(password),
      role: 'evaluator',
      companyId: company.id,
      position: 'Үнэлгээний гишүүн',
      // The temporary password: each member sets their own on first sign-in.
      mustChangePassword: true,
    },
  });
  console.log(`${dryRun ? 'Would create' : 'Created'} ${email} in "${company.name}"${dryRun ? '' : `, temporary password: ${password}`}.`);
}
