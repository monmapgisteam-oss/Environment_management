// Run local tooling/tests with the project's TypeScript dependency.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Import aliases, as in the tsconfig files: "@shared/..." is the shared folder;
// "@/..." is backend/src for backend and shared code, and the frontend root
// for frontend files.
const backendSrc = path.resolve(__dirname, '../src');
const shared = path.resolve(__dirname, '../../shared');
const frontend = path.resolve(__dirname, '../../frontend');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@shared/')) request = path.join(shared, request.slice('@shared/'.length));
  else if (request.startsWith('@/')) {
    const fromFrontend = parent?.filename?.startsWith(frontend + path.sep);
    request = path.join(fromFrontend ? frontend : backendSrc, request.slice(2));
  }
  return resolveFilename.call(this, request, parent, ...rest);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
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
