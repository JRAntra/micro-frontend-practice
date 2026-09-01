import { LabStepMeta } from './steps.data';

/**
 * One badge per step, awarded when the step lands.
 *
 * These are not scoring — the points already do that. They exist because
 * "3 of 6 · 55 pts" tells you where you are and nothing about what you can now do,
 * and the second thing is what people actually carry out of a lab. Each badge names
 * a capability in the language you would use to describe it to somebody else.
 *
 * The `fact` is the payoff line, revealed with the badge: something true about the
 * mechanism that you are now in a position to appreciate and would have skimmed
 * past an hour ago.
 */
export interface Achievement {
  id: LabStepMeta['id'];
  /** Short enough to fit on a badge. */
  name: string;
  /** One line: what you proved you can do. */
  earnedFor: string;
  /** The payoff, revealed on unlock. */
  fact: string;
  /** Inline SVG path data, drawn on a 24x24 grid. */
  glyph: string;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 's1',
    name: 'First Shipment',
    earnedFor: 'You gave a remote a public API.',
    fact: "An exposes map doesn't ship your whole app. Each entry becomes its own async chunk, fetched only when a consumer actually imports it — so publishing more costs a consumer nothing until they ask for it.",
    glyph:
      'M4 8 L12 4 L20 8 L20 17 L12 21 L4 17 Z M4 8 L12 12 L20 8 M12 12 L12 21',
  },
  {
    id: 's2',
    name: 'Over the Wire',
    earnedFor: 'One application is now running code it never compiled.',
    fact: "remoteEntry.mjs doesn't contain your components. It's a small map of promises that resolve to chunks fetched later — which is why a remote can publish a hundred modules and cost the host one small request.",
    glyph:
      'M3 12 L9 12 M15 12 L21 12 M9 8 L15 8 L15 16 L9 16 Z M6 9 L6 15 M18 9 L18 15',
  },
  {
    id: 's3',
    name: 'One Source of Truth',
    earnedFor: 'Two bundles, one store. You found a bug with no error message.',
    fact: 'That bug printed nothing, failed no build and broke no test you had. Behaviour across a federation boundary is decided by build configuration — so that is where you look when two halves of one page disagree about reality.',
    glyph:
      'M12 3 L12 10 M12 14 L12 21 M5 7 L12 10 L19 7 M5 17 L12 14 L19 17 M9 12 L15 12',
  },
  {
    id: 's4',
    name: 'Drop-In',
    earnedFor: 'You federated a component into a page somebody else owns.',
    fact: 'A federated route is a boundary between teams. A federated component is a boundary inside one page — so now both teams have to agree on spacing, theming, and what shows up when it is missing.',
    glyph: 'M4 5 L20 5 L20 19 L4 19 Z M9 10 L15 10 L15 15 L9 15 Z M4 9 L20 9',
  },
  {
    id: 's5',
    name: 'Contract Signed',
    earnedFor: 'Your version policy is written down instead of inherited.',
    fact: 'strictVersion leaves no trace in mf-manifest.json — webpack consumes it and never records it. A setting only your source can prove is a setting only your source can review.',
    glyph: 'M6 3 L18 3 L18 21 L6 21 Z M9 8 L15 8 M9 12 L15 12 M9 16 L13 16',
  },
  {
    id: 's6',
    name: 'Opinions, Documented',
    earnedFor: 'You argued a position and said what it costs.',
    fact: 'Most microfrontend failures are organisational, not technical: nobody owns the shared-dependency policy, so it drifts until it breaks. You now have six written answers for the review where that gets decided.',
    glyph:
      'M5 4 L15 4 L19 8 L19 20 L5 20 Z M15 4 L15 8 L19 8 M9 13 L15 13 M9 16 L13 16',
  },
] as const;

export function achievementFor(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
