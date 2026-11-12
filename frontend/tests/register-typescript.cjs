// Run frontend tests with the project's TypeScript dependency: "@/..." is the
// frontend root, "@shared/..." the shared folder.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const frontend = path.resolve(__dirname, '..');
const shared = path.resolve(__dirname, '../../shared');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@shared/')) request = path.join(shared, request.slice('@shared/'.length));
  else if (request.startsWith('@/')) request = path.join(frontend, request.slice(2));
  return resolveFilename.call(this, request, ...rest);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        resolveJsonModule: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    });
    module._compile(compiled.outputText, filename);
  };
}
