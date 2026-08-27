/**
 * Runs as `preinstall`, before a single dependency exists — so it uses nothing but
 * Node itself.
 *
 * Why not rely on the `engines` field: npm only *warns* on a mismatch, and the
 * warning scrolls past under nine hundred lines of install output. Angular 19 and
 * Nx 20 then fail later with errors that name neither Node nor the version, and
 * the failure looks like a broken repo rather than a wrong toolchain.
 *
 * Set MF_LAB_SKIP_NODE_CHECK=1 to bypass this if you know what you are doing.
 */
if (process.env.MF_LAB_SKIP_NODE_CHECK) process.exit(0);

const [major, minor] = process.versions.node.split('.').map(Number);

// Angular 19 declares ^18.19.1 || ^20.11.1 || >=22.0.0. Odd majors are excluded on
// purpose: Angular does not support 21 or 23.
const ok = (major === 20 && minor >= 11) || (major === 22 && minor >= 12) || major >= 24;

if (!ok) {
  console.error(`
------------------------------------------------------------------
  This lab needs Node 20.11.1+ (22.12+ or 24+ also fine).
  You are on ${process.version}.

  nvm:    nvm install && nvm use        (reads .nvmrc)
  fnm:    fnm use                       (reads .node-version)
  volta:  volta install node@20.19.5
  asdf:   asdf install nodejs 20.19.5 && asdf local nodejs 20.19.5

  Or download it from https://nodejs.org/en/download

  Then run  npm ci  again.
------------------------------------------------------------------
`);
  process.exit(1);
}
