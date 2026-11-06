// Snapshot both sources before merging. Output contains counts, never records
// or credentials. Backups (including file bytes) are private and gitignored.
const fs = require('node:fs');
const path = require('node:path');
const schema = require('../lib/db/schema.json');
const arcgis = require('./arcgis-source.cjs');

async function query(name, args) {
  const response = await fetch(`${process.env.CONVEX_URL}/api/query`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: name, args: { secret: process.env.CONVEX_SERVER_SECRET, ...args }, format: 'json' }),
    signal: AbortSignal.timeout(60_000),
  });
  const result = await response.json();
  if (result.status !== 'success') throw new Error(`Convex ${name} unavailable (HTTP ${response.status}).`);
  return result.value;
}

async function main() {
  const directory = path.join('backups', `convex-cutover-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const snapshots = { arcgis: {}, convex: {} };
  for (const model of Object.keys(schema)) {
    snapshots.arcgis[model] = await arcgis.readAll(model);
    snapshots.convex[model] = await query('data:read', { model, op: 'findMany', args: {} });
    const source = snapshots.arcgis[model];
    const target = snapshots.convex[model];
    const targetIds = new Set(target.map((row) => row.id));
    const shared = source.filter((row) => targetIds.has(row.id));
    console.log(`${model}: ArcGIS ${source.length}, Convex ${target.length}, shared IDs ${shared.length}`);
    for (const [field, definition] of Object.entries(schema[model].fields)) {
      if (!definition.unique || field === 'id') continue;
      const conflicts = source.filter((row) => row[field] != null && target.some((other) => other[field] === row[field] && other.id !== row.id));
      if (conflicts.length) console.log(`  ${conflicts.length} different-ID matches on ${field}`);
    }
  }
  for (const [name, rows] of Object.entries(snapshots)) {
    fs.writeFileSync(path.join(directory, `${name}.json`), JSON.stringify(rows), { mode: 0o600 });
  }
  for (const [name, rows] of Object.entries(snapshots)) {
    const folder = path.join(directory, `${name}-files`);
    fs.mkdirSync(folder, { mode: 0o700 });
    let copied = 0;
    const missing = [];
    for (const upload of rows.upload) {
      if (!upload.storageId) { missing.push(upload.id); continue; }
      let response;
      if (name === 'arcgis') response = await arcgis.file(upload);
      else {
        const url = await query('files:url', { storageId: upload.storageId });
        if (url) response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      }
      if (!response?.ok) { missing.push(upload.id); continue; }
      fs.writeFileSync(path.join(folder, `${upload.id}.bin`), Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
      fs.writeFileSync(path.join(folder, `${upload.id}.json`), JSON.stringify({ contentType: response.headers.get('content-type') }), { mode: 0o600 });
      copied++;
    }
    fs.writeFileSync(path.join(folder, 'missing.json'), JSON.stringify(missing), { mode: 0o600 });
    console.log(`${name}: backed up ${copied} files; ${missing.length} upload records have no readable file.`);
  }
  console.log(`Backup: ${directory}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
