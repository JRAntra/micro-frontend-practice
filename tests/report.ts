/**
 * Teaching failures.
 *
 * A red test in this lab should read as a lesson, not a verdict. Every failure
 * names what was checked, what was wanted, what was found, and then explains why
 * it matters and where to go.
 */
export interface LabFailure {
  /** Step id, e.g. 's2'. */
  step: string;
  /** What was being checked, in plain words. One line. */
  input: string;
  /** What the lab wanted. One line. */
  expected: string;
  /** What it actually found. One line. */
  received: string;
  /** Why this matters and how to think about it. Multi-line is fine. */
  why: string;
  /** Where to go and change something. */
  where?: string;
}

const DOC: Record<string, string> = {
  s1: 'guide/01-publish-from-the-remote.md',
  s2: 'guide/02-load-the-remote-from-the-shell.md',
  s3: 'guide/03-share-state-as-a-singleton.md',
  s4: 'guide/04-federate-one-component.md',
  s5: 'guide/05-pin-the-framework-contract.md',
  s6: 'guide/06-write-down-the-design-reasoning.md',
};

export function labFail(f: LabFailure): never {
  const lines = [
    `Input:    ${oneLine(f.input)}`,
    `Expected: ${oneLine(f.expected)}`,
    `Received: ${oneLine(f.received)}`,
    '',
    f.why.trim(),
  ];
  if (f.where) lines.push('', `Where to look: ${f.where}`);
  lines.push('', `Read: ${DOC[f.step] ?? 'guide/00-overview.md'}`);
  throw new Error(lines.join('\n'));
}

/** Collapse to a single line so the three summary rows stay readable. */
function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Truncate a blob for use inside a one-line Received:. */
export function brief(value: unknown, max = 160): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (s === undefined) return 'undefined';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
