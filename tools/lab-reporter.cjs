/**
 * Writes the outcome of `npm test` somewhere the /lab dashboard can read it.
 *
 * Why this exists. Two of the six steps cannot be observed from a running browser
 * at all: `strictVersion` is consumed by webpack and never recorded anywhere, and
 * DESIGN.md is a file on disk. Before this reporter the dashboard reported those
 * two as permanently "unknown", which meant 25 of the advertised 100 points were
 * unreachable — you could finish the lab perfectly and watch the scoreboard stop at
 * 75.
 *
 * So the dashboard reads this file and shows it in its own column, labelled
 * `npm test`, next to what it observed live. The two checks stay independent — that
 * is the whole point of having both — but now you can SEE them agree instead of
 * being told they would.
 *
 * The mapping needs nothing clever: every check in tests/ is already named with its
 * step tag, e.g. `[s3] shell shares @mf-lab/shared-auth as a singleton`.
 */
const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, join } = require('node:path');

const OUT = join(__dirname, '..', '.lab', 'status.json');
const TAG = /\[(s[1-6])\]/;

class LabReporter {
  onRunComplete(_contexts, results) {
    /** @type {Record<string, {passed: number, total: number, failing: string[]}>} */
    const steps = {};

    for (const file of results.testResults) {
      for (const t of file.testResults) {
        const tag = TAG.exec(t.fullName ?? t.title ?? '');
        if (!tag) continue;

        const id = tag[1];
        const step = (steps[id] ??= { passed: 0, total: 0, failing: [] });
        step.total++;
        if (t.status === 'passed') step.passed++;
        // The first line of a labFail() message is the `Input:` row, which names
        // what was checked. That is the useful half in a dashboard-sized space.
        else step.failing.push(firstLine(t.failureMessages?.[0]) || t.title);
      }
    }

    const payload = {
      ranAt: Date.now(),
      // Kept separate from the per-step counts so the dashboard can say "the suite
      // did not finish" rather than silently showing stale per-step numbers.
      suite: {
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        total: results.numTotalTests,
      },
      steps,
    };

    try {
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, JSON.stringify(payload, null, 2));
    } catch {
      // Never fail a test run over telemetry for a dashboard. If this file cannot
      // be written the dashboard just keeps saying "run npm test", which is a
      // correct thing for it to say.
    }
  }
}

function firstLine(message) {
  if (!message) return '';
  // Jest prefixes the thrown message with `Error: `, so the Input: row is not
  // necessarily at the start of its line.
  const match = /^(?:Error:\s*)?Input:\s*(.+)$/m.exec(
    String(message)
      .split('\n')
      .map((l) => l.trim())
      .join('\n')
  );
  return match ? match[1].trim() : '';
}

module.exports = LabReporter;
