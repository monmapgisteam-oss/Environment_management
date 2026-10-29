// Maintenance scripts read and write records through the same repository
// engine as the app: read(model, op, args) and write(model, op, args), with
// dates as epoch ms.
require('./register-typescript.cjs');
module.exports = require('../lib/db/index.ts').engine;
