import { Component, input } from '@angular/core';
import { Change } from './lab-probe.service';

/**
 * The last few things that changed, newest first.
 *
 * The probe has always re-checked every two seconds and thrown the previous result
 * away, which meant the single most informative thing on the page — the moment
 * something changed — was the one thing it could not show you. That matters here
 * more than in most dashboards, because editing a federation config costs a
 * dev-server restart: by the time the page catches up you have been reading a guide
 * for forty seconds and cannot remember what the table said before.
 *
 * So: cause and effect, made visible. `session store instances: 2 → 1` is the whole
 * of step 3 in one line.
 */
@Component({
  selector: 'lab-change-ticker',
  template: `
    <div class="ticker card card-pad" aria-live="polite">
      <span class="eyebrow">What just changed</span>

      @if (changes().length === 0) {
      <p class="tiny muted idle">
        Nothing yet. Edit a config, restart that dev server, and watch this.
      </p>
      } @else {
      <ol>
        @for (c of changes(); track c.at + c.text) {
        <li [class]="c.tone">
          <span class="dot" aria-hidden="true"></span>
          <span class="text">{{ c.text }}</span>
          <time class="tiny muted">{{ clock(c.at) }}</time>
        </li>
        }
      </ol>
      }
    </div>
  `,
  styles: [
    `
      .ticker {
        display: grid;
        gap: var(--gap-2);
      }
      .idle {
        margin: 0;
      }
      ol {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 2px;
      }
      li {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) auto;
        align-items: baseline;
        gap: var(--gap-3);
        padding: 5px 0;
        font-size: var(--text-sm);
        border-bottom: 1px solid var(--line);
        /* New rows arrive at the top; sliding them in is the difference between
           "the number is different now" and "something just happened". */
        animation: arrive 0.36s var(--ease) both;
      }
      li:last-child {
        border-bottom: 0;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: var(--r-pill);
        background: var(--ink-4);
        transform: translateY(-1px);
      }
      li.good .dot {
        background: var(--good);
      }
      li.bad .dot {
        background: var(--bad);
      }
      li.good .text {
        color: var(--good);
        font-weight: 600;
      }
      li.bad .text {
        color: var(--bad);
        font-weight: 600;
      }
      time {
        font-variant-numeric: tabular-nums;
      }

      @keyframes arrive {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
      }
    `,
  ],
})
export class ChangeTickerComponent {
  readonly changes = input.required<Change[]>();

  clock(at: number): string {
    return new Date(at).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
