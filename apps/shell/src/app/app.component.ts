import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LabBadgeComponent } from '@mf-lab/lab-dashboard';
import { SessionStore } from '@mf-lab/shared-auth';

/**
 * The shell (host). It owns the chrome — nav, sign-in box — and hands the
 * main content area over to whichever route is active, including routes that
 * live inside a remote application.
 */
@Component({
  selector: 'app-root',
  imports: [RouterModule, LabBadgeComponent],
  template: `
    <header class="bar">
      <strong>Acme Storefront</strong>
      <nav>
        <a routerLink="/" data-testid="nav-home">Home</a>
        <a routerLink="/products" data-testid="nav-products">Products</a>
        <a routerLink="/lab" data-testid="nav-lab">Lab</a>
      </nav>

      <!-- Live progress. Not part of the exercise; see libs/lab-dashboard. -->
      <lab-badge />

      <span class="session">
        @if (session.isSignedIn()) {
        <span data-testid="shell-session-user"
          >Signed in as {{ session.user() }}</span
        >
        <button type="button" data-testid="signout" (click)="session.signOut()">
          Sign out
        </button>
        } @else {
        <input
          data-testid="signin-name"
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
          placeholder="your name"
        />
        <button type="button" data-testid="signin-submit" (click)="signIn()">
          Sign in
        </button>
        }
      </span>
    </header>

    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [
    `
      .bar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        border-bottom: 1px solid #d8d8d8;
        font-family: system-ui, sans-serif;
      }
      nav {
        display: flex;
        gap: 12px;
      }
      .session {
        margin-left: auto;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      main {
        padding: 16px;
        font-family: system-ui, sans-serif;
      }
    `,
  ],
})
export class AppComponent {
  readonly session = inject(SessionStore);
  readonly draft = signal('');

  signIn(): void {
    this.session.signIn(this.draft());
    this.draft.set('');
  }
}
