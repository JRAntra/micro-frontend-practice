/** The six lab steps, mirroring `guide/`. Points total 100; the required track is 60. */
export interface LabStepMeta {
  id: 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
  n: number;
  title: string;
  required: boolean;
  points: number;
  doc: string;
  /**
   * The step as a ticket on the board, in the workspace's own fiction. The guides
   * use the same framing — a lab that has spent this much effort on a storefront
   * may as well let you work there.
   */
  ticket: string;
  /** Roughly how long the step takes once you have read it. */
  minutes: number;
  /** The files this step touches. Shown on /start and beside the current step. */
  files: readonly string[];
  /**
   * Where the verdict comes from.
   *
   * `live`  — the dashboard can see it in the running browser.
   * `test`  — only `npm test` can: it leaves no trace at runtime (s5) or is a file
   *           on disk (s6). Before the two were shown separately these steps sat at
   *           "unknown" forever and 25 points were unreachable.
   * `both`  — observable live AND checked by the suite. Agreement is the signal.
   */
  provenBy: 'live' | 'test' | 'both';
}

export const LAB_STEPS: readonly LabStepMeta[] = [
  {
    id: 's1',
    n: 1,
    title: 'Publish something from the remote',
    required: true,
    points: 15,
    doc: 'guide/01-publish-from-the-remote.md',
    ticket:
      'The products team shipped their split-out app and forgot to make any of it public.',
    minutes: 5,
    files: ['apps/products/module-federation.config.ts'],
    provenBy: 'both',
  },
  {
    id: 's2',
    n: 2,
    title: 'Load the remote from the shell',
    required: true,
    points: 25,
    doc: 'guide/02-load-the-remote-from-the-shell.md',
    ticket:
      'The Products link in our own header goes to a 404. Customers have noticed.',
    minutes: 15,
    files: [
      'apps/shell/module-federation.config.ts',
      'apps/shell/src/app/app.routes.ts',
    ],
    provenBy: 'both',
  },
  {
    id: 's3',
    n: 3,
    title: 'Share state as a singleton',
    required: true,
    points: 20,
    doc: 'guide/03-share-state-as-a-singleton.md',
    ticket:
      'Support ticket: "I signed in, then the catalogue asked who I was." Basket count never moves either.',
    minutes: 15,
    files: [
      'apps/shell/module-federation.config.ts',
      'apps/products/module-federation.config.ts',
    ],
    provenBy: 'both',
  },
  {
    id: 's4',
    n: 4,
    title: 'Federate one component, not a whole page',
    required: false,
    points: 15,
    doc: 'guide/04-federate-one-component.md',
    ticket:
      'Marketing wants the week’s pick on the home page. The card is the products team’s; the page is ours.',
    minutes: 10,
    files: ['apps/products/module-federation.config.ts'],
    provenBy: 'both',
  },
  {
    id: 's5',
    n: 5,
    title: 'Pin the framework contract',
    required: false,
    points: 15,
    doc: 'guide/05-pin-the-framework-contract.md',
    ticket:
      'Products want to move to Angular 20 next quarter. Nobody can say what happens to us if they do.',
    minutes: 10,
    files: [
      'apps/shell/module-federation.config.ts',
      'apps/products/module-federation.config.ts',
    ],
    provenBy: 'test',
  },
  {
    id: 's6',
    n: 6,
    title: 'Write down the design reasoning',
    required: false,
    points: 10,
    doc: 'guide/06-write-down-the-design-reasoning.md',
    ticket:
      'Architecture review on Friday. Six questions, and "it depends" is not an answer on its own.',
    minutes: 25,
    files: ['DESIGN.md'],
    provenBy: 'test',
  },
] as const;

export const MAX_POINTS = LAB_STEPS.reduce((sum, s) => sum + s.points, 0);

export const TOTAL_MINUTES = LAB_STEPS.reduce((sum, s) => sum + s.minutes, 0);

export function stepById(id: string): LabStepMeta | undefined {
  return LAB_STEPS.find((s) => s.id === id);
}
