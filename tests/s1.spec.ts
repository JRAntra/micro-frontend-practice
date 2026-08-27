import { mfConfig } from '../tools/inspect';
import { brief, labFail } from './report';

const CONFIG = 'apps/products/module-federation.config.ts';
const ROUTES = 'apps/products/src/app/remote-entry/entry.routes.ts';

describe('step 1 — publish something from the remote', () => {
  it('[s1] the products config is loadable', () => {
    if (mfConfig('products') === null) {
      labFail({
        step: 's1',
        input: CONFIG,
        expected: 'a module-federation config this test can read',
        received: 'the file is missing, or it threw while being evaluated',
        why: `
Everything in step 1 is decided by this one file, so the checks read it directly
rather than waiting for a build.

If you have just edited it, the likeliest cause is a syntax error — a missing
comma or an unbalanced brace. Your editor will point at it faster than this
message can.
        `,
        where: CONFIG,
      });
    }
  });

  it('[s1] products declares ./Routes in its exposes map', () => {
    const cfg = mfConfig('products');
    const exposes = cfg?.exposes ?? {};
    const keys = Object.keys(exposes);

    if (!keys.includes('./Routes')) {
      labFail({
        step: 's1',
        input: `exposes in ${CONFIG}`,
        expected: "a key './Routes'",
        received:
          keys.length === 0
            ? 'exposes is empty — nothing is published'
            : brief(keys),
        why: `
A remote is a black box. The only modules the outside world can reach are the ones
it explicitly publishes, and \`exposes\` is that list. An empty map means the
products application compiles, deploys, and offers nothing — no \`remoteEntry.mjs\`
is even emitted.

Note what does NOT control this: TypeScript's \`export\` keyword. Visibility across
a federation boundary is a build-configuration decision, not a language one.

The key is the specifier consumers use after the remote name. The shell is going to
import \`products/Routes\`, so the key has to be \`'./Routes'\`.
        `,
        where: CONFIG,
      });
    }
  });

  it('[s1] ./Routes points at the remote-entry routes, workspace-root relative', () => {
    const target = (mfConfig('products')?.exposes ?? {})['./Routes'];

    if (target !== ROUTES) {
      labFail({
        step: 's1',
        input: `exposes['./Routes'] in ${CONFIG}`,
        expected: ROUTES,
        received: brief(target ?? 'undefined'),
        why: `
The value is the file in this project to bundle as that entry point, and paths here
are **workspace-root relative** — not relative to the config file. \`'./entry.routes'\`
or \`'src/app/remote-entry/entry.routes.ts'\` will not resolve.

Point it at \`entry.routes.ts\`, not \`app.routes.ts\`. The remote has two front doors:
\`app.routes.ts\` is its own root table for when you open the products app directly,
and \`remote-entry/entry.routes.ts\` is the one intended for federation. See
TOUR.md → "Two front doors".
        `,
        where: CONFIG,
      });
    }
  });
});
