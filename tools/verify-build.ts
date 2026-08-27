import { distFileExists, manifest } from './inspect';
import { REMOTE_ENTRY } from './paths';

/**
 * Checks the BUILT output, which is the one thing the unit tests cannot do.
 *
 * `npm test` reads your config files. This reads what webpack actually emitted —
 * so it catches the case where a config looks right but does not take effect, and
 * it is the only place `remoteEntry.mjs` either exists or does not.
 *
 * Run after `npm run build` (or just use `npm run verify:build`, which does both).
 */
interface Line {
  ok: boolean | null;
  text: string;
}

const out: Line[] = [];
let failures = 0;

function check(ok: boolean, text: string): void {
  out.push({ ok, text });
  if (!ok) failures++;
}

function note(text: string): void {
  out.push({ ok: null, text });
}

const products = manifest('products');
const shell = manifest('shell');

if (!products || !shell) {
  console.error('No build found in dist/apps. Run `npm run build` first.');
  process.exit(1);
}

const exposed = (products.exposes ?? []).map((e) => e.path);
const remotes = (shell.remotes ?? []).map((r) => r.alias);

note(`products exposes: ${exposed.length ? exposed.join(', ') : '(nothing)'}`);
note(`shell remotes:    ${remotes.length ? remotes.join(', ') : '(none)'}`);
note('');

check(exposed.includes('./Routes'), "step 1 · products publishes './Routes'");
check(
  distFileExists('products', REMOTE_ENTRY),
  `step 1 · dist/apps/products/${REMOTE_ENTRY} was emitted`
);
check(
  remotes.includes('products'),
  'step 2 · the shell declares the products remote'
);

const sharedInBoth = (name: string) =>
  !!shell.shared?.some((s) => s.name === name) &&
  !!products.shared?.some((s) => s.name === name);

check(
  sharedInBoth('@mf-lab/shared-auth'),
  'step 3 · @mf-lab/shared-auth is in both share scopes'
);
check(
  exposed.includes('./ProductCard'),
  "step 4 · products publishes './ProductCard'  (bonus)"
);

note('');
note(
  'step 5 · strictVersion leaves no trace in the manifest — `npm test -- -t "[s5]"` checks it'
);
note('step 6 · read by a trainer');

for (const line of out) {
  const mark = line.ok === null ? '   ' : line.ok ? ' ok' : '  X';
  console.log(`${mark}  ${line.text}`);
}

console.log('');
if (failures === 0) {
  console.log(
    'The built output matches every check that the manifest can express.'
  );
} else {
  console.log(`${failures} check(s) not satisfied by the built output.`);
  console.log('Run `npm test` for the explanation of each one.');
}

// Deliberately exit 0: an unfinished lab is the normal state, not an error.
