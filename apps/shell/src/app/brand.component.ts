import { Component } from '@angular/core';

/** The Acme wordmark. Shell-owned chrome — a remote never draws this. */
@Component({
  selector: 'app-brand',
  template: `
    <span class="brand" data-testid="brand">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="10" class="tile" />
        <path
          d="M9 22 L16 10 L23 22"
          fill="none"
          stroke-width="2.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mark"
        />
        <path
          d="M12.5 18 L19.5 18"
          fill="none"
          stroke-width="2.8"
          stroke-linecap="round"
          class="mark"
        />
      </svg>
      <span class="words">
        <strong>Acme</strong>
        <span class="sub">Storefront</span>
      </span>
    </span>
  `,
  styles: [
    `
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      svg {
        width: 32px;
        height: 32px;
        flex: 0 0 auto;
      }
      .tile {
        fill: var(--accent);
      }
      .mark {
        stroke: #fff;
      }
      .words {
        display: grid;
        line-height: 1.05;
      }
      strong {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .sub {
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-3);
      }
    `,
  ],
})
export class BrandComponent {}
