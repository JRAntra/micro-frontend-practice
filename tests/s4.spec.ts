import { mfConfig, wsFile } from '../tools/inspect';
import { brief, labFail } from './report';

const CONFIG = 'apps/products/module-federation.config.ts';
const CARD = 'apps/products/src/app/remote-entry/product-card.component.ts';
const HOME = 'apps/shell/src/app/home.component.ts';

describe('step 4 — federate one component, not a whole page', () => {
  it('[s4] products exposes ./ProductCard', () => {
    const exposes = mfConfig('products')?.exposes ?? {};
    const keys = Object.keys(exposes);

    if (!keys.includes('./ProductCard')) {
      labFail({
        step: 's4',
        input: `exposes in ${CONFIG}`,
        expected: "a second key './ProductCard'",
        received: brief(keys),
        why: `
Steps 1 and 2 federated a whole routed area: the shell handed its outlet over and
the remote owned the page. This is the finer-grained version — one component,
dropped into a page the *shell* owns and lays out.

That difference is the interesting part. A federated route is a boundary between
teams. A federated component is a boundary inside a single page, which means the
shell's layout and the remote's component now have to agree about far more:
spacing, theming, what happens when it is missing.

The shell's home page already asks for it. Publishing it is one line here.
        `,
        where: CONFIG,
      });
    }
  });

  it('[s4] ./ProductCard points at the card component', () => {
    const target = (mfConfig('products')?.exposes ?? {})['./ProductCard'];

    if (target !== CARD) {
      labFail({
        step: 's4',
        input: `exposes['./ProductCard'] in ${CONFIG}`,
        expected: CARD,
        received: brief(target ?? 'undefined'),
        why: `
Workspace-root relative, same as './Routes'. Publish the component file itself —
the shell imports the module and reads \`ProductCardComponent\` off it.
        `,
        where: CONFIG,
      });
    }
  });

  it('[s4] the shell embeds the card without letting it break the page', () => {
    const home = wsFile(HOME) ?? '';
    const imports = /import\(\s*['"]products\/ProductCard['"]\s*\)/.test(home);
    const guarded = /catch/.test(home);

    if (!imports || !guarded) {
      labFail({
        step: 's4',
        input: HOME,
        expected: 'an import of products/ProductCard inside a try/catch',
        received: `import found: ${imports}, catch found: ${guarded}`,
        why: `
This one ships already written — it is here as a check that you have not removed
the guard while experimenting.

An optional embed must never take the host's page down with it. If the remote does
not publish the component, or is unreachable, the \`catch\` renders nothing and the
rest of the home page is unaffected. That is the behaviour you want, and it is also
why a missing expose is easy to miss: nothing complains.
        `,
        where: HOME,
      });
    }
  });
});
