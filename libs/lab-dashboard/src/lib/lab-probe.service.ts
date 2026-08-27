import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  SharedPackage,
  liveShareScope,
  remoteContainerLoaded,
  runtimeAvailable,
} from './federation-runtime';
import { LAB_STEPS, LabStepMeta, MAX_POINTS } from './steps.data';

/** Where the products remote is served. Must match `serve.options.port` in apps/products/project.json. */
export const PRODUCTS_ORIGIN = 'http://localhost:4272';

const SESSION_LIB = '@mf-lab/shared-auth';
const ANGULAR_CORE = '@angular/core';

/** One exposed module as it appears in a built mf-manifest.json. */
interface ManifestExpose {
  name?: string;
  path?: string;
}

interface RemoteManifest {
  name?: string;
  exposes?: ManifestExpose[];
}

export type Verdict = 'done' | 'todo' | 'unknown';

export interface StepState {
  step: LabStepMeta;
  verdict: Verdict;
  /** One line: what is true right now. */
  detail: string;
  /** One line: what to do about it. Empty when done. */
  next: string;
}

export interface RemoteState {
  /** Did the remote answer at all? */
  reachable: boolean;
  /** Keys the remote publishes, e.g. ['./Routes']. */
  exposes: string[];
  /** Populated when the fetch failed, for the "is it even running?" message. */
  error: string | null;
}

export interface SessionState {
  /** Every SessionStore copy that has been constructed in this tab. */
  ids: string[];
  /** The remote has rendered at least once, so its copy has had a chance to register. */
  remoteSeen: boolean;
}

export interface LabSnapshot {
  /** Epoch ms of this probe. Rendered so you can see the page is live. */
  checkedAt: number;
  /** How many probes have run since the page loaded. */
  tick: number;
  remote: RemoteState;
  session: SessionState;
  shareScope: SharedPackage[] | null;
  /** The remote's container was genuinely fetched and initialised. */
  containerLoaded: boolean;
  steps: StepState[];
  points: number;
  maxPoints: number;
  doneCount: number;
  requiredComplete: boolean;
}

/**
 * Polls the running applications and turns what it finds into per-step verdicts.
 *
 * Every verdict is derived from something the browser can actually observe: the
 * remote's published manifest, the federation runtime's own registry, and the live
 * share scope. Nothing here parses source files — that is what `npm test` does,
 * and the two are deliberately independent checks on the same work.
 */
@Injectable({ providedIn: 'root' })
export class LabProbeService {
  private readonly router = inject(Router);
  private readonly snapshotSig = signal<LabSnapshot>(this.empty());

  readonly snapshot = this.snapshotSig.asReadonly();

  /** Set once the candidate has visited /products, so step 3 knows it can trust the id count. */
  private remoteSeen = false;

  private timer: ReturnType<typeof setInterval> | null = null;
  private subscribers = 0;
  private tick = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());

    /*
     * A completed navigation to /products is what tells us the remote's code has
     * run, and therefore that its own SessionStore has had a chance to construct.
     * Without that, step 3 is undecidable: one registered store id could mean
     * "correctly shared" or "the remote simply hasn't rendered yet", and reporting
     * the first when it is the second would be a lie.
     */
    this.router.events.subscribe((e) => {
      if (
        e instanceof NavigationEnd &&
        e.urlAfterRedirects.startsWith('/products')
      ) {
        this.remoteSeen = true;
      }
    });
  }

  /** Begin polling. Idempotent; the last consumer to release stops the timer. */
  start(intervalMs = 2000): void {
    this.subscribers++;
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), intervalMs);
  }

  release(): void {
    this.subscribers = Math.max(0, this.subscribers - 1);
    if (this.subscribers === 0) this.stop();
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async refresh(): Promise<void> {
    const remote = await this.fetchRemoteManifest();
    const ids = this.sessionIds();
    const shareScope = liveShareScope();
    const containerLoaded = remoteContainerLoaded('products', PRODUCTS_ORIGIN);

    const session: SessionState = { ids, remoteSeen: this.remoteSeen };
    const steps = LAB_STEPS.map((step) =>
      this.evaluate(step, { remote, session, shareScope, containerLoaded })
    );

    const done = steps.filter((s) => s.verdict === 'done');
    this.snapshotSig.set({
      checkedAt: Date.now(),
      tick: ++this.tick,
      remote,
      session,
      shareScope,
      containerLoaded,
      steps,
      points: done.reduce((sum, s) => sum + s.step.points, 0),
      maxPoints: MAX_POINTS,
      doneCount: done.length,
      requiredComplete: steps
        .filter((s) => s.step.required)
        .every((s) => s.verdict === 'done'),
    });
  }

  // --- individual probes -----------------------------------------------------

  private async fetchRemoteManifest(): Promise<RemoteState> {
    try {
      const res = await fetch(`${PRODUCTS_ORIGIN}/mf-manifest.json`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        return { reachable: true, exposes: [], error: `HTTP ${res.status}` };
      }
      const manifest = (await res.json()) as RemoteManifest;
      const exposes = (manifest.exposes ?? [])
        .map((e) => e.path ?? e.name ?? '')
        .filter((p) => p.length > 0);
      return { reachable: true, exposes, error: null };
    } catch (err) {
      // Not running, or CORS refused. Either way the candidate needs the same fix.
      return { reachable: false, exposes: [], error: String(err) };
    }
  }

  private sessionIds(): string[] {
    const g = globalThis as unknown as { __MF_LAB_SESSION_IDS__?: string[] };
    return [...new Set(g.__MF_LAB_SESSION_IDS__ ?? [])];
  }

  /** Does the shell's own route table have a lazy /products route? */
  private hasProductsRoute(): boolean {
    return this.router.config.some(
      (r) => r.path === 'products' && !!r.loadChildren
    );
  }

  // --- verdicts --------------------------------------------------------------

  private evaluate(
    step: LabStepMeta,
    ctx: {
      remote: RemoteState;
      session: SessionState;
      shareScope: SharedPackage[] | null;
      containerLoaded: boolean;
    }
  ): StepState {
    const { remote, session, shareScope, containerLoaded } = ctx;

    switch (step.id) {
      case 's1': {
        if (!remote.reachable) {
          return {
            step,
            verdict: 'unknown',
            detail: `The products remote is not answering on ${PRODUCTS_ORIGIN}.`,
            next: 'Start it in a second terminal: npm run start:remote',
          };
        }
        const has = remote.exposes.includes('./Routes');
        return {
          step,
          verdict: has ? 'done' : 'todo',
          detail: has
            ? `The remote publishes ${remote.exposes.join(', ')}.`
            : 'The remote is running but its exposes map is empty — it publishes nothing.',
          next: has
            ? ''
            : "Add './Routes' to exposes in apps/products/module-federation.config.ts",
        };
      }

      case 's2': {
        const declared = containerLoaded;
        const routed = this.hasProductsRoute();
        if (declared && routed) {
          return {
            step,
            verdict: 'done',
            detail:
              'The shell fetched remoteEntry.mjs from the products origin and routes /products ' +
              'to it. This is real federation, not a bundled import.',
            next: '',
          };
        }
        if (!runtimeAvailable()) {
          return {
            step,
            verdict: 'unknown',
            detail:
              'The Module Federation runtime is not present in this page.',
            next: 'Reload after a rebuild; if it persists, run npm test -- -t "[s2]"',
          };
        }
        if (routed && !declared) {
          return {
            step,
            verdict: 'todo',
            detail:
              'There is a /products route and it may well render — but no remoteEntry.mjs was ever ' +
              'fetched, so that import is being compiled straight into the host bundle via the ' +
              'tsconfig path mapping. One build, one deploy, no independence.',
            next: "Add 'products' to remotes in apps/shell/module-federation.config.ts, then restart the dev server",
          };
        }
        return {
          step,
          verdict: 'todo',
          detail: declared
            ? 'The container loaded, but nothing routes to it yet.'
            : 'The shell has never fetched remoteEntry.mjs, and has no /products route.',
          next: declared
            ? 'Add the lazy /products route in apps/shell/src/app/app.routes.ts'
            : 'Declare the remote, then add the lazy /products route',
        };
      }

      case 's3': {
        const shared = shareScope?.find((p) => p.name === SESSION_LIB) ?? null;
        if (!session.remoteSeen) {
          return {
            step,
            verdict: 'unknown',
            detail:
              'The remote has not rendered yet, so only the shell has built a store.',
            next: 'Open the Products page once, then come back',
          };
        }
        if (session.ids.length === 1 && shared?.singleton) {
          return {
            step,
            verdict: 'done',
            detail: `One store instance (${session.ids[0]}), shared as a singleton.`,
            next: '',
          };
        }
        return {
          step,
          verdict: 'todo',
          detail:
            session.ids.length > 1
              ? `${
                  session.ids.length
                } separate stores exist (${session.ids.join(
                  ', '
                )}) — the remote cannot see your sign-in.`
              : `${SESSION_LIB} is not in the live share scope.`,
          next: 'Stop returning false for @mf-lab/shared-auth in both shared() callbacks',
        };
      }

      case 's4': {
        if (!remote.reachable) {
          return {
            step,
            verdict: 'unknown',
            detail: 'The products remote is not answering.',
            next: 'Start it: npm run start:remote',
          };
        }
        const has = remote.exposes.includes('./ProductCard');
        return {
          step,
          verdict: has ? 'done' : 'todo',
          detail: has
            ? 'The remote publishes ./ProductCard.'
            : "The remote publishes no './ProductCard', so the shell's home page renders no card.",
          next: has
            ? ''
            : "Add './ProductCard' to exposes in apps/products/module-federation.config.ts",
        };
      }

      /*
       * Deliberately never reports 'done'.
       *
       * Nx already defaults @angular/core to singleton + strictVersion, so the live
       * share scope shows both flags set before you have written anything — this
       * probe cannot tell "you declared the policy" from "the framework defaulted
       * it". An earlier version of this file did report done here, and it handed out
       * 15 points for an untouched config.
       *
       * The distinction only exists in your source, so `npm test` owns this step.
       * What the dashboard can usefully do is show you the flags that are in force.
       */
      case 's5': {
        const core = shareScope?.find((p) => p.name === ANGULAR_CORE) ?? null;
        if (!core) {
          return {
            step,
            verdict: 'unknown',
            detail: 'No @angular/core entry in the live share scope yet.',
            next: 'Load the Products page so the two applications negotiate their shared packages',
          };
        }
        return {
          step,
          verdict: 'unknown',
          detail:
            `In force now: @angular/core ${core.version}, singleton ${yesNo(
              core.singleton
            )}, ` +
            `strictVersion ${yesNo(core.strictVersion)}, required ${
              core.requiredVersion || '—'
            }. ` +
            'Nx sets these by default, so this view cannot tell whether you declared them.',
          next: 'Checked by npm test -- -t "[s5]", which reads your config',
        };
      }

      case 's6':
      default:
        return {
          step,
          verdict: 'unknown',
          detail: 'Written answers in DESIGN.md — a trainer reads these.',
          next: 'Answer all six questions in DESIGN.md, then run npm test -- -t "[s6]"',
        };
    }
  }

  private empty(): LabSnapshot {
    return {
      checkedAt: 0,
      tick: 0,
      remote: { reachable: false, exposes: [], error: null },
      session: { ids: [], remoteSeen: false },
      shareScope: null,
      containerLoaded: false,
      steps: LAB_STEPS.map((step) => ({
        step,
        verdict: 'unknown' as Verdict,
        detail: 'Not probed yet.',
        next: '',
      })),
      points: 0,
      maxPoints: MAX_POINTS,
      doneCount: 0,
      requiredComplete: false,
    };
  }
}

function yesNo(v: boolean): string {
  return v ? 'yes' : 'no';
}
