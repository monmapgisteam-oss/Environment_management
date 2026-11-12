// Bundles the backend into dist/server.mjs. Project code and ../shared are
// bundled ("@/" = src, "@shared/" = ../shared, for files in either folder);
// npm packages stay external and are installed in the image.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const aliases = { '@shared/': path.resolve(root, '../shared'), '@/': path.join(root, 'src') };

const projectAliases = {
  name: 'project-aliases',
  setup(build) {
    build.onResolve({ filter: /^@(shared)?\// }, async (args) => {
      const prefix = args.path.startsWith('@shared/') ? '@shared/' : '@/';
      const result = await build.resolve(`./${args.path.slice(prefix.length)}`, {
        kind: args.kind,
        resolveDir: aliases[prefix],
      });
      return result.errors.length ? { errors: result.errors } : { path: result.path };
    });
  },
};

await build({
  entryPoints: [path.join(root, 'src/server.ts')],
  outfile: path.join(root, 'dist/server.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: Object.keys(pkg.dependencies ?? {}),
  plugins: [projectAliases],
  // Bundled CommonJS helpers may call require().
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
});
