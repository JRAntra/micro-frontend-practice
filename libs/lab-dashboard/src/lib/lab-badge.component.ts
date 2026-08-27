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
        border: 1px solid #d8d8d8;
        border-radius: 6px;
        padding: 3px 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        color: #1c1c1c;
        background: #fff;
      }
      .badge:hover {
        border-color: #9a9a9a;
      }
      .badge.some {
        border-color: #1a7f45;
        background: #eef8f1;
        color: #1a7f45;
      }
      .badge.all {
        border-color: #1a7f45;
        background: #1a7f45;
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
