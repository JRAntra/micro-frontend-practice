/**
 * `npm run doctor` — checks the handful of things that make this repo fail in ways
 * that do not look like their cause.
 *
 * Also runs as a quiet `postinstall`, where it prints only problems. It never exits
 * non-zero from postinstall, because a failing postinstall aborts the whole install.
 */
const { createServer } = require('node:net');
const { accessSync, constants, existsSync } = require('node:fs');
const { join } = require('node:path');

const quiet = process.argv.includes('--quiet');
const root = join(__dirname, '..');
const rows = [];
let problems = 0;

function row(name, value, ok, hint) {
  rows.push({ name, value, ok, hint });
  if (!ok) problems++;
}

// --- node & npm -------------------------------------------------------------
const [major, minor] = process.versions.node.split('.').map(Number);
const nodeOk = (major === 20 && minor >= 11) || (major === 22 && minor >= 12) || major >= 24;
row('node', process.version, nodeOk, 'run `nvm use` (this repo ships .nvmrc)');

// --- ports ------------------------------------------------------------------
const PORTS = [
  [4271, 'shell dev server, and the built shell'],
  [4272, 'products remote — this port is baked into the shell build'],
  [4273, 'Nx static-remote file server, used when you run `nx serve shell` without --devRemotes'],
];

function portFree(port) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port);
  });
}

// --- writability ------------------------------------------------------------
function writable(p) {
  try {
    accessSync(existsSync(p) ? p : root, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

void (async () => {
  for (const [port, why] of PORTS) {
    const free = await portFree(port);
    row(`port ${port}`, free ? 'free' : 'IN USE', free, `something else is on ${port} — ${why}`);
  }

  row('node_modules', existsSync(join(root, 'node_modules')) ? 'installed' : 'missing',
    existsSync(join(root, 'node_modules')), 'run `npm ci`');
  row('workspace writable', writable(root) ? 'yes' : 'no', writable(root),
    'the build needs to write dist/ and .nx/cache');

  const shown = quiet ? rows.filter((r) => !r.ok) : rows;
  if (shown.length) {
    const width = Math.max(...shown.map((r) => r.name.length));
    console.log('');
    for (const r of shown) {
      const mark = r.ok ? 'ok  ' : 'X   ';
      console.log(`  ${mark}${r.name.padEnd(width)}  ${r.value}`);
      if (!r.ok) console.log(`      ${' '.repeat(width)}  -> ${r.hint}`);
    }
    console.log('');
  }

  if (!quiet) {
    console.log(problems === 0 ? '  Everything the lab needs is in place.' : `  ${problems} problem(s) above.`);
    console.log('');
    process.exit(problems === 0 ? 0 : 1);
  }
})();
