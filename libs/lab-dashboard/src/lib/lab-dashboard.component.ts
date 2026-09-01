import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '@mf-lab/shared-auth';
import { AchievementBadgesComponent } from './achievement-badges.component';
import { achievementFor } from './achievements.data';
import { BlastRadiusComponent } from './blast-radius.component';
import { ChangeTickerComponent } from './change-ticker.component';
import { CompletionComponent } from './completion.component';
import { FederationDiagramComponent } from './federation-diagram.component';
import { LabProbeService, PRODUCTS_ORIGIN, StepState } from './lab-probe.service';
import { TOTAL_MINUTES } from './steps.data';

/** The two packages the lab is actually about; pinned to the top of the table. */
const KEY_PACKAGES = ['@angular/core', '@mf-lab/shared-auth'];

/** Circumference of the progress ring, r=52. Kept here so the template stays flat. */
const RING = 2 * Math.PI * 52;

/**
 * The lab dashboard, mounted by the shell at /lab.
 *
 * Two sources, shown side by side and never blended: what the running browser can
 * observe, and what your last `npm test` found. They check different things — see
 * LabProbeService — and watching them agree is the point of having both.
 *
 * Everything here is drawn with the storefront's own design tokens and components:
 * `.card`, `.chip`, `.section-head`, the `--text-*` scale. An earlier version
 * aliased the tokens and then hardcoded its own type sizes, which made /lab read as
 * a debug overlay bolted onto the side of the application rather than a page of it.
 */
@Component({
  selector: 'lab-dashboard',
  imports: [
    RouterLink,
    AchievementBadgesComponent,
    FederationDiagramComponent,
    ChangeTickerComponent,
    BlastRadiusComponent,
    CompletionComponent,
  ],
  template: `
    <div class="page lab stack-lg">
      <!-- ------------------------------------------------------------ score -->
      @if (finished()) {
      <lab-completion [snapshot]="snap()" />
      } @else {
      <section class="hero card card-pad">
        <div class="ring" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle class="track" cx="60" cy="60" r="52" />
            <circle
              class="fill"
              cx="60"
              cy="60"
              r="52"
              [attr.stroke-dasharray]="ring"
              [attr.stroke-dashoffset]="ringOffset()"
            />
          </svg>
          <div class="ring-label">
            <strong>{{ snap().points }}</strong>
            <span class="tiny muted">/ {{ snap().maxPoints }}</span>
          </div>
        </div>

        <div class="hero-copy">
          @if (started()) {
          <span class="eyebrow">{{ snap().doneCount }} of 6 shipped</span>
          <h1>{{ headline() }}</h1>
          } @else {
          <span class="eyebrow">Day one at Boundary &amp; Co.</span>
          <h1>Six tickets, about {{ totalMinutes }} minutes.</h1>
          }

          <p class="lede">{{ blurb() }}</p>

          @if (snap().nextStep; as next) {
          <div class="upnext">
            <span class="chip chip-accent">Next up</span>
            <strong>{{ next.n }}. {{ next.title }}</strong>
            <span class="tiny muted">≈{{ next.minutes }} min</span>
          </div>
          }

          <div class="row row-wrap">
            <a routerLink="/start" class="btn btn-sm">Read the brief</a>
            <a routerLink="/products" class="btn btn-sm btn-quiet"
              >Open the storefront</a
            >
          </div>
        </div>

        <div class="badge-row">
          <lab-achievement-badges [earned]="earnedIds()" />
        </div>
      </section>
      }

      <!-- ------------------------------------------------------- remote down -->
      @if (!snap().remote.reachable) {
      <p class="note note-warn">
        The products remote is not answering on
        <code>{{ productsOrigin }}</code
        >. Start it in a second terminal with
        <code>npm run start:remote:watch</code> — most of this page stays blank
        until it is up.
      </p>
      }

      <!-- --------------------------------------------------------- diagram -->
      <section>
        <div class="section-head">
          <span class="eyebrow">Right now</span>
          <h2>What is wired up</h2>
          <span class="chip push">check #{{ snap().tick }}</span>
        </div>
        <div class="card card-pad">
          <lab-federation-diagram [snapshot]="snap()" />
        </div>
      </section>

      <!-- ----------------------------------------------------------- steps -->
      <section>
        <div class="section-head">
          <span class="eyebrow">The board</span>
          <h2>Six tickets</h2>
          <span
            class="chip push"
            [class.chip-good]="snap().requiredComplete"
            [class.chip-warn]="!snap().requiredComplete"
          >
            required track
            {{ snap().requiredComplete ? 'complete' : 'in progress' }}
          </span>
        </div>

        <ol class="steps">
          @for (s of snap().steps; track s.step.id) {
          <li
            class="card"
            [class]="'card ' + s.verdict"
            [class.current]="s.step.id === snap().nextStep?.id"
          >
            <div class="row head">
              <span class="tickbox" [class.on]="s.verdict === 'done'">
                @if (s.verdict === 'done') {
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8.5 L6.5 12 L13 4.5" />
                </svg>
                } @else {
                <span aria-hidden="true">{{ s.step.n }}</span>
                }
              </span>

              <strong class="title">{{ s.step.title }}</strong>

              <span class="chip tiny">{{
                s.step.required ? 'required' : 'bonus'
              }}</span>
              <span class="pts" [class.won]="s.verdict === 'done'"
                >{{ s.verdict === 'done' ? '+' : '' }}{{ s.step.points }}</span
              >
            </div>

            @if (s.verdict !== 'done') {
            <p class="ticket">“{{ s.step.ticket }}”</p>
            }

            <p class="detail">{{ s.detail }}</p>

            @if (s.next) {
            <p class="next">→ {{ s.next }}</p>
            }

            <div class="row row-wrap proof">
              <span
                class="chip tiny"
                [class.chip-good]="s.live === 'done'"
                [title]="'What this page can observe in the running browser'"
              >
                live: {{ s.live === 'done' ? 'confirmed' : s.live }}
              </span>

              <span
                class="chip tiny"
                [class.chip-good]="s.test && s.test.passed === s.test.total"
                [class.chip-warn]="!!s.test && s.test.passed !== s.test.total"
                [title]="'What your last npm test run found'"
              >
                @if (s.test) { npm test: {{ s.test.passed }}/{{
                  s.test.total
                }}
                } @else { npm test: not run }
              </span>

              @if (s.step.provenBy === 'test') {
              <span class="tiny muted"
                >Only <code>npm test</code> can settle this one</span
              >
              } @if (s.fromMemory) {
              <span class="tiny muted">remembered from earlier this session</span>
              }

              <code class="tiny muted push">{{ s.step.doc }}</code>
            </div>

            @if (s.disagreement) {
            <p class="clash">⚠ {{ s.disagreement }}</p>
            } @if (s.verdict === 'done' && fact(s); as f) {
            <p class="fact">💡 {{ f }}</p>
            }
          </li>
          }
        </ol>

        @if (snap().testRun.ranAt === null) {
        <p class="note">
          <strong>Two of these six cannot be checked from a browser.</strong>
          <code>strictVersion</code> is consumed by webpack and recorded nowhere,
          and <code>DESIGN.md</code> is a file on disk. Run
          <code>npm test</code> once and this page will show what it found
          alongside what it can see itself.
        </p>
        } @else if (snap().testRun.stale) {
        <p class="tiny muted">
          Test results are from {{ ago(snap().testRun.ranAt!) }} — re-run
          <code>npm test</code> if you have changed a config since.
        </p>
        }
      </section>

      <!-- --------------------------------------------------------- ticker -->
      <section>
        <div class="section-head">
          <span class="eyebrow">Cause and effect</span>
          <h2>Live changes</h2>
        </div>
        <lab-change-ticker [changes]="snap().changes" />
      </section>

      <!-- -------------------------------------------------- session stores -->
      <section>
        <div class="section-head">
          <span class="eyebrow">Step 3's evidence</span>
          <h2>Session store instances</h2>
        </div>
        <div class="card card-pad stack">
          <p class="tiny muted">
            Every copy of <code>SessionStore</code> constructed in this tab.
            <strong>One</strong> means the shell and the remote share it.
            <strong>Two</strong> means they each bundled their own, and signing
            in on the shell will never reach the remote.
          </p>

          @if (!snap().session.remoteSeen) {
          <p class="note">
            Only the shell has built a store so far. Open the
            <a routerLink="/products">Products page</a> once so the remote
            builds its own, then come back.
          </p>
          }

          <ul class="ids">
            @for (id of snap().session.ids; track id) {
            <li
              class="chip"
              [class.chip-good]="snap().session.ids.length === 1"
              [class.chip-bad]="snap().session.ids.length > 1"
            >
              <code>{{ id }}</code>
              <span class="muted">{{
                id === shellInstanceId ? 'shell' : 'remote'
              }}</span>
            </li>
            } @empty {
            <li class="chip">none yet</li>
            }
          </ul>
        </div>
      </section>

      <!-- ------------------------------------------------------ share scope -->
      <section>
        <div class="section-head">
          <span class="eyebrow">The negotiation</span>
          <h2>Live share scope</h2>
        </div>
        <div class="card card-pad stack">
          <p class="tiny muted">
            The actual runtime agreement between the two applications, and the
            only place <code>strictVersion</code> is visible at all — it never
            reaches <code>mf-manifest.json</code>. Note that Nx sets all of
            these flags by default before you write anything, so a green cell is
            not by itself evidence that you chose it. That is exactly why step 5
            is settled by <code>npm test</code> instead.
          </p>

          @if (snap().shareScope === null) {
          <p class="note">
            Nothing negotiated yet. The share scope fills in once the shell
            actually loads the remote, so this stays empty until step 2 is done.
          </p>
          } @else {
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>package</th>
                  <th>version</th>
                  <th>singleton</th>
                  <th>strictVersion</th>
                  <th>provided by</th>
                  <th>used by</th>
                </tr>
              </thead>
              <tbody>
                @for (p of orderedScope(); track p.name) {
                <tr [class.key]="isKeyPackage(p.name)">
                  <td>
                    <code>{{ p.name }}</code>
                  </td>
                  <td>
                    {{ p.version || '—' }}
                    @if (p.versionCount > 1) {
                    <span class="chip chip-bad tiny"
                      >{{ p.versionCount }} versions</span
                    >
                    }
                  </td>
                  <td [class.yes]="p.singleton">
                    {{ p.singleton ? 'yes' : 'no' }}
                  </td>
                  <td [class.yes]="p.strictVersion">
                    {{ p.strictVersion ? 'yes' : 'no' }}
                  </td>
                  <td>{{ p.providedBy || '—' }}</td>
                  <td>{{ p.usedBy.join(', ') || '—' }}</td>
                </tr>
                }
              </tbody>
            </table>
          </div>
          }
        </div>
      </section>

      <!-- ----------------------------------------------------- blast radius -->
      <section>
        <lab-blast-radius [snapshot]="snap()" />
      </section>

      <!-- --------------------------------------------------------- footer -->
      <footer class="row row-wrap labfoot">
        <span class="tiny muted">
          Re-checked every two seconds · last check #{{ snap().tick }} at
          {{ clock(snap().checkedAt) }}
        </span>
        <button
          type="button"
          class="btn btn-sm btn-quiet push"
          (click)="probe.resetProgress()"
          title="Forget the steps this session remembers, and re-probe from scratch"
        >
          Reset progress
        </button>
      </footer>
    </div>
  `,
  styles: [
    `
      /*
       * No local design tokens. Everything below composes the storefront's own
       * system from styles/theme.css so this page reads as part of the shop
       * rather than as instrumentation stapled to it.
       */
      :host {
        display: block;
      }
      .lab {
        padding-bottom: var(--gap-7);
      }
      h2 {
        font-size: var(--text-lg);
      }

      /* ---------------------------------------------------------- hero ---- */
      .hero {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--gap-6);
        align-items: center;
        border-radius: var(--r-xl);
      }
      .ring {
        position: relative;
        width: 132px;
        height: 132px;
      }
      .ring svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      .ring circle {
        fill: none;
        stroke-width: 9;
        stroke-linecap: round;
      }
      .ring .track {
        stroke: var(--paper-3);
      }
      .ring .fill {
        stroke: var(--good);
        transition: stroke-dashoffset 0.7s var(--ease);
      }
      .ring-label {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        justify-items: center;
        line-height: 1.1;
      }
      .ring-label strong {
        font-size: var(--text-2xl);
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.03em;
      }

      .hero-copy {
        display: grid;
        gap: var(--gap-3);
        justify-items: start;
      }
      .hero h1 {
        font-size: var(--text-xl);
      }
      .hero .lede {
        color: var(--ink-2);
        max-width: 56ch;
      }
      .upnext {
        display: flex;
        align-items: center;
        gap: var(--gap-2);
        flex-wrap: wrap;
        padding: var(--gap-2) var(--gap-3);
        border-radius: var(--r);
        background: var(--paper-2);
        border: 1px solid var(--line);
        font-size: var(--text-sm);
      }

      .badge-row {
        grid-column: 1 / -1;
        border-top: 1px solid var(--line);
        padding-top: var(--gap-4);
      }

      /* --------------------------------------------------------- steps ---- */
      ol.steps {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--gap-3);
      }
      ol.steps li {
        display: grid;
        gap: var(--gap-2);
        padding: var(--gap-4) var(--gap-5);
        border-left: 3px solid var(--line-2);
        transition: border-color 0.3s var(--ease), opacity 0.3s var(--ease);
      }
      ol.steps li.done {
        border-left-color: var(--good);
        opacity: 0.78;
      }
      ol.steps li.todo {
        border-left-color: var(--warn);
      }
      ol.steps li.current {
        opacity: 1;
        box-shadow: var(--shadow);
      }
      .head {
        gap: var(--gap-3);
      }
      .tickbox {
        flex: 0 0 auto;
        width: 24px;
        height: 24px;
        border-radius: var(--r-pill);
        display: grid;
        place-items: center;
        background: var(--paper-3);
        color: var(--ink-3);
        font-size: var(--text-xs);
        font-weight: 700;
      }
      .tickbox.on {
        background: var(--good);
        color: #fff;
      }
      .tickbox svg {
        width: 13px;
        height: 13px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.4;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .title {
        font-size: var(--text-base);
      }
      .pts {
        margin-left: auto;
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        color: var(--ink-4);
        font-size: var(--text-sm);
      }
      .pts.won {
        color: var(--good);
      }

      .ticket {
        font-size: var(--text-sm);
        font-style: italic;
        color: var(--ink-2);
        padding-left: 36px;
      }
      .detail,
      .next,
      .fact {
        font-size: var(--text-sm);
        padding-left: 36px;
        line-height: 1.55;
      }
      .detail {
        color: var(--ink-3);
      }
      .next {
        color: var(--accent-ink);
        font-weight: 600;
      }
      .fact {
        color: var(--ink-2);
      }
      .clash {
        color: var(--warn);
        font-weight: 600;
      }
      .proof {
        padding-left: 36px;
        gap: var(--gap-2);
      }

      /* ----------------------------------------------------------- ids ---- */
      ul.ids {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        gap: var(--gap-2);
        flex-wrap: wrap;
      }
      ul.ids li {
        gap: var(--gap-2);
      }

      /* --------------------------------------------------------- table ---- */
      .scroll {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--text-sm);
      }
      th {
        text-align: left;
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--ink-3);
        font-weight: 650;
        padding: 0 var(--gap-3) var(--gap-2) 0;
        border-bottom: 1px solid var(--line);
        white-space: nowrap;
      }
      td {
        padding: 7px var(--gap-3) 7px 0;
        border-bottom: 1px solid var(--line);
        color: var(--ink-2);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      tr.key td {
        color: var(--ink);
        font-weight: 600;
        background: var(--accent-soft);
      }
      td.yes {
        color: var(--good);
        font-weight: 650;
      }

      .labfoot {
        border-top: 1px solid var(--line);
        padding-top: var(--gap-4);
      }

      /* -------------------------------------------------------- narrow ---- */
      @media (max-width: 820px) {
        .hero {
          grid-template-columns: 1fr;
          justify-items: start;
        }
      }
    `,
  ],
})
export class LabDashboardComponent implements OnInit, OnDestroy {
  readonly probe = inject(LabProbeService);
  readonly snap = computed(() => this.probe.snapshot());

  readonly productsOrigin = PRODUCTS_ORIGIN;
  readonly totalMinutes = TOTAL_MINUTES;
  readonly ring = RING;

  /**
   * The shell's own store id, captured at construction.
   *
   * This component is shell code, so whichever store the injector hands it is by
   * definition the shell's. Any other id in the list therefore belongs to the
   * remote — which is the entire question step 3 asks.
   */
  readonly shellInstanceId = inject(SessionStore).instanceId;

  readonly started = computed(() => this.snap().doneCount > 0);
  readonly finished = computed(
    () => this.snap().doneCount === this.snap().steps.length
  );

  readonly ringOffset = computed(() => {
    const s = this.snap();
    return RING * (1 - s.points / s.maxPoints);
  });

  readonly headline = computed(() => {
    const s = this.snap();
    if (s.requiredComplete) return 'The required track is done. Bonus tickets remain.';
    if (s.doneCount >= 3) return 'Most of the way there.';
    return 'The storefront is coming back together.';
  });

  readonly blurb = computed(() => {
    const s = this.snap();
    if (!this.started()) {
      return `The products team has just split out into its own deployable and took the catalogue with them. Nothing on this page is wired up yet — that is correct, and it is your week's work.`;
    }
    if (s.requiredComplete) {
      return 'Shell and remote are talking, and they agree about who is signed in. What is left is the version contract and the write-up — the two things a browser cannot check for you.';
    }
    return 'Live view of what your two applications are actually doing, re-checked every two seconds. Component edits show up here on save; a federation config needs its dev server restarted.';
  });

  readonly orderedScope = computed(() => {
    const scope = this.snap().shareScope ?? [];
    const key = scope.filter((p) => this.isKeyPackage(p.name));
    const rest = scope.filter((p) => !this.isKeyPackage(p.name));
    return [...key, ...rest];
  });

  isKeyPackage(name: string): boolean {
    return KEY_PACKAGES.includes(name);
  }

  readonly earnedIds = computed(() =>
    this.snap()
      .steps.filter((s) => s.verdict === 'done')
      .map((s) => s.step.id)
  );

  isDone(id: string): boolean {
    return (
      this.snap().steps.find((s) => s.step.id === id)?.verdict === 'done'
    );
  }

  /** The payoff line, shown only once the step has actually landed. */
  fact(s: StepState): string {
    return s.verdict === 'done' ? achievementFor(s.step.id)?.fact ?? '' : '';
  }

  clock(at: number): string {
    return at
      ? new Date(at).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '—';
  }

  ago(at: number): string {
    const mins = Math.round((Date.now() - at) / 60_000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 minute ago';
    if (mins < 60) return `${mins} minutes ago`;
    return `${Math.round(mins / 60)} hours ago`;
  }

  ngOnInit(): void {
    this.probe.start();
  }

  ngOnDestroy(): void {
    this.probe.release();
  }
}
