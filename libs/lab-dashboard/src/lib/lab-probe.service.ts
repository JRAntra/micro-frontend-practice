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

/** Written by tools/lab-reporter.cjs, served by the shell's dev server. */
const STATUS_URL = '/lab-status.json';

/** After this long, a test result is described as stale rather than current. */
const STATUS_FRESH_MS = 5 * 60_000;

/** Survives reloads so the score never goes backwards. See `restore()`. */
const PROGRESS_KEY = 'mf-lab.progress.v1';

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

/** One step's result from the last `npm test` run. */
export interface TestResult {
  passed: number;
  total: number;
  failing: string[];
}

export interface StepState {
  step: LabStepMeta;
  /** The overall verdict: live observation and the test suite, reconciled. */
  verdict: Verdict;
  /** What the running browser can see right now. */
  live: Verdict;
  /** What `npm test` last said, or null if it has not run. */
  test: TestResult | null;
  /** One line: what is true right now. */
  detail: string;
  /** One line: what to do about it. Empty when done. */
  next: string;
  /**
   * True when this step was earned earlier in the session but cannot be observed
   * from the page you are on now. Keeps the score monotonic — see `restore()`.
   */
  fromMemory: boolean;
  /**
   * Set when the two sources contradict each other, with the likely reason.
   *
   * This is the most useful thing the dashboard can tell you and it only exists
   * because the two checks are independent: the browser and the test suite
   * disagreeing almost always means your source and your running build have
   * drifted apart — you edited a federation config and did not restart, or you
   * restarted and did not re-run the tests.
   */
  disagreement: string | null;
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

export interface TestRun {
  /** Epoch ms of the run, or null when `npm test` has never been run. */
  ranAt: number | null;
  suite: { passed: number; failed: number; total: number } | null;
  steps: Record<string, TestResult>;
  /** Older than STATUS_FRESH_MS. Shown as a caveat rather than hidden. */
  stale: boolean;
}

/** One observed transition, for the "what changed" strip. */
export interface Change {
  at: number;
  /** 'good' reads as progress, 'bad' as a regression, 'info' as neither. */
  tone: 'good' | 'bad' | 'info';
  text: string;
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
  testRun: TestRun;
  steps: StepState[];
  points: number;
  maxPoints: number;
  doneCount: number;
  requiredComplete: boolean;
  /** The lowest-numbered step that is not done yet, or null when finished. */
  nextStep: LabStepMeta | null;
  /** Most recent first, newest transitions the probe has observed. */
  changes: Change[];
}

/**
 * Polls the running applications and turns what it finds into per-step verdicts.
 *
 * Two sources, kept separate on purpose.
 *
 *   LIVE   — the remote's published manifest, the federation runtime's own
 *            registry, the live share scope. Everything the browser can see.
 *   TEST   — the last `npm test`, read from /lab-status.json. Nothing here parses
 *            source; that is the suite's job.
 *
 * They are independent checks on the same work, and the dashboard shows both rather
 * than blending them, because two of the six steps are invisible to one of the two:
 * `strictVersion` is consumed by webpack and never recorded anywhere, and DESIGN.md
 * is a file. Before the test side existed those steps were permanently "unknown",
 * which quietly made 25 of the advertised 100 points unreachable.
 */
@Injectable({ providedIn: 'root' })
export class LabProbeService {
  private readonly router = inject(Router);
  private readonly snapshotSig = signal<LabSnapshot>(this.empty());

  readonly snapshot = this.snapshotSig.asReadonly();

  /** Set once the candidate has visited /products, so step 3 knows it can trust the id count. */
  private remoteSeen = false;

  /**
   * Steps observed `done` at any point this session, with when.
   *
   * Without this the score visibly goes backwards: step 3's verdict needs the
   * remote to have rendered in the CURRENT page load, so walking from /products to
   * /lab used to drop the badge from 4/6 · 75 to 3/6 · 55 and put a completed step
   * back to "unknown". Nobody reads that as "the probe lost visibility"; they read
   * it as "I broke something".
   */
  private earned = new Map<string, number>();

  private timer: ReturnType<typeof setInterval> | null = null;
  private subscribers = 0;
  private tick = 0;
  private changes: Change[] = [];
  private previous: LabSnapshot | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    this.restore();

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
        this.persist();
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

  /** Forget everything remembered across reloads, for a genuinely clean run. */
  resetProgress(): void {
    this.earned.clear();
    this.remoteSeen = false;
    this.changes = [];
    this.previous = null;
    try {
      sessionStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* private mode, or storage disabled. Nothing to clear. */
    }
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const [remote, testRun] = await Promise.all([
      this.fetchRemoteManifest(),
      this.fetchTestRun(),
    ]);
    const ids = this.sessionIds();
    const shareScope = liveShareScope();
    const containerLoaded = remoteContainerLoaded('products', PRODUCTS_ORIGIN);

    const session: SessionState = { ids, remoteSeen: this.remoteSeen };
    const steps = LAB_STEPS.map((step) =>
      this.evaluate(step, {
        remote,
        session,
        shareScope,
        containerLoaded,
        testRun,
      })
    );

    for (const s of steps) {
      if (s.verdict === 'done' && !this.earned.has(s.step.id)) {
        this.earned.set(s.step.id, Date.now());
      }
    }
    this.persist();

    const done = steps.filter((s) => s.verdict === 'done');
    const next = steps.find((s) => s.verdict !== 'done')?.step ?? null;

    const snapshot: LabSnapshot = {
      checkedAt: Date.now(),
      tick: ++this.tick,
      remote,
      session,
      shareScope,
      containerLoaded,
      testRun,
      steps,
      points: done.reduce((sum, s) => sum + s.step.points, 0),
      maxPoints: MAX_POINTS,
      doneCount: done.length,
      requiredComplete: steps
        .filter((s) => s.step.required)
        .every((s) => s.verdict === 'done'),
      nextStep: next,
      changes: [],
    };

    this.recordChanges(this.previous, snapshot);
    this.previous = snapshot;
    this.snapshotSig.set({ ...snapshot, changes: [...this.changes] });
  }

  // --- persistence -----------------------------------------------------------

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        remoteSeen?: boolean;
        earned?: Record<string, number>;
      };
      this.remoteSeen = saved.remoteSeen ?? false;
      this.earned = new Map(Object.entries(saved.earned ?? {}));
    } catch {
      /* Corrupt or unavailable. Start fresh rather than crash the dashboard. */
    }
  }

  private persist(): void {
    try {
      sessionStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          remoteSeen: this.remoteSeen,
          earned: Object.fromEntries(this.earned),
        })
      );
    } catch {
      /* Storage disabled. The score just stops surviving reloads. */
    }
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

  private async fetchTestRun(): Promise<TestRun> {
    const none: TestRun = { ranAt: null, suite: null, steps: {}, stale: false };
    try {
      const res = await fetch(STATUS_URL, { cache: 'no-store' });
      if (!res.ok) return none;
      const body = (await res.json()) as Partial<TestRun>;
      if (!body?.ranAt) return none;
      return {
        ranAt: body.ranAt,
        suite: body.suite ?? null,
        steps: body.steps ?? {},
        stale: Date.now() - body.ranAt > STATUS_FRESH_MS,
      };
    } catch {
      // No dev-server route (a plain static host, say). The dashboard falls back
      // to live observation only, and says so.
      return none;
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

  // --- what changed ----------------------------------------------------------

  /**
   * Diff two consecutive probes.
   *
   * The probe has always run every two seconds and thrown the previous result away,
   * which meant the most informative thing on the page — the moment something
   * changed — was the one thing it could not show you. Editing a federation config
   * costs a dev-server restart, so by the time the page updates you have been
   * looking at something else for forty seconds and cannot remember what the table
   * said before.
   */
  private recordChanges(before: LabSnapshot | null, after: LabSnapshot): void {
    if (!before) return;
    const add = (tone: Change['tone'], text: string) =>
      this.changes.unshift({ at: Date.now(), tone, text });

    for (const s of after.steps) {
      const was = before.steps.find((p) => p.step.id === s.step.id);
      if (was && was.verdict !== 'done' && s.verdict === 'done') {
        add('good', `Step ${s.step.n} complete · +${s.step.points} points`);
      }
    }

    if (!before.containerLoaded && after.containerLoaded) {
      add(
        'good',
        'remoteEntry.mjs fetched from the products origin — real federation'
      );
    }
    if (before.remote.reachable && !after.remote.reachable) {
      add('bad', 'The products remote stopped answering');
    }
    if (!before.remote.reachable && after.remote.reachable) {
      add('info', 'The products remote is back');
    }

    const exposesBefore = before.remote.exposes.join(',');
    const exposesAfter = after.remote.exposes.join(',');
    if (exposesBefore !== exposesAfter && after.remote.exposes.length) {
      add(
        'info',
        `The remote now publishes ${after.remote.exposes.join(', ')}`
      );
    }

    const idsBefore = before.session.ids.length;
    const idsAfter = after.session.ids.length;
    if (idsBefore !== idsAfter && idsAfter > 0) {
      add(
        idsAfter < idsBefore || idsAfter === 1 ? 'good' : 'bad',
        `Session store instances: ${idsBefore} → ${idsAfter}`
      );
    }

    const scopeBefore = new Set((before.shareScope ?? []).map((p) => p.name));
    for (const p of after.shareScope ?? []) {
      if (!scopeBefore.has(p.name) && scopeBefore.size > 0) {
        add('info', `${p.name} entered the share scope`);
      }
    }

    for (const s of after.steps) {
      const was = before.steps.find((p) => p.step.id === s.step.id);
      if (was && !was.disagreement && s.disagreement) {
        add('bad', `Step ${s.step.n}: live view and npm test disagree`);
      }
    }

    if (before.testRun.ranAt !== after.testRun.ranAt && after.testRun.ranAt) {
      const s = after.testRun.suite;
      add(
        s && s.failed === 0 ? 'good' : 'info',
        s
          ? `npm test finished — ${s.passed}/${s.total} passing`
          : 'npm test finished'
      );
    }

    this.changes = this.changes.slice(0, 12);
  }

  // --- verdicts --------------------------------------------------------------

  /**
   * Reconcile the live observation with the test suite, and with anything this
   * session already earned.
   *
   * The rule: a step is done when EITHER source can prove it. They check different
   * things and neither is complete on its own — see the class comment — so
   * demanding both would make two steps unachievable and the other four
   * needlessly brittle.
   */
  private settle(
    step: LabStepMeta,
    live: Verdict,
    test: TestResult | null,
    detail: string,
    next: string,
    stale: boolean
  ): StepState {
    const testRan = !!test && test.total > 0;
    const testPasses = testRan && test.passed === test.total;

    /*
     * A stale result must not grant `done`. It used to, and the row then read
     * "complete" directly above a live detail line saying the opposite — the
     * dashboard contradicting itself in two adjacent sentences, which is worse
     * than either verdict alone.
     */
    const testProves = testPasses && !stale;

    let verdict: Verdict = live === 'done' || testProves ? 'done' : live;
    let fromMemory = false;
    let disagreement: string | null = null;

    if (verdict !== 'done' && this.earned.has(step.id)) {
      verdict = 'done';
      fromMemory = true;
    }

    // The two sources contradicting each other is a finding, not noise.
    if (live === 'todo' && testPasses) {
      disagreement = stale
        ? 'Your source passed the last test run, but that run is old and the running app disagrees. Re-run npm test.'
        : 'Your source is correct but the running app disagrees — you almost certainly need to restart that dev server.';
    } else if (live === 'done' && testRan && !testPasses) {
      disagreement =
        'The running app looks right but npm test does not — re-run it; if it still fails, the browser is holding an older build.';
    }

    if (fromMemory) {
      const at = new Date(this.earned.get(step.id) ?? Date.now());
      detail = `${detail} (earned at ${at.toLocaleTimeString()} — this page cannot re-check it)`;
      next = '';
    } else if (verdict === 'done') {
      next = '';
    }

    return {
      step,
      verdict,
      live,
      test,
      detail,
      next,
      fromMemory,
      disagreement,
    };
  }

  private evaluate(
    step: LabStepMeta,
    ctx: {
      remote: RemoteState;
      session: SessionState;
      shareScope: SharedPackage[] | null;
      containerLoaded: boolean;
      testRun: TestRun;
    }
  ): StepState {
    const { remote, session, shareScope, containerLoaded, testRun } = ctx;
    const test = testRun.steps[step.id] ?? null;
    const settle = (live: Verdict, detail: string, next = '') =>
      this.settle(step, live, test, detail, next, testRun.stale);

    switch (step.id) {
      case 's1': {
        if (!remote.reachable) {
          return settle(
            'unknown',
            `The products remote is not answering on ${PRODUCTS_ORIGIN}.`,
            'Start it in a second terminal: npm run start:remote:watch'
          );
        }
        const has = remote.exposes.includes('./Routes');
        return settle(
          has ? 'done' : 'todo',
          has
            ? `The remote publishes ${remote.exposes.join(', ')}.`
            : 'The remote is running but its exposes map is empty — it publishes nothing.',
          "Add './Routes' to exposes in apps/products/module-federation.config.ts"
        );
      }

      case 's2': {
        const declared = containerLoaded;
        const routed = this.hasProductsRoute();
        if (declared && routed) {
          return settle(
            'done',
            'The shell fetched remoteEntry.mjs from the products origin and routes /products ' +
              'to it. This is real federation, not a bundled import.'
          );
        }
        if (!runtimeAvailable()) {
          return settle(
            'unknown',
            'The Module Federation runtime is not present in this page.',
            'Reload after a rebuild; if it persists, run npm test -- -t "[s2]"'
          );
        }
        if (routed && !declared) {
          return settle(
            'todo',
            'There is a /products route and it may well render — but no remoteEntry.mjs was ever ' +
              'fetched, so that import is being compiled straight into the host bundle via the ' +
              'tsconfig path mapping. One build, one deploy, no independence.',
            "Add 'products' to remotes in apps/shell/module-federation.config.ts, then restart the dev server"
          );
        }
        return settle(
          'todo',
          declared
            ? 'The container loaded, but nothing routes to it yet.'
            : 'The shell has never fetched remoteEntry.mjs, and has no /products route.',
          declared
            ? 'Add the lazy /products route in apps/shell/src/app/app.routes.ts'
            : 'Declare the remote, then add the lazy /products route'
        );
      }

      case 's3': {
        const shared = shareScope?.find((p) => p.name === SESSION_LIB) ?? null;
        if (!session.remoteSeen) {
          return settle(
            'unknown',
            'The remote has not rendered yet, so only the shell has built a store.',
            'Open the Products page once, then come back'
          );
        }
        if (session.ids.length === 1 && shared?.singleton) {
          return settle(
            'done',
            `One store instance (${session.ids[0]}), shared as a singleton.`
          );
        }
        return settle(
          'todo',
          session.ids.length > 1
            ? `${session.ids.length} separate stores exist (${session.ids.join(
                ', '
              )}) — the remote cannot see your sign-in.`
            : `${SESSION_LIB} is not in the live share scope.`,
          'Stop returning false for @mf-lab/shared-auth in both shared() callbacks'
        );
      }

      case 's4': {
        if (!remote.reachable) {
          return settle(
            'unknown',
            'The products remote is not answering.',
            'Start it: npm run start:remote:watch'
          );
        }
        const has = remote.exposes.includes('./ProductCard');
        return settle(
          has ? 'done' : 'todo',
          has
            ? 'The remote publishes ./ProductCard.'
            : "The remote publishes no './ProductCard', so the shell's home page renders no card.",
          "Add './ProductCard' to exposes in apps/products/module-federation.config.ts"
        );
      }

      /*
       * Live observation deliberately never reports 'done' for s5.
       *
       * Nx already defaults @angular/core to singleton + strictVersion, so the live
       * share scope shows both flags set before you have written anything — this
       * probe cannot tell "you declared the policy" from "the framework defaulted
       * it". An earlier version of this file did report done here, and it handed
       * out 15 points for an untouched config.
       *
       * The distinction only exists in your source, so `npm test` owns the verdict
       * and settle() takes it from there. What the dashboard usefully adds is the
       * flags actually in force at runtime.
       */
      case 's5': {
        const core = shareScope?.find((p) => p.name === ANGULAR_CORE) ?? null;
        if (!core) {
          return settle(
            'unknown',
            'No @angular/core entry in the live share scope yet.',
            'Load the Products page so the two applications negotiate their shared packages'
          );
        }
        return settle(
          'unknown',
          `In force at runtime: @angular/core ${
            core.version
          }, singleton ${yesNo(core.singleton)}, strictVersion ${yesNo(
            core.strictVersion
          )}, required ${
            core.requiredVersion || '—'
          }. Nx sets all of these by default, so this view cannot tell whether you chose them.`,
          'Declare the policy in both configs — npm test reads your source and settles this step'
        );
      }

      case 's6':
      default:
        return settle(
          'unknown',
          'Six written answers in DESIGN.md. The check counts real prose under every heading; a trainer reads the reasoning.',
          'Answer all six questions in DESIGN.md, then run npm test'
        );
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
      testRun: { ranAt: null, suite: null, steps: {}, stale: false },
      steps: LAB_STEPS.map((step) => ({
        step,
        verdict: 'unknown' as Verdict,
        live: 'unknown' as Verdict,
        test: null,
        detail: 'Not probed yet.',
        next: '',
        fromMemory: false,
        disagreement: null,
      })),
      points: 0,
      maxPoints: MAX_POINTS,
      doneCount: 0,
      requiredComplete: false,
      nextStep: LAB_STEPS[0],
      changes: [],
    };
  }
}

function yesNo(v: boolean): string {
  return v ? 'yes' : 'no';
}
