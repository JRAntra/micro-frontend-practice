import { Component, computed, inject, signal } from '@angular/core';
import { SessionStore } from '@mf-lab/shared-auth';

/**
 * The basket indicator and its popover. **Shell-owned.**
 *
 * Worth knowing what this component demonstrates, because it is the visible half
 * of step 3. Nothing in here talks to the products remote. It reads
 * `SessionStore`, and the Add-to-basket buttons that fill that store live in the
 * remote's own bundle, built and deployed separately.
 *
 * So if the two applications genuinely share one store, adding an item over on
 * the Products page moves this number immediately. If they each bundled their own
 * copy, the button over there works perfectly, this number never moves, and no
 * error appears anywhere. That silence is the failure mode step 3 is about.
 */
@Component({
  selector: 'app-basket',
  template: `
    <div class="wrap">
      <button
        type="button"
        class="btn btn-quiet trigger"
        data-testid="basket-toggle"
        [attr.aria-expanded]="open()"
        aria-haspopup="dialog"
        (click)="open.set(!open())"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4.5 7.5h15l-1.3 10.2a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8L4.5 7.5Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
          <path
            d="M9 7.5V6a3 3 0 0 1 6 0v1.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
        <span class="label">Basket</span>
        @if (session.cartCount() > 0) {
        <span class="count" data-testid="basket-count">{{
          session.cartCount()
        }}</span>
        }
      </button>

      @if (open()) {
      <div
        class="sheet card"
        role="dialog"
        aria-label="Basket"
        data-testid="basket-sheet"
      >
        <header class="row">
          <strong>Your basket</strong>
          <button
            type="button"
            class="btn btn-quiet btn-sm push"
            (click)="open.set(false)"
          >
            Close
          </button>
        </header>

        <hr class="hr" />

        @if (session.isEmpty()) {
        <div class="empty">
          <p class="muted">Nothing in here yet.</p>
          <p class="tiny muted">
            The Add-to-basket buttons live in the products remote. Until step 2
            wires it up, there is nothing to click.
          </p>
        </div>
        } @else {
        <ul class="lines" data-testid="basket-lines">
          @for (line of session.cart(); track line.sku) {
          <li>
            <span class="ln">
              <span class="nm">{{ line.name }}</span>
              <span class="tiny muted mono">{{ line.sku }}</span>
            </span>
            <span class="qty">
              <button
                type="button"
                class="btn btn-quiet btn-sm"
                [attr.aria-label]="'One fewer ' + line.name"
                (click)="session.setQty(line.sku, line.qty - 1)"
              >
                −
              </button>
              <span class="n mono">{{ line.qty }}</span>
              <button
                type="button"
                class="btn btn-quiet btn-sm"
                [attr.aria-label]="'One more ' + line.name"
                (click)="session.setQty(line.sku, line.qty + 1)"
              >
                +
              </button>
            </span>
            <span class="money">{{ money(line.price * line.qty) }}</span>
          </li>
          }
        </ul>

        <hr class="hr" />

        <footer class="row foot">
          <span class="muted tiny">{{ session.cartCount() }} item(s)</span>
          <span class="push money total">{{ money(session.cartTotal()) }}</span>
        </footer>

        <div class="row actions">
          <button type="button" class="btn btn-sm" (click)="session.clear()">
            Empty
          </button>
          <button type="button" class="btn btn-primary btn-sm push" disabled>
            Checkout
          </button>
        </div>
        <p class="tiny muted">Checkout is out of scope for this lab.</p>
        }

        <hr class="hr" />
        <p class="tiny muted origin">
          This panel is <strong>shell</strong> code. The buttons that fill it
          are <strong>remote</strong> code. They only agree because
          <code>&#64;mf-lab/shared-auth</code> is shared.
        </p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .wrap {
        position: relative;
      }
      .trigger {
        gap: 6px;
      }
      .trigger svg {
        width: 18px;
        height: 18px;
      }
      .count {
        min-width: 19px;
        height: 19px;
        padding: 0 5px;
        display: grid;
        place-items: center;
        border-radius: var(--r-pill);
        background: var(--accent);
        color: #fff;
        font-size: 0.6875rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .sheet {
        position: absolute;
        right: 0;
        top: calc(100% + 10px);
        z-index: 40;
        width: 330px;
        max-width: calc(100vw - 32px);
        padding: var(--gap-4);
        display: grid;
        gap: var(--gap-3);
        box-shadow: var(--shadow-lg);
      }
      .empty {
        display: grid;
        gap: var(--gap-2);
        padding: var(--gap-3) 0;
      }
      ul.lines {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--gap-3);
        max-height: 280px;
        overflow-y: auto;
      }
      ul.lines li {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: var(--gap-3);
        font-size: var(--text-sm);
      }
      .ln {
        display: grid;
        line-height: 1.3;
        min-width: 0;
      }
      .nm {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .qty {
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }
      .qty .n {
        min-width: 1.4em;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .foot .total {
        font-size: var(--text-lg);
      }
      .actions {
        gap: var(--gap-2);
      }
      .origin {
        line-height: 1.5;
      }
      @media (max-width: 560px) {
        .trigger .label {
          display: none;
        }
      }
    `,
  ],
})
export class BasketComponent {
  readonly session = inject(SessionStore);
  readonly open = signal(false);

  /** Total in the header's own currency formatting — the shell does not import the remote's. */
  readonly count = computed(() => this.session.cartCount());

  money(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
