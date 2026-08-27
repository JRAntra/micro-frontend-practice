import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LabProbeService } from './lab-probe.service';

/**
 * The always-visible progress chip in the shell's header.
 *
 * Small on purpose: it exists so a candidate working in the app notices a step
 * landing without having to be on the dashboard. Clicking it goes to /lab.
 */
@Component({
  selector: 'lab-badge',
  imports: [RouterLink],
  template: `
    <a routerLink="/lab" [class]="'badge ' + tone()" data-testid="lab-badge">
      <span class="count"
        >{{ snap().doneCount }}/{{ snap().steps.length }}</span
      >
      <span class="pts">{{ snap().points }} pts</span>
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
        transition: border-color 0.14s var(--ease);
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
    `,
  ],
})
export class LabBadgeComponent implements OnInit, OnDestroy {
  private readonly probe = inject(LabProbeService);
  readonly snap = computed(() => this.probe.snapshot());

  readonly tone = computed(() => {
    const s = this.snap();
    if (s.doneCount === s.steps.length) return 'all';
    return s.doneCount > 0 ? 'some' : 'none';
  });

  ngOnInit(): void {
    this.probe.start();
  }

  ngOnDestroy(): void {
    this.probe.release();
  }
}
