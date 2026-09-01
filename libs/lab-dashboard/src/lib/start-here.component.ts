import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LabProbeService } from './lab-probe.service';
import { LAB_STEPS, TOTAL_MINUTES } from './steps.data';

/**
 * The on-ramp, mounted by the shell at /start.
 *
 * README.md, guide/00-overview.md, TOUR.md and SETUP.md all say some of this too —
 * this page exists so a candidate never has to leave the running app to find out
 * what to do next, and so the first thing they read is framed as work rather than
 * as documentation. It reads `LAB_STEPS` rather than restating the six steps, so
 * the board here can never drift out of sync with what /lab and the tests use.
 */
@Component({
  selector: 'lab-start-here',
  imports: [RouterLink],
  template: `
    <div class="page start stack-lg">
      <!-- ------------------------------------------------------------ brief -->
      <section class="brief card card-pad">
        <div class="brief-copy">
          <span class="chip chip-accent">Week one · Boundary &amp; Co.</span>
          <h1>The products team just moved out.</h1>
          <p class="lede">
            They took the catalogue with them — their own repository, their own
            build, their own deploy schedule. In principle that is what
            everybody wanted. In practice our storefront now has a
            <strong>Products</strong> link that goes nowhere, a home page with a
            hole in it, and a sign-in that the catalogue cannot see.
          </p>
          <p class="lede">
            Your week: get the two applications talking again — at runtime, over
            the network, without merging them back together. Everything you
            change is <strong>build configuration</strong>. You will not write a
            component.
          </p>
          <div class="row row-wrap">
            <a routerLink="/lab" class="btn btn-primary">Open the board →</a>
            <a routerLink="/" class="btn">See what is broken</a>
            <span class="chip">{{ totalMinutes }} min · 100 points</span>
          </div>
        </div>

        <aside class="scoreboard">
          <span class="eyebrow">Right now</span>
          <strong class="big">{{ snap().doneCount }} / 6</strong>
          <span class="tiny muted">tickets closed</span>
          <div class="bar" aria-hidden="true">
            <span
              class="fill"
              [style.width.%]="(snap().points / snap().maxPoints) * 100"
            ></span>
          </div>
          <span class="tiny muted">{{ snap().points }} of 100 points</span>
        </aside>
      </section>

      <!-- ----------------------------------------------------- instructions -->
      <section>
        <div class="section-head">
          <span class="eyebrow">Before you start</span>
          <h2>Three things, once</h2>
        </div>

        <ol class="rail">
          <li>
            <span class="n">1</span>
            <div class="body">
              <strong>Get both servers up, and leave them up.</strong>
              <pre><code>npm run start:watch          # the shell (host),    :4271
npm run start:remote:watch   # the products remote, :4272</code></pre>
              <p class="tiny muted">
                Use the <code>:watch</code> variants. A
                <code>module-federation.config.ts</code> is read once, when
                webpack starts — save one under plain <code>npm start</code> and
                nothing at all happens, which is the single most common way to
                lose twenty minutes here.
              </p>
            </div>
          </li>

          <li>
            <span class="n">2</span>
            <div class="body">
              <strong>Get your task list.</strong>
              <pre><code>npm test</code></pre>
              <p class="tiny muted">
                Eleven of eighteen checks fail. <strong>That is correct</strong>
                — they are the task list, not a broken repo. Each failure names
                the file, the configuration key, the concept behind it, and the
                page to read. What you should <em>never</em> see is a build
                error; if compiling stops working, that is something you
                changed.
              </p>
            </div>
          </li>

          <li>
            <span class="n">3</span>
            <div class="body">
              <strong>Keep the board open in a second tab.</strong>
              <p class="tiny muted">
                <a routerLink="/lab">/lab</a> is a live picture of what your two
                applications are actually doing, re-checked every two seconds —
                and it shows what <code>npm test</code> found next to it, because
                two of the six tickets cannot be observed from a browser at all.
              </p>
              <p class="tiny muted">
                Read <code>guide/00-overview.md</code> for the concepts and
                <code>TOUR.md</code> when a hint points into it.
                <code>guide/CHEATSHEET.md</code> is the whole lab on one screen
                if you would rather just start.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <!-- ------------------------------------------------------------ board -->
      <section>
        <div class="section-head">
          <span class="eyebrow">The board</span>
          <h2>Six tickets</h2>
          <span class="chip push">required 1–3 · bonus 4–6</span>
        </div>

        <ol class="board">
          @for (s of steps; track s.id) {
          <li class="card" [class.done]="isDone(s.id)">
            <div class="row head">
              <span class="tickbox" [class.on]="isDone(s.id)">
                {{ isDone(s.id) ? '✓' : s.n }}
              </span>
              <strong>{{ s.title }}</strong>
              <span
                class="chip tiny"
                [class.chip-accent]="s.required"
                >{{ s.required ? 'required' : 'bonus' }}</span
              >
              <span class="tiny muted push">≈{{ s.minutes }} min</span>
              <span class="pts">{{ s.points }}</span>
            </div>

            <p class="ticket">“{{ s.ticket }}”</p>

            <div class="row row-wrap files">
              @for (f of s.files; track f) {
              <code class="tiny">{{ f }}</code>
              }
              <code class="tiny muted push">{{ s.doc }}</code>
            </div>
          </li>
          }
        </ol>

        <p class="note">
          Tickets <strong>1–3</strong> are what "finished" means — 60 of the 100
          points. <strong>4–6</strong> are independent of each other and of
          order. Every one of them has the concept, the exact task, three hints
          of increasing specificity, and the full solution in a collapsed block.
          <strong>Reading a solution costs you nothing.</strong> This is a lab,
          not an exam.
        </p>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* ---------------------------------------------------------- brief ---- */
      .brief {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 220px;
        gap: var(--gap-6);
        align-items: start;
        border-radius: var(--r-xl);
        padding: var(--gap-6);
      }
      .brief-copy {
        display: grid;
        gap: var(--gap-4);
        justify-items: start;
      }
      .brief h1 {
        font-size: var(--text-2xl);
      }
      .brief .lede {
        color: var(--ink-2);
        max-width: 62ch;
        line-height: 1.65;
      }

      .scoreboard {
        display: grid;
        gap: 2px;
        justify-items: start;
        padding: var(--gap-4);
        border-radius: var(--r);
        background: var(--paper-2);
        border: 1px solid var(--line);
      }
      .big {
        font-size: var(--text-2xl);
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }
      .bar {
        width: 100%;
        height: 6px;
        margin: var(--gap-2) 0 4px;
        border-radius: var(--r-pill);
        background: var(--paper-3);
        overflow: hidden;
      }
      .bar .fill {
        display: block;
        height: 100%;
        background: var(--good);
        transition: width 0.6s var(--ease);
      }

      /* ----------------------------------------------------------- rail ---- */
      ol.rail {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--gap-4);
      }
      ol.rail > li {
        display: grid;
        grid-template-columns: 32px minmax(0, 1fr);
        gap: var(--gap-4);
        align-items: start;
      }
      .n {
        width: 32px;
        height: 32px;
        border-radius: var(--r-pill);
        display: grid;
        place-items: center;
        font-weight: 700;
        font-size: var(--text-sm);
        background: var(--accent-soft);
        color: var(--accent-ink);
        border: 1px solid var(--accent-line);
      }
      .rail .body {
        display: grid;
        gap: var(--gap-2);
        padding-top: 4px;
      }
      pre {
        margin: 0;
        overflow-x: auto;
        padding: var(--gap-3) var(--gap-4);
        border-radius: var(--r);
        background: var(--paper-3);
        border: 1px solid var(--line);
      }
      pre code {
        font-size: var(--text-xs);
        line-height: 1.7;
        white-space: pre;
      }

      /* ---------------------------------------------------------- board ---- */
      ol.board {
        list-style: none;
        margin: 0 0 var(--gap-4);
        padding: 0;
        display: grid;
        gap: var(--gap-2);
      }
      ol.board li {
        display: grid;
        gap: var(--gap-2);
        padding: var(--gap-4) var(--gap-5);
        border-left: 3px solid var(--line-2);
      }
      ol.board li.done {
        border-left-color: var(--good);
        opacity: 0.72;
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
      .pts {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        color: var(--ink-4);
        font-size: var(--text-sm);
      }
      .ticket {
        font-size: var(--text-sm);
        font-style: italic;
        color: var(--ink-2);
        padding-left: 36px;
      }
      .files {
        padding-left: 36px;
        gap: var(--gap-2);
      }
      .files code {
        background: var(--paper-2);
        border: 1px solid var(--line);
        border-radius: var(--r-sm);
        padding: 1px 6px;
      }
      .files code.muted {
        background: transparent;
        border-color: transparent;
      }

      @media (max-width: 860px) {
        .brief {
          grid-template-columns: 1fr;
        }
        .scoreboard {
          width: 100%;
        }
      }
    `,
  ],
})
export class StartHereComponent {
  private readonly probe = inject(LabProbeService);

  readonly steps = LAB_STEPS;
  readonly totalMinutes = TOTAL_MINUTES;
  readonly snap = computed(() => this.probe.snapshot());

  isDone(id: string): boolean {
    return this.snap().steps.find((s) => s.step.id === id)?.verdict === 'done';
  }
}
