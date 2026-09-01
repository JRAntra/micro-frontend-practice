import { Component, computed, inject, signal } from '@angular/core';
import { SessionStore } from '@mf-lab/shared-auth';
import { CATEGORIES, Category, PRODUCTS, Product, money } from '../catalogue';
import { ProductCardComponent } from './product-card.component';

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating';

/**
 * The Products page. Owned, built and deployed by the "products" team.
 *
 * The shell never imports this at build time — it arrives over the network at
 * runtime, and the shell knows it only by the string `'./Routes'`.
 *
 * Two things on this page are worth watching while you do the lab:
 *
 *   - The **session banner**. This component injects the same `SessionStore` the
 *     shell's header uses. Until step 3 shares that library, this remote gets its
 *     own private copy: sign in on the shell and this banner keeps insisting you
 *     are anonymous, with nothing logged anywhere.
 *   - The **instance id** at the bottom. Compare it with the one the shell reports
 *     on the /lab dashboard. Two different ids means two stores.
 */
@Component({
  selector: 'app-products-entry',
  imports: [ProductCardComponent],
  template: `
    <div class="page stack-lg">
      <!-- ------------------------------------------------------ page header -->
      <header class="head">
        <div class="stack">
          <span class="eyebrow">Boundary &amp; Co. catalogue</span>
          <h1 data-testid="products-heading">Products</h1>
          <p class="muted lede">
            {{ PRODUCTS.length }} items across
            {{ CATEGORIES.length }} departments. Everything ships over the
            wire, whether or not the share scope agrees.
          </p>
        </div>

        <div class="session card card-pad" data-testid="remote-session">
          @if (session.isSignedIn()) {
          <span class="chip chip-good">Signed in</span>
          <p>
            Welcome back,
            <strong data-testid="remote-session-user">{{
              session.user()
            }}</strong
            >.
          </p>
          <p class="tiny muted">
            This remote can see your session, so the shell and this page are
            sharing one store.
          </p>
          } @else {
          <span class="chip">Anonymous</span>
          <p data-testid="remote-session-anonymous">
            You are browsing anonymously.
          </p>
          <p class="tiny muted">
            If you <em>are</em> signed in on the shell's header and this still
            says anonymous, that is step 3: the two applications each have their
            own copy of the session store.
          </p>
          }
        </div>
      </header>

      <!-- ----------------------------------------------------------- toolbar -->
      <section class="toolbar card">
        <div class="filters" role="group" aria-label="Filter by department">
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="active() === 'all'"
            (click)="active.set('all')"
          >
            All
            <span class="n">{{ PRODUCTS.length }}</span>
          </button>
          @for (c of CATEGORIES; track c) {
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="active() === c"
            (click)="active.set(c)"
          >
            {{ c }}
            <span class="n">{{ countIn(c) }}</span>
          </button>
          }
        </div>

        <label class="sort push">
          <span class="tiny muted">Sort</span>
          <select
            class="field"
            aria-label="Sort products"
            [value]="sort()"
            (change)="sort.set($any($event.target).value)"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="rating">Best rated</option>
          </select>
        </label>
      </section>

      <!-- -------------------------------------------------------------- grid -->
      <section>
        <div class="section-head">
          <h2>{{ active() === 'all' ? 'Everything' : active() }}</h2>
          <span class="chip">{{ visible().length }} shown</span>
          @if (session.cartCount() > 0) {
          <span class="chip chip-accent push">
            {{ session.cartCount() }} in basket ·
            {{ money(session.cartTotal()) }}
          </span>
          }
        </div>

        <ul class="grid" data-testid="product-list">
          @for (p of visible(); track p.sku) {
          <li data-testid="product-item">
            <app-product-card [product]="p" />
          </li>
          }
        </ul>
      </section>

      <!-- ------------------------------------------------------------ footer -->
      <footer class="note">
        <p class="tiny">
          Everything on this page — the catalogue, the filters, the cards — is
          built and deployed by <strong>apps/products</strong>. The header and
          footer around it belong to the shell.
        </p>
        <p class="tiny muted">
          SessionStore instance in this bundle:
          <code data-testid="remote-session-instance">{{
            session.instanceId
          }}</code
          >. Compare it with the shell's on the <strong>/lab</strong> dashboard
          — one id means one store.
        </p>
      </footer>
    </div>
  `,
  styles: [
    `
      /* The remote is also served standalone at :4272, where nothing else supplies
         page padding — so it brings its own. */
      :host {
        display: block;
        padding: var(--gap-6) 0 var(--gap-8);
      }
      .head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
        gap: var(--gap-5);
        align-items: start;
      }
      .lede {
        max-width: 52ch;
      }
      .session {
        display: grid;
        gap: var(--gap-2);
        justify-items: start;
        background: var(--paper-2);
      }

      .toolbar {
        display: flex;
        align-items: center;
        gap: var(--gap-4);
        flex-wrap: wrap;
        padding: var(--gap-3) var(--gap-4);
        border-radius: var(--r-pill);
      }
      .filters {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .filters .n {
        font-size: 0.6875rem;
        opacity: 0.6;
        font-variant-numeric: tabular-nums;
      }
      .sort {
        display: inline-flex;
        align-items: center;
        gap: var(--gap-2);
      }

      ul.grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: var(--gap-4);
      }

      footer.note {
        display: grid;
        gap: var(--gap-2);
      }

      @media (max-width: 860px) {
        .head {
          grid-template-columns: 1fr;
        }
        .toolbar {
          border-radius: var(--r-lg);
        }
      }
    `,
  ],
})
export class RemoteEntryComponent {
  readonly session = inject(SessionStore);

  readonly PRODUCTS = PRODUCTS;
  readonly CATEGORIES = CATEGORIES;
  readonly active = signal<Category | 'all'>('all');
  readonly sort = signal<Sort>('featured');

  money = money;

  readonly visible = computed<Product[]>(() => {
    const cat = this.active();
    const rows =
      cat === 'all'
        ? [...PRODUCTS]
        : PRODUCTS.filter((p) => p.category === cat);

    switch (this.sort()) {
      case 'price-asc':
        return rows.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return rows.sort((a, b) => b.price - a.price);
      case 'rating':
        return rows.sort((a, b) => b.rating - a.rating);
      default:
        // "Featured" = tagged items first, then best rated.
        return rows.sort(
          (a, b) => b.tags.length - a.tags.length || b.rating - a.rating
        );
    }
  });

  countIn(c: Category): number {
    return PRODUCTS.filter((p) => p.category === c).length;
  }
}
