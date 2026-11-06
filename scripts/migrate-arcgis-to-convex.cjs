// Merge backed-up ArcGIS and Convex records. No source records are deleted.
// Dry-run by default; --apply requires a snapshot from backup-databases.cjs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { planMigration, canonical } = require('./convex-migration-plan.cjs');
const arcgis = require('./arcgis-source.cjs');

async function call(kind, name, args) {
  const response = await fetch(`${process.env.CONVEX_URL}/api/${kind}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: name, args: { secret: process.env.CONVEX_SERVER_SECRET, ...args }, format: 'json' }),
    signal: AbortSignal.timeout(60_000),
  });
  const result = await response.json();
  if (result.status !== 'success') throw new Error(`Convex ${name} failed (HTTP ${response.status}).`);
  return result.value;
}

async function main() {
  const directory = process.argv.find((arg) => arg.startsWith('--backup='))?.slice(9);
  if (!directory) throw new Error('Pass --backup=backups/convex-cutover-<timestamp>.');
  const source = JSON.parse(fs.readFileSync(path.join(directory, 'arcgis.json')));
  const target = JSON.parse(fs.readFileSync(path.join(directory, 'convex.json')));
  const plan = planMigration(source, target);
  fs.writeFileSync(path.join(directory, 'merge-plan.json'), JSON.stringify(plan), { mode: 0o600 });
  for (const [model, rows] of Object.entries(plan.tables)) console.log(`${model}: ${rows.length} merged records; ${plan.removeIds[model].length} identity aliases consolidated`);
  console.log(`${plan.renumbered.length} report-number collisions will get new RPT numbers; their IDs and signed scores stay intact.`);
  if (!process.argv.includes('--apply')) { console.log('Dry run: no remote data changed.'); return; }

  // A changed source requires a fresh backup, rather than a stale cutover.
  for (const model of Object.keys(source)) {
    if (canonical(await arcgis.readAll(model)) !== canonical(source[model])) throw new Error(`ArcGIS ${model} changed since backup. Take a new snapshot.`);
  }
  const checkpoint = path.join(directory, 'convex-upload-map.json');
  const uploaded = fs.existsSync(checkpoint) ? JSON.parse(fs.readFileSync(checkpoint)) : {};
  for (const upload of source.upload) {
    const sourceFile = path.join(directory, 'arcgis-files', `${upload.id}.bin`);
    if (!fs.existsSync(sourceFile)) throw new Error('Source upload has no backed-up bytes; refusing to lose a file.');
    const bytes = fs.readFileSync(sourceFile);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const existing = target.upload.find((row) => row.id === upload.id);
    const targetFile = path.join(directory, 'convex-files', `${upload.id}.bin`);
    if (existing?.storageId && fs.existsSync(targetFile) && crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex') === sha256) {
      uploaded[upload.id] = existing.storageId;
    }
    if (!uploaded[upload.id]) {
      const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'arcgis-files', `${upload.id}.json`)));
      const url = await call('mutation', 'files:generateUploadUrl', {});
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': metadata.contentType || 'application/octet-stream' }, body: bytes, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error('File upload failed.');
      uploaded[upload.id] = (await response.json()).storageId;
      fs.writeFileSync(checkpoint, JSON.stringify(uploaded), { mode: 0o600 });
    }
    plan.tables.upload.find((row) => row.id === upload.id).storageId = uploaded[upload.id];
  }
  fs.writeFileSync(path.join(directory, 'applied-plan.json'), JSON.stringify(plan), { mode: 0o600 });
  await call('mutation', 'migrate:mergeDatabase', { tables: plan.tables, expected: target, removeIds: plan.removeIds });
  for (const [model, rows] of Object.entries(plan.tables)) {
    const saved = await call('query', 'data:read', { model, op: 'findMany', args: {} });
    if (canonical(saved) !== canonical(rows)) throw new Error(`${model} verification failed.`);
    console.log(`${model}: merged and verified`);
  }
  let verified = 0;
  for (const upload of plan.tables.upload) {
    const url = await call('query', 'files:url', { storageId: upload.storageId });
    if (!url) throw new Error('Merged upload has no storage file.');
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error('Merged file cannot be downloaded.');
    const bytes = Buffer.from(await response.arrayBuffer());
    const original = fs.readFileSync(path.join(directory, source.upload.some((row) => row.id === upload.id) ? 'arcgis-files' : 'convex-files', `${upload.id}.bin`));
    if (!bytes.equals(original)) throw new Error('Merged file bytes do not match the backup.');
    verified++;
  }
  console.log(`Verified every merged record and all ${verified} uploaded files byte-for-byte.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
