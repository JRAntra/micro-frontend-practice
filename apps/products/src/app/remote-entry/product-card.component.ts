import { Component } from '@angular/core';

/**
 * A single component the products team publishes for other teams to embed.
 *
 * Note what this is NOT: a route. s1/s2 federated a whole routed area — the shell
 * handed its outlet over and the remote owned the page. This is the finer-grained
 * version: one component, dropped into a page the SHELL owns and lays out.
 *
 * Nothing here is special. What makes it federatable is one line of configuration
 * in module-federation.config.ts.
 */
@Component({
  selector: 'app-product-card',
  template: `
    <aside data-testid="product-card">
      <h3>Featured: {{ name }}</h3>
      <p>{{ blurb }}</p>
      <strong data-testid="product-card-price">{{ price }}</strong>
    </aside>
  `,
  styles: [
    `
      aside {
        border: 1px solid #d8d8d8;
        border-radius: 6px;
        padding: 12px 16px;
        max-width: 320px;
        font-family: system-ui, sans-serif;
      }
      h3 {
        margin: 0 0 4px;
        font-size: 15px;
      }
      p {
        margin: 0 0 8px;
        color: #555;
        font-size: 13px;
      }
    `,
  ],
})
export class ProductCardComponent {
  readonly name = 'Rocket Skates';
  readonly blurb =
    'Ideal for pursuing fast-moving birds across desert terrain.';
  readonly price = '$249';
}
