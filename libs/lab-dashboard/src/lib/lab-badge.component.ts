import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LabProbeService } from './lab-probe.service';

/**
 * The always-visible progress chip in the shell's header.
 *
 * Small on purpose: it exists so a candidate working in the app notices a step
 * landing without having to be on the dashboard. Clicking it goes to /lab.
 *
 * It also does the celebrating, for the same reason — the header is on every page,
 * so wherever you happen to be when a step lands, this is what tells you. The
 * points count up rather than jumping, because a number that ticks 55 → 75 is read
 * as an event and a number that is simply different is read as a render.
 */
@Component({
  selector: 'lab-badge',
  imports: [RouterLink],
  template: `
    <a
      routerLink="/lab"
      [class]="'badge ' + tone()"
      [class.celebrate]="celebrating()"
      data-testid="lab-badge"
      [attr.aria-label]="
        snap().doneCount + ' of 6 steps, ' + snap().points + ' points'
      "
    >
      <span class="count"
        >{{ snap().doneCount }}/{{ snap().steps.length }}</span
      >
      <span class="pts">{{ shown() }} pts</span>
    </a>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        gap: 6px;
        align-items: baseline;
        text-decoration: none;
        border: 1px solid var(--line-2);
        border-radius: var(--r-pill);
        padding: 3px 10px;
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--ink-2);
        background: var(--paper);
        font-variant-numeric: tabular-nums;
        transition: border-color 0.14s var(--ease), background 0.3s var(--ease),
          color 0.3s var(--ease);
      }
      .badge:hover {
        border-color: var(--ink-4);
      }
      .badge.some {
        border-color: var(--good-line);
        background: var(--good-soft);
        color: var(--good);
      }
      .badge.all {
        border-color: transparent;
        background: var(--good);
        color: #fff;
      }
      .pts {
        opacity: 0.75;
      }
      .badge.celebrate {
        animation: pop 0.6s var(--ease);
      }
      @keyframes pop {
        0% {
          transform: scale(1);
        }
        35% {
          transform: scale(1.18);
          box-shadow: 0 0 0 6px var(--good-soft);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 transparent;
        }
      }
    `,
  ],
})
export class LabBadgeComponent implements OnInit, OnDestroy {
  private readonly probe = inject(LabProbeService);
  readonly snap = computed(() => this.probe.snapshot());

  /** The number on screen, which chases the real one. */
  readonly shown = signal(0);
  readonly celebrating = signal(false);

  private countTimer: ReturnType<typeof setInterval> | null = null;
  private celebrateTimer: ReturnType<typeof setTimeout> | null = null;

  readonly tone = computed(() => {
    const s = this.snap();
    if (s.doneCount === s.steps.length) return 'all';
    return s.doneCount > 0 ? 'some' : 'none';
  });

  constructor() {
    effect(() => {
      const target = this.snap().points;
      const from = this.shown();
      if (target === from) return;

      // First paint after a reload restores a score we already had; that is not an
      // achievement, so don't animate it.
      if (from === 0 && this.snap().tick <= 1) {
        this.shown.set(target);
        return;
      }

      if (target > from) this.celebrate();
      this.countTo(target);
    });
  }

  private celebrate(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.celebrating.set(true);
    if (this.celebrateTimer) clearTimeout(this.celebrateTimer);
    this.celebrateTimer = setTimeout(() => this.celebrating.set(false), 620);
  }

  private countTo(target: number): void {
    if (this.countTimer) clearInterval(this.countTimer);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.shown.set(target);
      return;
    }
    this.countTimer = setInterval(() => {
      const current = this.shown();
      const step = Math.max(1, Math.round(Math.abs(target - current) / 6));
      const next = current < target ? current + step : current - step;
      if ((current < target && next >= target) || (current > target && next <= target)) {
        this.shown.set(target);
        if (this.countTimer) clearInterval(this.countTimer);
        this.countTimer = null;
      } else {
        this.shown.set(next);
      }
    }, 40);
  }

  ngOnInit(): void {
    this.probe.start();
  }

  ngOnDestroy(): void {
    this.probe.release();
    if (this.countTimer) clearInterval(this.countTimer);
    if (this.celebrateTimer) clearTimeout(this.celebrateTimer);
  }
}
