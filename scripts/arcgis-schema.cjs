const schema = require('../lib/arcgis/schema.json');

const fieldTypes = {
  string: 'esriFieldTypeString', integer: 'esriFieldTypeInteger', number: 'esriFieldTypeDouble',
  boolean: 'esriFieldTypeSmallInteger', date: 'esriFieldTypeDate',
};

function definition(model, id, spatialReference = { wkid: 4326 }) {
  const table = schema[model];
  const fields = [
    { name: 'OBJECTID', type: 'esriFieldTypeOID', alias: 'OBJECTID', nullable: false, editable: false },
    ...Object.entries(table.fields).map(([name, field]) => ({
      name: `app_${name}`, alias: name, type: fieldTypes[field.type], nullable: field.nullable, editable: true,
      ...(field.type === 'string' ? { length: field.length } : {}),
    })),
  ];
  const indexes = Object.entries(table.fields).filter(([name, field]) => field.unique || name.endsWith('Id')).map(([name, field]) => ({
    name: `ix_${model}_${name}`, fields: `app_${name}`, isAscending: true, isUnique: !!field.unique,
    description: field.unique ? 'Application unique key' : 'Application relationship key',
  }));
  return {
    id, name: table.name, type: table.spatial ? 'Feature Layer' : 'Table',
    displayField: 'app_id', objectIdField: 'OBJECTID', fields, indexes,
    hasAttachments: !!table.attachments, capabilities: 'Query,Create,Update,Delete,Editing',
    ...(table.spatial ? {
      // Hosted services require every layer to share the service spatial reference.
      geometryType: 'esriGeometryPoint', spatialReference,
      ...(spatialReference.wkid === 4326 || spatialReference.latestWkid === 4326
        ? { extent: { xmin: -180, ymin: -90, xmax: 180, ymax: 90, spatialReference } } : {}),
      drawingInfo: { renderer: { type: 'simple', symbol: { type: 'esriSMS', style: 'esriSMSCircle', color: [30, 100, 210, 255], size: 8 } } },
    } : {}),
  };
}

module.exports = { schema, fieldTypes, definition };
