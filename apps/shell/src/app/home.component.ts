import { Component, OnInit, Type, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

/**
 * The shell's own home page. Everything here is compiled into the shell —
 * except the featured card, which is fetched from the products remote at runtime
 * and rendered into a layout the shell controls.
 */
@Component({
  selector: 'app-home',
  imports: [NgComponentOutlet],
  template: `
    <h1 data-testid="home-heading">Acme Storefront</h1>
    <p>
      This page lives in the <strong>shell</strong>. The Products page does not
      — it is served by a separate application and loaded into this one at
      runtime.
    </p>

    <!--
      STEP s4: the shell asks the products remote for a single COMPONENT here.
      If the remote does not publish it, this block silently renders nothing and
      the rest of the page is unaffected — which is the behaviour you want from an
      optional embed, and also why a missing expose is easy to miss.
    -->
    @if (featured()) {
    <ng-container *ngComponentOutlet="featured()!"></ng-container>
    }

    <p>
      Open <code>TOUR.md</code> for a guided walk through the configuration
      files.
    </p>
  `,
})
export class HomeComponent implements OnInit {
  readonly featured = signal<Type<unknown> | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const mod = await import('products/ProductCard');
      this.featured.set(mod.ProductCardComponent);
    } catch {
      // The remote didn't publish it (or is unreachable). An optional embed must
      // never take the host's page down with it.
      this.featured.set(null);
    }
  }
}
