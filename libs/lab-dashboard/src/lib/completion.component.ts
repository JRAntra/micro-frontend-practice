import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { AchievementBadgesComponent } from './achievement-badges.component';
import { LabSnapshot } from './lab-probe.service';

/**
 * What you get for finishing.
 *
 * Before this, completing the lab produced a badge reading `6/6` and nothing else —
 * which is a strange reward for the afternoon it takes. The useful thing to hand
 * somebody at the end is not applause, it is language: a short, concrete account of
 * what they built and what they measured, in the words they would use at a
 * standup or in an interview. So the confetti is the garnish and the summary is
 * the point.
 *
 * Confetti is drawn on a canvas here rather than pulled from a library because the
 * repo ships no binary assets and no CDN dependencies, and because 40 lines of
 * requestAnimationFrame is cheaper than a package. It is skipped outright under
 * `prefers-reduced-motion`.
 */
@Component({
  selector: 'lab-completion',
  imports: [AchievementBadgesComponent],
  template: `
    <div class="card card-pad done">
      <canvas #canvas aria-hidden="true"></canvas>

      <div class="body">
        <span class="chip chip-good">100 / 100 · all six shipped</span>
        <h2>The storefront is federated.</h2>
        <p class="lede">
          Two applications, built separately, deployed separately, cooperating
          in one browser tab over a contract you wrote and can defend. That is
          the whole architecture — you have now paid its setup cost by hand.
        </p>

        <lab-achievement-badges [earned]="earnedIds()" />

        <div class="facts">
          @for (f of facts(); track f.label) {
          <div class="fact">
            <strong>{{ f.value }}</strong>
            <span class="tiny muted">{{ f.label }}</span>
          </div>
          }
        </div>

        <div class="say">
          <span class="eyebrow">If someone asks what you did</span>
          <p>
            “I wired a webpack Module Federation host to a remote in an Nx
            monorepo — a federated route and a federated component — and shared
            the session store as a singleton so both halves of the page agree
            about who is signed in. I set an explicit
            <code>strictVersion</code> policy on Angular so a version
            disagreement fails at load time instead of silently loading two
            copies. And I know the failure mode: with statically declared
            remotes, a dead remote does not degrade the host, it stops it
            booting.”
          </p>
          <button type="button" class="btn btn-sm" (click)="copy()">
            {{ copied ? 'Copied' : 'Copy that' }}
          </button>
        </div>

        <p class="tiny muted">
          The part nobody can check for you is
          <code>DESIGN.md</code> question 6 — the one where you argue against
          all of this. If you cannot make that case, you do not yet own the
          decision to use it.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .done {
        position: relative;
        overflow: hidden;
        border-color: var(--good-line);
        background: linear-gradient(
          160deg,
          var(--good-soft) 0%,
          var(--paper) 55%
        );
      }
      canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .body {
        position: relative;
        display: grid;
        gap: var(--gap-4);
        justify-items: start;
      }
      h2 {
        font-size: var(--text-2xl);
      }
      .lede {
        color: var(--ink-2);
        max-width: 60ch;
      }

      .facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: var(--gap-3);
        width: 100%;
      }
      .fact {
        display: grid;
        gap: 2px;
        padding: var(--gap-3) var(--gap-4);
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--r);
      }
      .fact strong {
        font-size: var(--text-xl);
        font-variant-numeric: tabular-nums;
      }

      .say {
        display: grid;
        gap: var(--gap-2);
        justify-items: start;
        padding: var(--gap-4);
        border-radius: var(--r);
        background: var(--paper);
        border: 1px solid var(--line);
        width: 100%;
      }
      .say p {
        font-size: var(--text-sm);
        line-height: 1.65;
        color: var(--ink-2);
        max-width: 66ch;
      }
    `,
  ],
})
export class CompletionComponent implements AfterViewInit {
  readonly snapshot = input.required<LabSnapshot>();
  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  copied = false;

  readonly earnedIds = computed(() =>
    this.snapshot()
      .steps.filter((s) => s.verdict === 'done')
      .map((s) => s.step.id)
  );

  readonly facts = computed(() => {
    const s = this.snapshot();
    return [
      { value: '2', label: 'independently deployed apps' },
      { value: '2', label: 'modules published by the remote' },
      { value: '1', label: 'shared session store' },
      {
        value: String(s.shareScope?.length ?? 0),
        label: 'packages in the share scope',
      },
    ];
  });

  ngAfterViewInit(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.burst();
  }

  copy(): void {
    const text = (
      document.querySelector('.say p')?.textContent ?? ''
    ).trim();
    void navigator.clipboard?.writeText(text).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  /** One short burst of paper, in the storefront's own palette. */
  private burst(): void {
    const el = this.canvas().nativeElement;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = (el.width = el.clientWidth * dpr);
    const h = (el.height = el.clientHeight * dpr);

    const colours = ['#b5502a', '#2f7d51', '#92670c', '#e8825c', '#7d736b'];
    const bits = Array.from({ length: 90 }, () => ({
      x: w * (0.15 + Math.random() * 0.7),
      y: -20 * dpr,
      vx: (Math.random() - 0.5) * 2.6 * dpr,
      vy: (1.4 + Math.random() * 2.4) * dpr,
      spin: (Math.random() - 0.5) * 0.22,
      a: Math.random() * Math.PI,
      size: (3 + Math.random() * 4) * dpr,
      colour: colours[(Math.random() * colours.length) | 0],
      delay: Math.random() * 40,
    }));

    let frame = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      let alive = false;

      for (const b of bits) {
        if (frame < b.delay) {
          alive = true;
          continue;
        }
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.035 * dpr;
        b.a += b.spin;
        if (b.y > h + 20 * dpr) continue;
        alive = true;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        ctx.globalAlpha = Math.max(0, 1 - frame / 220);
        ctx.fillStyle = b.colour;
        ctx.fillRect(-b.size / 2, -b.size, b.size, b.size * 2);
        ctx.restore();
      }

      if (alive && frame < 240) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };

    requestAnimationFrame(tick);
  }
}
