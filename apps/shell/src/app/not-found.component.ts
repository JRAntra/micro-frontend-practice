import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/**
 * The shell's 404. Shell-owned, like all the chrome.
 *
 * It exists because "no route matched" is the *initial* state of this lab: the
 * header links to /products from the first minute, and nothing answers there until
 * step 2. A blank page and a console error make that look like a broken repo rather
 * than an unfinished exercise, so this says which it is.
 *
 * Note where the wildcard is registered: `app.config.ts`, after `appRoutes`. It
 * deliberately does NOT live in `apps/shell/src/app/app.routes.ts` — a `**` route
 * matches greedily in declaration order, so a wildcard sitting at the bottom of
 * that file would silently swallow the `/products` route you add in step 2 if you
 * appended after it. That is a real Angular trap and not one this lab wants to
 * spring on you.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="page">
      <section class="card card-pad wrap" data-testid="not-found">
        <div class="art" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="56" fill="var(--paper-3)" stroke="var(--line-2)" />
            <path
              d="M38 46 L52 60 L38 74"
              fill="none"
              stroke="var(--ink-4)"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M62 74 L82 74"
              fill="none"
              stroke="var(--ink-4)"
              stroke-width="4"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div class="stack">
          @if (isProducts) {
            <span class="chip chip-warn">Not wired up yet</span>
            <h1>Nothing answers at /products</h1>
            <p class="muted">
              The header links here from the very first minute, and the shell has no route for it
              yet. That is not a bug — it is step 2, and it is the point of the exercise.
            </p>
            <p class="tiny muted">
              The products team has an application ready to serve this page. The shell has to
              declare it as a remote and hand its router outlet over. See
              <code>guide/02-load-the-remote-from-the-shell.md</code>.
            </p>
          } @else {
            <span class="chip">404</span>
            <h1>We could not find that page</h1>
            <p class="muted">
              No route matched <code>{{ url }}</code>.
            </p>
          }

          <div class="row row-wrap">
            <a routerLink="/" class="btn btn-primary">Back to home</a>
            <a routerLink="/lab" class="btn">Open the lab dashboard</a>
          </div>
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
        max-width: 700px;
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
        }
      }
    `,
  ],
})
export class NotFoundComponent {
  private readonly router = inject(Router);
  readonly url = this.router.url;
  readonly isProducts = this.url.startsWith('/products');
}
