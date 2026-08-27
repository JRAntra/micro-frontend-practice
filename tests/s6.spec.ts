import { wsFile } from '../tools/inspect';
import { brief, labFail } from './report';

const STEP = 's6';

/**
 * A structural check only. Nobody's design reasoning is being graded by a regex —
 * a trainer reads the prose in the submission. This test exists so the step can
 * turn green, and so an empty template doesn't get submitted by accident.
 */
const MIN_WORDS = 25;

describe('step 6 — write down the design reasoning', () => {
  it('[s6] DESIGN.md answers every question with real prose', () => {
    const doc = wsFile('DESIGN.md');
    if (doc === null) {
      labFail({
        step: STEP,
        input: 'DESIGN.md',
        expected: 'the design document to exist at the workspace root',
        received: 'file not found',
        why: 'DESIGN.md ships with the lab. If it is gone, restore it with `git checkout DESIGN.md`.',
        where: 'DESIGN.md',
      });
    }

    const sections = splitSections(doc);
    if (sections.length === 0) {
      labFail({
        step: STEP,
        input: 'DESIGN.md',
        expected: 'the "## " question headings that shipped with the file',
        received: 'no headings found',
        why: 'Keep the headings and write underneath them — the headings are how each answer is located.',
        where: 'DESIGN.md',
      });
    }

    const thin = sections.filter((s) => s.words < MIN_WORDS);
    if (thin.length) {
      labFail({
        step: STEP,
        input: `${sections.length} question(s) in DESIGN.md`,
        expected: `every question answered in at least ${MIN_WORDS} words`,
        received: `${thin.length} still unanswered or too short: ${brief(
          thin.map((t) => `${t.heading} (${t.words}w)`)
        )}`,
        why: [
          'These are the questions a tech lead will actually ask you about a microfrontend design,',
          'and none of them have a single right answer — which is exactly why they are worth writing',
          'down rather than testing.',
          '',
          'A trainer reads what you write here, so argue a position and say what it costs. "It',
          'depends" is only useful if you say what it depends ON.',
        ].join('\n'),
        where: 'DESIGN.md',
      });
    }
  });
});

interface Section {
  heading: string;
  words: number;
}

function splitSections(doc: string): Section[] {
  const lines = doc.split(/\r?\n/);
  const out: Section[] = [];
  let current: Section | null = null;
  let inFence = false;
  let inPrompt = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;

    const heading = !inFence && /^##\s+(.+)/.exec(line);
    if (heading) {
      if (current) out.push(current);
      current = { heading: heading[1].trim(), words: 0 };
      inPrompt = false;
      continue;
    }
    if (!current) continue;

    const text = line.trim();
    if (!text) continue;

    /**
     * The italic prompts that ship with the template must not count as answers,
     * and they wrap across several lines — so this tracks the whole italic BLOCK,
     * not just single-line italics. (A per-line test silently let an untouched
     * DESIGN.md pass, which is exactly the free-points bug this avoids.)
     */
    if (!inPrompt && /^[*_]/.test(text)) {
      inPrompt = !/[*_]$/.test(text);
      continue;
    }
    if (inPrompt) {
      if (/[*_]$/.test(text)) inPrompt = false;
      continue;
    }

    if (text.startsWith('>') || /^-{3,}$/.test(text)) continue;
    current.words += text.split(/\s+/).filter(Boolean).length;
  }
  if (current) out.push(current);
  return out;
}
