import { mfConfig, wsFile } from '../tools/inspect';
import { brief, labFail } from './report';

const SHELL_CONFIG = 'apps/shell/module-federation.config.ts';
const SHELL_ROUTES = 'apps/shell/src/app/app.routes.ts';

/** The remotes list accepts a bare string or a [name, url] tuple. Normalise both. */
function remoteNames(remotes: unknown[] | undefined): string[] {
  return (remotes ?? [])
    .map((r) =>
      Array.isArray(r) ? String(r[0]) : typeof r === 'string' ? r : ''
    )
    .filter((n) => n.length > 0);
}

describe('step 2 — load the remote from the shell', () => {
  it('[s2] the shell declares products as a remote', () => {
    const names = remoteNames(mfConfig('shell')?.remotes);

    if (!names.includes('products')) {
      labFail({
        step: 's2',
        input: `remotes in ${SHELL_CONFIG}`,
        expected: "'products' in the remotes list",
        received:
          names.length === 0
            ? 'remotes is empty — the shell knows of no remotes'
            : brief(names),
        why: `
Publishing and consuming are two separate decisions, made by two different teams in
two different files. Step 1 published; this is the other half.

Declaring the remote here is what tells webpack to compile
\`import('products/Routes')\` into a *container lookup* instead of an ordinary
module import. Without it the import still type-checks and still runs — see the
next check — but no federation happens at all.

Nx resolves the URL for you from the remote's serve port, which is why the entry
is just the name.
        `,
        where: SHELL_CONFIG,
      });
    }
  });

  it('[s2] the shell has a lazy /products route that imports products/Routes', () => {
    const routes = wsFile(SHELL_ROUTES) ?? '';
    const importsRemote = /import\(\s*['"]products\/Routes['"]\s*\)/.test(
      routes
    );
    const hasPath = /path:\s*['"]products['"]/.test(routes);

    if (!importsRemote || !hasPath) {
      labFail({
        step: 's2',
        input: SHELL_ROUTES,
        expected:
          "a route with path: 'products' whose loadChildren imports 'products/Routes'",
        received: `path found: ${hasPath}, import found: ${importsRemote}`,
        why: `
The header already links to /products, so today clicking "Products" navigates
nowhere. Hand the outlet over with an ordinary lazy route — with one difference:
the module specifier is \`<remote name>/<exposed key>\`, not a file path. Neither
half of \`products/Routes\` exists on this disk; both are declared in
configuration.

The exposed routes come back as an array, so \`loadChildren\` needs the array off
that module, not the module itself.
        `,
        where: SHELL_ROUTES,
      });
    }
  });

  it('[s2] the config and the route agree — both halves are needed', () => {
    const declared = remoteNames(mfConfig('shell')?.remotes).includes(
      'products'
    );
    const routes = wsFile(SHELL_ROUTES) ?? '';
    const importsRemote = /import\(\s*['"]products\/Routes['"]\s*\)/.test(
      routes
    );

    if (importsRemote && !declared) {
      labFail({
        step: 's2',
        input: `${SHELL_ROUTES} and ${SHELL_CONFIG}`,
        expected: 'the remote declared AND the route wired',
        received:
          'the route imports products/Routes, but no remote is declared',
        why: `
This is the trap this lab most wants you to see, because the page will look
completely correct.

\`tsconfig.base.json\` maps \`products/Routes\` straight at the remote's real source
file. So with no remote declared, webpack does not fail — it quietly compiles the
remote's code *into the shell's own bundle*. You get a working Products page, one
build, one deploy, and none of the independence that was the entire point.

Nothing in the rendered page tells you this happened. Two things do: the Network
tab shows no request for \`remoteEntry.mjs\`, and the lab dashboard at /lab reports
step 2 as incomplete because it reads the federation runtime's own remote registry
rather than trusting the import.

See TOUR.md → "tsconfig.base.json — the workspace module map".
        `,
        where: SHELL_CONFIG,
      });
    }
  });
});
