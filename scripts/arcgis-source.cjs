// Read-only access to the archived ArcGIS database for backups and migration.
require('./register-typescript.cjs');
const schema = require('../lib/db/schema.json');
const { layerInfo, queryFeatures, storedFieldName, arcgisFetch } = require('../lib/db/arcgis.ts');

async function readAll(model) {
  const layer = await layerInfo(schema[model].name);
  return (await queryFeatures(layer)).map(({ attributes }) => Object.fromEntries(
    Object.entries(schema[model].fields).map(([key, field]) => {
      const value = attributes[storedFieldName(layer, key)] ?? null;
      return [key, value != null && field.type === 'boolean' ? Boolean(value) : value];
    }),
  ));
}

async function file(upload) {
  const layer = await layerInfo(schema.upload.name);
  const rows = await queryFeatures(layer);
  const feature = rows.find(({ attributes }) => attributes[storedFieldName(layer, 'id')] === upload.id);
  if (!feature || !upload.storageId) return null;
  const response = await arcgisFetch(`${layer.id}/${feature.attributes[layer.objectIdField]}/attachments/${upload.storageId}`);
  if (!response.ok || response.headers.get('content-type')?.includes('application/json')) return null;
  return response;
}

module.exports = { readAll, file };
