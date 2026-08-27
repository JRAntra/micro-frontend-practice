import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { SessionStore } from '@mf-lab/shared-auth';
import { ProductCardComponent } from './product-card.component';

interface Product {
  sku: string;
  name: string;
  price: number;
}

/**
 * This component is owned, built and deployed by the "products" team. The shell
 * never imports it at build time — it arrives over the network at runtime.
 */
@Component({
  selector: 'app-products-entry',
  imports: [CurrencyPipe, ProductCardComponent],
  template: `
    <h1 data-testid="products-heading">Products</h1>

    <p data-testid="remote-session">
      @if (session.isSignedIn()) { Welcome back,
      <strong data-testid="remote-session-user">{{ session.user() }}</strong>
      } @else {
      <span data-testid="remote-session-anonymous"
        >You are browsing anonymously.</span
      >
      }
    </p>

    <ul data-testid="product-list">
      @for (p of products; track p.sku) {
      <li data-testid="product-item">
        <span class="name">{{ p.name }}</span>
        <span class="price">{{ p.price | currency }}</span>
      </li>
      }
    </ul>

    <!-- The products team uses its own card here too; the shell embeds the very
         same component on its home page via Module Federation (step s4). -->
    <app-product-card></app-product-card>

    <p class="debug">
      SessionStore instance:
      <code data-testid="remote-session-instance">{{
        session.instanceId
      }}</code>
    </p>
  `,
  styles: [
    `
      ul {
        list-style: none;
        padding: 0;
        max-width: 420px;
      }
      li {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      .debug {
        margin-top: 24px;
        font-size: 12px;
        color: #666;
      }
    `,
  ],
})
export class RemoteEntryComponent {
  readonly session = inject(SessionStore);

  readonly products: Product[] = [
    { sku: 'AC-1', name: 'Anvil, 50kg', price: 129 },
    { sku: 'AC-2', name: 'Rocket Skates', price: 249 },
    { sku: 'AC-3', name: 'Giant Magnet', price: 89 },
    { sku: 'AC-4', name: 'Portable Hole', price: 399 },
  ];
}
