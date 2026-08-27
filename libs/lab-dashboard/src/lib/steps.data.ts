/** The six lab steps, mirroring `guide/`. Points total 100; the required track is 60. */
export interface LabStepMeta {
  id: 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
  n: number;
  title: string;
  required: boolean;
  points: number;
  doc: string;
}

export const LAB_STEPS: readonly LabStepMeta[] = [
  {
    id: 's1',
    n: 1,
    title: 'Publish something from the remote',
    required: true,
    points: 15,
    doc: 'guide/01-publish-from-the-remote.md',
  },
  {
    id: 's2',
    n: 2,
    title: 'Load the remote from the shell',
    required: true,
    points: 25,
    doc: 'guide/02-load-the-remote-from-the-shell.md',
  },
  {
    id: 's3',
    n: 3,
    title: 'Share state as a singleton',
    required: true,
    points: 20,
    doc: 'guide/03-share-state-as-a-singleton.md',
  },
  {
    id: 's4',
    n: 4,
    title: 'Federate one component, not a whole page',
    required: false,
    points: 15,
    doc: 'guide/04-federate-one-component.md',
  },
  {
    id: 's5',
    n: 5,
    title: 'Pin the framework contract',
    required: false,
    points: 15,
    doc: 'guide/05-pin-the-framework-contract.md',
  },
  {
    id: 's6',
    n: 6,
    title: 'Write down the design reasoning',
    required: false,
    points: 10,
    doc: 'guide/06-write-down-the-design-reasoning.md',
  },
] as const;

export const MAX_POINTS = LAB_STEPS.reduce((sum, s) => sum + s.points, 0);
