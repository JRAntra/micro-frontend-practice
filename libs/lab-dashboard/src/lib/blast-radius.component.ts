import { Component, computed, effect, input, signal } from '@angular/core';
import { LabSnapshot } from './lab-probe.service';

/** Survives the reload that is the entire point of stage 2. */
const KEY = 'mf-lab.blast.v1';

type Stage = 'idle' | 'armed' | 'observed' | 'debriefed';

interface Saved {
  stage: Stage;
  /** When the remote was last seen alive, so the debrief can say how long it was out. */
  wentDownAt?: number;
}

/**
 * The blast-radius experiment, run for real.
 *
 * There is a constraint here worth stating, because it shapes the whole component:
 * **the dashboard cannot watch the interesting part.** With a statically declared
 * remote, webpack initialises every container while resolving `main.ts`'s
 * `import('./bootstrap')` — so a dead remote does not cost the shell its Products
 * page, it costs the shell its entire boot. Blank page. No header, no /lab, no
 * dashboard to report anything.
 *
 * A "simulate outage" button would dodge that by faking it, in a lab whose central
 * lesson is that a rendered page is not evidence. So instead this panel runs a real
 * outage in two stages and narrates across the gap in its own existence:
 *
 *   Stage 1  the remote goes down while this page is already loaded. The shell
 *            booted fine, so everything keeps working except /products — and the
 *            probe sees the remote go red within two seconds. Observable.
 *   Stage 2  you reload. That is the blackout, and nothing here runs.
 *            The flag in sessionStorage survives it; when the remote comes back and
 *            the shell boots again, this panel opens with the debrief.
 *
 * The gap between the two is the finding.
 */
@Component({
  selector: 'lab-blast-radius',
  template: `
    <div class="card card-pad blast" [class.live]="stage() === 'observed'">
      <div class="section-head">
        <span class="eyebrow">Experiment</span>
        <h2>Blast radius</h2>
        <span
          class="chip push"
          [class.chip-good]="up()"
          [class.chip-bad]="!up()"
        >
          remote is {{ up() ? 'up' : 'down' }}
        </span>
      </div>

      @if (stage() === 'debriefed') {
      <!-- ------------------------------------------------ the payoff -->
      <div class="note note-warn debrief">
        <strong>Welcome back. Here is what you just saw.</strong>
        <p>
          A blank page. Not the Products page missing —
          <em>the whole shell</em>. No header, no basket, no 404, and no
          dashboard to tell you why. In the console: two anonymous
          <code>Failed to load resource</code> lines and nothing else.
        </p>
        <p>
          Notice what did <em>not</em> happen. The
          <code>.catch()</code> on the <code>/products</code> route never ran —
          the router never got to exist.
          <code>RemoteUnavailableComponent</code>, the fallback this lab hands
          you, is unreachable in exactly the situation its name describes. Even
          the <code>.catch()</code> in <code>main.ts</code> printed nothing,
          because the failure is inside the container-init code webpack wraps
          <em>around</em> that import.
        </p>
        <p class="tiny">
          Why there: shared modules must be initialised before any shared code
          runs, so webpack initialises the share scope
          <strong>and every statically declared remote</strong> while resolving
          <code>import('./bootstrap')</code>. Declaring a remote at build time
          puts it in your boot sequence, not in your route.
        </p>
      </div>
      <div class="row row-wrap">
        <a class="btn btn-sm" href="../TOUR.md">TOUR.md → Blast radius</a>
        <button type="button" class="btn btn-sm btn-quiet" (click)="reset()">
          Run it again
        </button>
      </div>
      <p class="tiny muted">
        Now write it up — that is <code>DESIGN.md</code> question 5, and it asks
        for what you observed rather than what you would have guessed.
      </p>
      } @else {
      <p class="lede">
        One remote going down is the failure mode this architecture introduces.
        Question 5 asks you to describe it from observation, so observe it — it
        takes about a minute and the result is not what most people predict.
      </p>

      <ol class="stages">
        <li [class.on]="stage() === 'armed'" [class.done]="past('armed')">
          <span class="n">1</span>
          <div>
            <strong>Stop the remote.</strong>
            <p class="tiny muted">
              <kbd>Ctrl</kbd>+<kbd>C</kbd> the terminal running
              <code>npm run start:remote:watch</code>. This page stays alive —
              the shell already booted — so you can watch it happen.
            </p>
            @if (stage() === 'armed' && up()) {
            <p class="tiny waiting">Waiting for the remote to go away…</p>
            }
          </div>
        </li>

        <li [class.on]="stage() === 'observed'" [class.done]="past('observed')">
          <span class="n">2</span>
          <div>
            <strong>Look around before you reload.</strong>
            @if (stage() === 'observed') {
            <ul class="tick">
              <li class="ok">Header, nav, basket, sign-in — still working</li>
              <li class="ok">This dashboard — still working</li>
              <li class="ok">Your session — still working</li>
              <li class="no">/products — cannot load its chunk</li>
            </ul>
            <p class="tiny muted">
              This is the blast radius you would <em>expect</em>: one section
              down, the rest of the site fine. Now reload the page.
            </p>
            } @else {
            <p class="tiny muted">
              Everything except <code>/products</code> should still work. This
              panel will tick the list once it sees the remote go.
            </p>
            }
          </div>
        </li>

        <li>
          <span class="n">3</span>
          <div>
            <strong>Reload the shell.</strong>
            <p class="tiny muted">
              Then bring the remote back up and return here. This panel
              remembers where you were and will tell you what you just saw.
            </p>
          </div>
        </li>
      </ol>

      <div class="row row-wrap">
        @if (stage() === 'idle') {
        <button type="button" class="btn btn-primary btn-sm" (click)="arm()">
          Start the experiment
        </button>
        } @else {
        <button type="button" class="btn btn-sm btn-quiet" (click)="reset()">
          Cancel
        </button>
        }
        <span class="tiny muted">
          Prefer the production-shaped version?
          <code>npm run blast-radius</code> serves the built apps with the
          container returning a real 404.
        </span>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .blast {
        display: grid;
        gap: var(--gap-4);
      }
      .blast.live {
        border-color: var(--warn-line);
      }
      .lede {
        color: var(--ink-2);
        font-size: var(--text-sm);
      }

      ol.stages {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--gap-3);
      }
      ol.stages li {
        display: grid;
        grid-template-columns: 26px minmax(0, 1fr);
        gap: var(--gap-3);
        padding: var(--gap-3);
        border-radius: var(--r);
        border: 1px solid transparent;
        transition: background 0.2s var(--ease), border-color 0.2s var(--ease);
      }
      ol.stages li.on {
        background: var(--warn-soft);
        border-color: var(--warn-line);
      }
      ol.stages li.done {
        opacity: 0.62;
      }
      .n {
        width: 26px;
        height: 26px;
        border-radius: var(--r-pill);
        display: grid;
        place-items: center;
        font-size: var(--text-xs);
        font-weight: 700;
        background: var(--paper-3);
        color: var(--ink-2);
      }
      li.on .n {
        background: var(--warn);
        color: #fff;
      }
      li.done .n {
        background: var(--good);
        color: #fff;
      }
      ol.stages p {
        margin-top: 2px;
      }
      .waiting {
        color: var(--warn);
        font-weight: 600;
      }

      ul.tick {
        list-style: none;
        margin: var(--gap-2) 0 var(--gap-2);
        padding: 0;
        display: grid;
        gap: 2px;
        font-size: var(--text-sm);
      }
      ul.tick li::before {
        display: inline-block;
        width: 1.4em;
        font-weight: 700;
      }
      ul.tick li.ok {
        color: var(--good);
      }
      ul.tick li.ok::before {
        content: '✓';
      }
      ul.tick li.no {
        color: var(--bad);
      }
      ul.tick li.no::before {
        content: '✕';
      }

      .debrief {
        display: grid;
        gap: var(--gap-3);
      }
      .debrief p {
        line-height: 1.6;
      }
      kbd {
        font-family: var(--font-mono);
        border: 1px solid var(--line-2);
        border-radius: var(--r-sm);
        padding: 0 4px;
      }
    `,
  ],
})
export class BlastRadiusComponent {
  readonly snapshot = input.required<LabSnapshot>();

  readonly stage = signal<Stage>('idle');
  readonly up = computed(() => this.snapshot().remote.reachable);

  private wentDownAt = 0;

  constructor() {
    this.load();

    effect(() => {
      const reachable = this.snapshot().remote.reachable;
      const stage = this.stage();

      // Stage 1 landed: the remote went away while we were watching.
      if (stage === 'armed' && !reachable) {
        this.wentDownAt = Date.now();
        this.save('observed');
      }

      /*
       * The remote is back and we were mid-experiment. Either the learner
       * reloaded during the outage — in which case this component is brand new,
       * restored 'observed' from sessionStorage, and the blackout is exactly what
       * they just sat through — or they never reloaded and simply restarted the
       * server. Both deserve the debrief; only the first has seen the blank page,
       * and the debrief describes it accurately either way.
       */
      if (stage === 'observed' && reachable) {
        this.save('debriefed');
      }
    });
  }

  arm(): void {
    this.save('armed');
  }

  reset(): void {
    this.wentDownAt = 0;
    this.save('idle');
  }

  /** Has the run already moved past this stage? */
  past(stage: Stage): boolean {
    const order: Stage[] = ['idle', 'armed', 'observed', 'debriefed'];
    return order.indexOf(this.stage()) > order.indexOf(stage);
  }

  private load(): void {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      this.stage.set(saved.stage ?? 'idle');
      this.wentDownAt = saved.wentDownAt ?? 0;
    } catch {
      /* Storage unavailable. The experiment still works, it just cannot survive
         the reload that makes stage 2 interesting. */
    }
  }

  private save(stage: Stage): void {
    this.stage.set(stage);
    try {
      if (stage === 'idle') sessionStorage.removeItem(KEY);
      else
        sessionStorage.setItem(
          KEY,
          JSON.stringify({ stage, wentDownAt: this.wentDownAt } satisfies Saved)
        );
    } catch {
      /* see load() */
    }
  }
}
