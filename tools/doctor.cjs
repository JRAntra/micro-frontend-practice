/**
 * `npm run doctor` — checks the handful of things that make this repo fail in ways
 * that do not look like their cause.
 *
 * Also runs as a quiet `postinstall`, where it prints only problems. It never exits
 * non-zero from postinstall, because a failing postinstall aborts the whole install.
 */
const { createConnection } = require('node:net');
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
const nodeOk =
  (major === 20 && minor >= 11) || (major === 22 && minor >= 12) || major >= 24;
row('node', process.version, nodeOk, 'run `nvm use` (this repo ships .nvmrc)');

// --- ports ------------------------------------------------------------------
const PORTS = [
  [4271, 'shell dev server (and the built shell)'],
  [4272, 'products remote — this port is baked into the shell at build time'],
];

/**
 * Free means "nothing is listening", tested by trying to CONNECT.
 *
 * The obvious implementation — bind the port and see if it fails — reports these
 * ports free while the dev servers are running: they listen on 127.0.0.1, an
 * unqualified bind lands on ::, and macOS lets those coexist. A check that says
 * "free" right before the candidate gets EADDRINUSE is worse than no check.
 *
 * Both stacks are probed because the Angular dev server may pick either.
 */
function portFree(port) {
  const probe = (host) =>
    new Promise((resolve) => {
      const sock = createConnection({ port, host });
      const done = (inUse) => {
        sock.destroy();
        resolve(inUse);
      };
      sock.setTimeout(400, () => done(false));
      sock.once('connect', () => done(true));
      sock.once('error', () => done(false));
    });

  return Promise.all([probe('127.0.0.1'), probe('::1')]).then(
    (inUse) => !inUse.some(Boolean)
  );
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
    row(
      `port ${port}`,
      free ? 'free' : 'in use',
      free,
      `needed for the ${why}. If that is this lab's own server already running, nothing to do.`
    );
  }

  row(
    'node_modules',
    existsSync(join(root, 'node_modules')) ? 'installed' : 'missing',
    existsSync(join(root, 'node_modules')),
    'run `npm ci`'
  );
  row(
    'workspace writable',
    writable(root) ? 'yes' : 'no',
    writable(root),
    'the build needs to write dist/ and .nx/cache'
  );

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
    console.log(
      problems === 0
        ? '  Everything the lab needs is in place.'
        : `  ${problems} problem(s) above.`
    );
    console.log('');
    process.exit(problems === 0 ? 0 : 1);
  }
})();
