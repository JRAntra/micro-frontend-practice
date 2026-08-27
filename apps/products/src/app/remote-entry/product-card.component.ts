import { Component, computed, inject, input } from '@angular/core';
import { SessionStore } from '@mf-lab/shared-auth';
import { Product, featured, money, stockLabel } from '../catalogue';
import { ProductArtComponent } from './product-art.component';

/**
 * A single component the products team publishes for other teams to embed.
 *
 * Note what this is NOT: a route. Steps 1 and 2 federated a whole routed area — the
 * shell handed its outlet over and the remote owned the page. This is the
 * finer-grained version: one component, dropped into a page the SHELL owns and
 * lays out.
 *
 * Two design choices here exist *because* it crosses a federation boundary:
 *
 *   1. `product` is an optional input that defaults to the catalogue's featured
 *      item. The shell renders this through `ngComponentOutlet` and cannot pass
 *      inputs it has no types for — and it must not import the remote's catalogue,
 *      since that would be a build-time dependency on exactly the code that is
 *      supposed to arrive at runtime. So the component has to be useful with no
 *      inputs at all.
 *   2. It reads `SessionStore` and writes to the shared basket. That is what makes
 *      the embed *live* rather than decorative: press the button here and the
 *      shell's own header updates, because both applications are talking to one
 *      shared store. If they are not, this button still works and the header never
 *      moves. See step 3.
 *
 * Nothing else here is special. What makes it federatable is one line of
 * configuration in module-federation.config.ts.
 */
@Component({
  selector: 'app-product-card',
  imports: [ProductArtComponent],
  template: `
    <article class="pcard card" data-testid="product-card">
      <app-product-art
        [sku]="p().sku"
        [category]="p().category"
        [name]="p().name"
      />

      <div class="body">
        <div class="row row-wrap tags">
          @for (t of p().tags; track t) {
          <span class="chip chip-accent">{{ t }}</span>
          }
          <span class="chip" [class]="'chip chip-' + stock().tone">{{
            stock().text
          }}</span>
        </div>

        <h3>{{ p().name }}</h3>
        <p class="tiny muted blurb">{{ p().blurb }}</p>

        <div class="row rating" [attr.aria-label]="p().rating + ' out of 5'">
          <span class="stars" aria-hidden="true">
            @for (i of [0, 1, 2, 3, 4]; track i) {
            <span [class.lit]="i < Math.round(p().rating)">★</span>
            }
          </span>
          <span class="tiny muted"
            >{{ p().rating }} · {{ p().reviews }} reviews</span
          >
        </div>

        <div class="row buy">
          <span class="prices">
            <span class="money price" data-testid="product-card-price">{{
              money(p().price)
            }}</span>
            @if (p().was) {
            <span class="tiny muted was">{{ money(p().was!) }}</span>
            }
          </span>

          <button
            type="button"
            class="btn btn-primary btn-sm push"
            data-testid="product-card-add"
            [disabled]="p().stock === 0"
            (click)="add()"
          >
            @if (inBasket() > 0) { In basket · {{ inBasket() }}
            } @else { Add to basket }
          </button>
        </div>

        <p class="tiny origin">
          <span class="dot" aria-hidden="true"></span>
          Built by <strong>apps/products</strong>
        </p>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .pcard {
        overflow: hidden;
        display: grid;
        height: 100%;
        transition: transform 0.16s var(--ease), box-shadow 0.16s var(--ease);
      }
      .pcard:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
      }
      app-product-art {
        border-bottom: 1px solid var(--line);
      }
      .body {
        padding: var(--gap-4);
        display: grid;
        gap: var(--gap-2);
        align-content: start;
      }
      .tags {
        gap: 6px;
        min-height: 22px;
      }
      h3 {
        font-size: var(--text-base);
        margin-top: 2px;
      }
      .blurb {
        line-height: 1.5;
        min-height: 2.9em;
      }
      .stars {
        letter-spacing: 1px;
        color: var(--line-2);
        font-size: var(--text-sm);
      }
      .stars .lit {
        color: var(--warn);
      }
      .buy {
        margin-top: var(--gap-2);
      }
      .prices {
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .price {
        font-size: var(--text-lg);
      }
      .was {
        text-decoration: line-through;
      }
      /* A quiet provenance line — deliberately "built by", not "served by". Who
         authored this component is always true; whether it travelled over the
         network on this page load is a separate claim, and the shell's home page
         makes that one because only the host can observe it. */
      .origin {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--ink-4);
        margin-top: var(--gap-1);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
      }
    `,
  ],
})
export class ProductCardComponent {
  /** Optional: the shell embeds this with no inputs and gets the featured item. */
  readonly product = input<Product | null>(null);

  private readonly session = inject(SessionStore);

  readonly Math = Math;
  readonly p = computed(() => this.product() ?? featured());
  readonly stock = computed(() => stockLabel(this.p().stock));
  readonly inBasket = computed(() => {
    // Read the signal so this recomputes when the shared basket changes.
    this.session.cart();
    return this.session.qtyOf(this.p().sku);
  });

  money = money;

  add(): void {
    const p = this.p();
    this.session.add({ sku: p.sku, name: p.name, price: p.price });
  }
}
