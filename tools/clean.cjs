/**
 * `npm run clean` — removes everything generated, cross-platform.
 *
 * Exists because `rm -rf dist .nx/cache` is the natural instruction and it does not
 * work in Windows `cmd`. Leaves `node_modules` alone; that is `npm ci`'s business.
 */
const { rmSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const targets = ['dist', 'coverage', 'tmp', '.angular', join('.nx', 'cache'), join('.nx', 'workspace-data')];

for (const t of targets) {
  rmSync(join(root, t), { recursive: true, force: true });
  console.log(`  removed  ${t}`);
}
console.log('\n  Run `npm run build` or `npm start` to regenerate.');
