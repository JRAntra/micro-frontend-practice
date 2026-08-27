import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LabBadgeComponent } from '@mf-lab/lab-dashboard';
import { SessionStore } from '@mf-lab/shared-auth';
import { BasketComponent } from './basket.component';
import { BrandComponent } from './brand.component';

/**
 * The shell (host). It owns the chrome — brand, nav, sign-in, basket, footer —
 * and hands the main content area over to whichever route is active, including
 * routes that live inside a remote application.
 *
 * Everything visible in this file is compiled into the shell's own bundle. That is
 * worth keeping in mind while you work: the header stays up and stays interactive
 * even when the remote is broken, missing, or has not been written yet. A host that
 * can be taken down by one remote has given away the main thing this architecture
 * was supposed to buy.
 */
@Component({
  selector: 'app-root',
  imports: [RouterModule, LabBadgeComponent, BrandComponent, BasketComponent],
  template: `
    <a class="skip" href="#main">Skip to content</a>

    <header class="bar">
      <div class="page inner">
        <a routerLink="/" class="brandlink" aria-label="Acme Storefront, home">
          <app-brand />
        </a>

        <nav aria-label="Main">
          <a
            routerLink="/"
            routerLinkActive="on"
            [routerLinkActiveOptions]="{ exact: true }"
            data-testid="nav-home"
          >
            Home
          </a>
          <a
            routerLink="/products"
            routerLinkActive="on"
            data-testid="nav-products"
            >Products</a
          >
          <a routerLink="/lab" routerLinkActive="on" data-testid="nav-lab"
            >Lab</a
          >
        </nav>

        <div class="right">
          <!-- Live lab progress. Not part of the exercise; see libs/lab-dashboard. -->
          <lab-badge />

          <app-basket />

          @if (session.isSignedIn()) {
          <span class="who" data-testid="shell-session-user">
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="name">{{ session.user() }}</span>
          </span>
          <button
            type="button"
            class="btn btn-sm"
            data-testid="signout"
            (click)="session.signOut()"
          >
            Sign out
          </button>
          } @else {
          <form class="signin" (submit)="signIn($event)">
            <input
              class="field"
              data-testid="signin-name"
              aria-label="Your name"
              [value]="draft()"
              (input)="draft.set($any($event.target).value)"
              placeholder="your name"
            />
            <button
              type="submit"
              class="btn btn-primary btn-sm"
              data-testid="signin-submit"
            >
              Sign in
            </button>
          </form>
          }
        </div>
      </div>
    </header>

    <main id="main">
      <router-outlet></router-outlet>
    </main>

    <footer class="foot">
      <div class="page inner-foot">
        <div class="stack">
          <app-brand />
          <p class="tiny muted">
            A practice workspace for webpack Module Federation. Two
            applications, one browser tab.
          </p>
        </div>

        <div class="cols">
          <div>
            <span class="eyebrow">This page</span>
            <ul>
              <li>Header, footer, routing — <strong>shell</strong></li>
              <li>Basket panel — <strong>shell</strong></li>
              <li>Product data — <strong>remote</strong></li>
            </ul>
          </div>
          <div>
            <span class="eyebrow">The lab</span>
            <ul>
              <li><a routerLink="/lab">Live dashboard</a></li>
              <li><code>guide/00-overview.md</code></li>
              <li><code>TOUR.md</code></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .skip {
        position: absolute;
        left: -9999px;
      }
      .skip:focus {
        left: var(--gap-4);
        top: var(--gap-4);
        z-index: 100;
        background: var(--paper);
        border: 1px solid var(--line-2);
        border-radius: var(--r-pill);
        padding: 8px 14px;
      }

      .bar {
        position: sticky;
        top: 0;
        z-index: 30;
        background: color-mix(in srgb, var(--paper) 88%, transparent);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--line);
      }
      .inner {
        display: flex;
        align-items: center;
        gap: var(--gap-5);
        min-height: 66px;
        padding-top: 8px;
        padding-bottom: 8px;
      }
      .brandlink {
        flex: 0 0 auto;
      }

      nav {
        display: flex;
        gap: 2px;
      }
      nav a {
        padding: 6px 12px;
        border-radius: var(--r-pill);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--ink-2);
        transition: background 0.14s var(--ease);
      }
      nav a:hover {
        background: var(--paper-3);
        color: var(--ink);
      }
      nav a.on {
        background: var(--accent-soft);
        color: var(--accent-ink);
      }

      .right {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: var(--gap-3);
      }

      .signin {
        display: flex;
        gap: var(--gap-2);
      }
      .signin .field {
        width: 130px;
      }

      .who {
        display: inline-flex;
        align-items: center;
        gap: var(--gap-2);
        font-size: var(--text-sm);
        font-weight: 600;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: var(--r-pill);
        display: grid;
        place-items: center;
        background: var(--accent-soft);
        color: var(--accent-ink);
        border: 1px solid var(--accent-line);
        font-size: var(--text-xs);
        font-weight: 700;
      }

      main {
        flex: 1 0 auto;
        padding: var(--gap-6) 0 var(--gap-8);
      }

      .foot {
        border-top: 1px solid var(--line);
        background: var(--paper);
        padding: var(--gap-6) 0;
      }
      .inner-foot {
        display: flex;
        gap: var(--gap-7);
        flex-wrap: wrap;
        justify-content: space-between;
      }
      .cols {
        display: flex;
        gap: var(--gap-7);
        flex-wrap: wrap;
      }
      .cols ul {
        list-style: none;
        margin: var(--gap-2) 0 0;
        padding: 0;
        display: grid;
        gap: 4px;
        font-size: var(--text-sm);
        color: var(--ink-2);
      }
      .cols a:hover {
        color: var(--accent);
      }

      @media (max-width: 860px) {
        .inner {
          flex-wrap: wrap;
          gap: var(--gap-3);
        }
        .right {
          width: 100%;
          margin-left: 0;
          justify-content: flex-start;
        }
        .who .name {
          display: none;
        }
      }
    `,
  ],
})
export class AppComponent {
  readonly session = inject(SessionStore);
  readonly draft = signal('');

  signIn(event: Event): void {
    event.preventDefault();
    this.session.signIn(this.draft());
    this.draft.set('');
  }

  initials(): string {
    const name = this.session.user() ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }
}
