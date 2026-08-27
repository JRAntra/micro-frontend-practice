import { Component } from '@angular/core';

/**
 * Shown instead of a federated area when its remote cannot be loaded.
 *
 * This component is already written for you. The interesting question is not how to
 * build it but where the wiring goes — and, as TOUR.md → "Blast radius" points
 * out, what it does NOT protect against.
 */
@Component({
  selector: 'app-remote-unavailable',
  template: `
    <section data-testid="remote-fallback">
      <h1>Products is temporarily unavailable</h1>
      <p>
        We couldn't reach the products service. The rest of the site still works
        — try again in a moment.
      </p>
    </section>
  `,
  styles: [
    `
      section {
        border: 1px solid #e0c200;
        background: #fffbe6;
        border-radius: 6px;
        padding: 16px;
        max-width: 520px;
      }
      h1 {
        font-size: 16px;
        margin: 0 0 6px;
      }
      p {
        margin: 0;
        font-size: 14px;
        color: #555;
      }
    `,
  ],
})
export class RemoteUnavailableComponent {}
