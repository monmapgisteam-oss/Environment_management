const schema = require('../lib/db/schema.json');

const foreignKeys = {
  companyId: 'company', senderCompanyId: 'company', reportTypeId: 'reportType',
  userId: 'user', ownerUserId: 'user', evaluatorUserId: 'user', assignedByUserId: 'user',
  sentByUserId: 'user', scoresApprovedById: 'user', reportId: 'report',
  evaluationId: 'evaluation', criterionId: 'evaluationCriterion', assignmentId: 'reportAssignment', broadcastId: 'broadcast',
};

function normalize(model, row) {
  const result = {};
  for (const [key, field] of Object.entries(schema[model].fields)) {
    let value = row[key];
    if (value === undefined && field.nullable) value = null;
    if (value === undefined && field.default !== undefined && !['now', 'uuid'].includes(field.default)) value = field.default;
    if (value == null && !field.nullable) throw new Error(`${model}.${key} is missing; cannot invent business data.`);
    if (value != null) {
      if (field.type === 'string' && (typeof value !== 'string' || value.length > (field.length || Infinity))) throw new Error(`Invalid ${model}.${key}.`);
      if (field.type === 'boolean' && typeof value !== 'boolean') throw new Error(`Invalid ${model}.${key}.`);
      if (['date', 'number', 'integer'].includes(field.type) && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`Invalid ${model}.${key}.`);
      if (field.type === 'integer' && !Number.isInteger(value)) throw new Error(`Invalid ${model}.${key}.`);
      if (field.values && !field.values.includes(value)) throw new Error(`Invalid ${model}.${key}.`);
    }
    result[key] = value;
  }
  // Older versions stored the PIN here. It is not part of a signed payload.
  if (model === 'evaluation') result.signature = null;
  for (const field of ['fileUrl', 'signedScanUrl', 'geometryFileUrl']) {
    if (typeof result[field] === 'string') result[field] = result[field].replace(/convex-upload:/g, 'upload:');
  }
  return result;
}

function canonical(rows) {
  return JSON.stringify(rows.map((row) => Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))))
    .sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function validate(tables) {
  for (const [model, definition] of Object.entries(schema)) {
    for (const [field, info] of Object.entries(definition.fields)) {
      if (!info.unique) continue;
      const seen = new Set();
      for (const row of tables[model]) {
        if (row[field] == null) continue;
        if (seen.has(row[field])) throw new Error(`Unresolved unique conflict: ${model}.${field}`);
        seen.add(row[field]);
      }
    }
    for (const row of tables[model]) {
      for (const [field, target] of Object.entries(foreignKeys)) {
        if (row[field] != null && !tables[target].some((other) => other.id === row[field])) throw new Error(`Missing relation: ${model}.${field}`);
      }
    }
  }
}

function planMigration(source, target) {
  const aliases = { company: new Map(), user: new Map(), reportType: new Map() };
  // These identities have unique natural keys. Source IDs win, preserving the
  // currently used accounts. Reports and signed criteria are never deduplicated.
  for (const [model, field] of [['company', 'registerNumber'], ['user', 'email'], ['reportType', 'slug']]) {
    for (const row of source[model]) {
      for (const old of target[model]) {
        if (old.id === row.id || old[field] !== row[field]) continue;
        if (model === 'user' && target.reportAssignment.some((assignment) => assignment.evaluatorUserId === old.id &&
          target.evaluation.some((evaluation) => evaluation.assignmentId === assignment.id && evaluation.status === 'SIGNED'))) {
          throw new Error('Cannot merge a signed evaluator identity; preserve and resolve it manually.');
        }
        aliases[model].set(old.id, row.id);
      }
    }
  }
  const tables = {};
  const removeIds = {};
  const renumbered = [];
  const group = (row) => `${row.category}\0${row.sheet || 'performance'}`;
  const sourceGroups = new Set(source.evaluationCriterion.map(group));
  for (const model of Object.keys(schema)) {
    const sourceIds = new Set(source[model].map((row) => row.id));
    const combined = new Map(target[model].map((row) => [row.id, normalize(model, row)]));
    for (const row of source[model]) combined.set(row.id, normalize(model, row));
    removeIds[model] = [...(aliases[model]?.keys() || [])];
    for (const id of removeIds[model]) combined.delete(id);
    for (const row of combined.values()) {
      for (const [field, targetModel] of Object.entries(foreignKeys)) {
        if (aliases[targetModel]?.has(row[field])) row[field] = aliases[targetModel].get(row[field]);
      }
      // Keep historical criterion IDs for signed scores, while the current
      // source sheet supplies the active criteria instead of duplicating it.
      if (model === 'evaluationCriterion' && !sourceIds.has(row.id) && sourceGroups.has(group(row))) row.isActive = false;
    }
    tables[model] = [...combined.values()];
  }
  const sourceNumbers = new Set(source.report.map((row) => row.reportNumber));
  const sourceReportIds = new Set(source.report.map((row) => row.id));
  const used = new Set(tables.report.map((row) => row.reportNumber));
  for (const row of tables.report) {
    if (sourceReportIds.has(row.id) || !sourceNumbers.has(row.reportNumber)) continue;
    const prefix = `RPT-${row.year}-`;
    let sequence = 1;
    let number;
    do { number = `${prefix}${String(sequence++).padStart(4, '0')}`; } while (used.has(number));
    renumbered.push({ id: row.id, from: row.reportNumber, to: number });
    row.reportNumber = number;
    used.add(number);
  }
  validate(tables);
  return { tables, removeIds, renumbered };
}

module.exports = { planMigration, normalize, canonical, validate };
