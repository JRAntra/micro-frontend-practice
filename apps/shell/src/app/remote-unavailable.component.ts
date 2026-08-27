import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shown instead of a federated area when its remote cannot be loaded.
 *
 * This component is already written for you. The interesting question is not how to
 * build it but where the wiring goes — and, as TOUR.md → "Blast radius" points
 * out, what it does NOT protect against.
 *
 * Note the shape of it: it apologises for one section of the site, not the whole
 * site. That is the correct blast radius for a remote going down, and getting the
 * host to actually behave that way is a design decision rather than a default.
 */
@Component({
  selector: 'app-remote-unavailable',
  imports: [RouterLink],
  template: `
    <div class="page">
      <section class="card card-pad wrap" data-testid="remote-fallback">
        <div class="art" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="56"
              fill="var(--warn-soft)"
              stroke="var(--warn-line)"
            />
            <path
              d="M40 74 Q60 58 80 74"
              fill="none"
              stroke="var(--warn)"
              stroke-width="4"
              stroke-linecap="round"
            />
            <circle cx="45" cy="50" r="4.5" fill="var(--warn)" />
            <circle cx="75" cy="50" r="4.5" fill="var(--warn)" />
          </svg>
        </div>

        <div class="stack">
          <span class="chip chip-warn">Products unavailable</span>
          <h1>This department is temporarily closed</h1>
          <p class="muted">
            We could not reach the products service. The rest of the site is
            unaffected — your basket, your session and every other page still
            work.
          </p>

          <div class="row row-wrap">
            <a routerLink="/" class="btn btn-primary">Back to home</a>
            <a routerLink="/lab" class="btn">Why did this happen?</a>
          </div>

          <p class="tiny muted">
            If you are running the lab: the remote's dev server is probably not
            up. Start it with
            <code>npm run start:remote</code>.
          </p>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .wrap {
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr);
        gap: var(--gap-5);
        align-items: center;
        max-width: 680px;
        margin: var(--gap-6) auto;
        border-radius: var(--r-xl);
      }
      .art svg {
        width: 120px;
        height: 120px;
        display: block;
      }
      .stack {
        justify-items: start;
      }
      @media (max-width: 620px) {
        .wrap {
          grid-template-columns: 1fr;
          justify-items: start;
        }
      }
    `,
  ],
})
export class RemoteUnavailableComponent {}
