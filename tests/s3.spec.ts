import { sharedDecisionFor } from '../tools/inspect';
import { brief, labFail } from './report';

const LIB = '@mf-lab/shared-auth';
const CONFIGS: Record<string, string> = {
  shell: 'apps/shell/module-federation.config.ts',
  products: 'apps/products/module-federation.config.ts',
};

describe('step 3 — share state as a singleton', () => {
  for (const app of ['shell', 'products'] as const) {
    it(`[s3] ${app} shares ${LIB} instead of excluding it`, () => {
      const decision = sharedDecisionFor(app, LIB);

      if (decision === 'no-callback') {
        labFail({
          step: 's3',
          input: `shared callback in ${CONFIGS[app]}`,
          expected: 'a shared callback that returns a config for ' + LIB,
          received: 'there is no shared callback at all',
          why: `
Without a \`shared\` callback Nx applies its defaults, which would actually work
here. But the callback is where step 5 lives too, so keep it and make it correct
rather than deleting it.
          `,
          where: CONFIGS[app],
        });
      }

      if (decision === false) {
        labFail({
          step: 's3',
          input: `shared('${LIB}', …) in ${CONFIGS[app]}`,
          expected: 'a shared config object',
          received: 'false — the library is excluded from sharing',
          why: `
Returning \`false\` tells webpack "do not share this; each application bundles its
own copy." A previous developer did that here to silence a version warning, and it
silenced the warning by creating the exact bug the warning was about.

Two copies of \`SessionStore\` means two \`signal\`s holding two different users.
Signing in on the shell updates the shell's copy; the remote reads its own and sees
nobody. Nothing throws. The feature is just quietly broken, which is the worst
failure mode a shared-state bug can have.

Open /lab and look at the "session store instances" panel — with this line in
place you will see two ids.
          `,
          where: CONFIGS[app],
        });
      }

      if (decision === undefined) {
        labFail({
          step: 's3',
          input: `shared('${LIB}', …) in ${CONFIGS[app]}`,
          expected: 'a shared config object',
          received: 'undefined',
          why: `
Returning \`undefined\` leaves the package with no share configuration, which is not
the same as accepting the defaults. Return the config object you were handed, or an
explicit one of your own.
          `,
          where: CONFIGS[app],
        });
      }
    });

    it(`[s3] ${app} shares ${LIB} as a singleton`, () => {
      const decision = sharedDecisionFor(app, LIB);
      if (
        decision === false ||
        decision === undefined ||
        decision === 'no-callback'
      ) {
        // The previous check already explained this; don't repeat it.
        return;
      }

      if (decision.singleton !== true) {
        labFail({
          step: 's3',
          input: `shared('${LIB}', …) in ${CONFIGS[app]}`,
          expected: 'singleton: true',
          received: brief(decision),
          why: `
Sharing alone is not enough. Without \`singleton\`, webpack is free to load more than
one version of the package into the same page if the two applications ask for
different ones — and a store is only a store if there is exactly one of it.

\`singleton: true\` says: whatever happens, one copy in this browser tab, and if the
versions cannot be reconciled, warn rather than silently duplicate.
          `,
          where: CONFIGS[app],
        });
      }
    });
  }
});
