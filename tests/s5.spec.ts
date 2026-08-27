import { sharedDecisionFor } from '../tools/inspect';
import { brief, labFail } from './report';

const CORE = '@angular/core';
const CONFIGS: Record<string, string> = {
  shell: 'apps/shell/module-federation.config.ts',
  products: 'apps/products/module-federation.config.ts',
};

describe('step 5 — pin the framework contract', () => {
  for (const app of ['shell', 'products'] as const) {
    it(`[s5] ${app} shares ${CORE} as a singleton`, () => {
      const decision = sharedDecisionFor(app, CORE);

      if (
        decision === false ||
        decision === undefined ||
        decision === 'no-callback'
      ) {
        labFail({
          step: 's5',
          input: `shared('${CORE}', …) in ${CONFIGS[app]}`,
          expected: 'a shared config object with singleton: true',
          received: brief(decision),
          why: `
Angular in particular must be a singleton. Two copies of \`@angular/core\` in one
page means two dependency-injection systems, two zones, and two copies of the
component metadata — which surfaces as \`NG0203: inject() must be called from an
injection context\` at some unrelated place in the app, hours later.

See TOUR.md → "Why Angular in particular must be a singleton".
          `,
          where: CONFIGS[app],
        });
      }

      if (decision.singleton !== true) {
        labFail({
          step: 's5',
          input: `shared('${CORE}', …) in ${CONFIGS[app]}`,
          expected: 'singleton: true',
          received: brief(decision),
          why: `
Nx's defaults would have given you this. If \`singleton\` is now false or missing, the
callback is overriding it — return a config that keeps it.
          `,
          where: CONFIGS[app],
        });
      }
    });

    it(`[s5] ${app} declares an explicit strictVersion policy for ${CORE}`, () => {
      const decision = sharedDecisionFor(app, CORE);
      if (
        decision === false ||
        decision === undefined ||
        decision === 'no-callback'
      ) {
        return; // already explained above
      }

      if (decision.strictVersion !== true) {
        labFail({
          step: 's5',
          input: `shared('${CORE}', …) in ${CONFIGS[app]}`,
          expected: 'strictVersion: true',
          received: brief(decision),
          why: `
\`singleton\` says "one copy". \`strictVersion\` says what to do when the two
applications disagree about *which* copy.

Without it, a mismatch is a console warning and the page carries on with whichever
version happened to load first — a decision made by network timing, in production,
silently. With it, the mismatch is an error at load time: loud, immediate, and
attributable.

That is a real trade-off and you are choosing a side. You are saying a version
disagreement between the shell and the products team should stop the page rather
than run something nobody tested. Write down why in DESIGN.md question 3.

Note that this setting leaves no trace in the built \`mf-manifest.json\` — webpack
consumes it and never records it. This test reads your config by evaluating it, and
the /lab dashboard reads it out of the live share scope. Those are the only two
places it is observable.
          `,
          where: CONFIGS[app],
        });
      }
    });
  }
});
