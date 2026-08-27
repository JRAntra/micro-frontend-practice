import { Route } from '@angular/router';
import { HomeComponent } from './home.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
  },

  /*
   * STEP s2: there is no /products route yet.
   *
   * The header already links to /products (see app.component.ts), so clicking
   * "Products" today navigates nowhere. Your job is to add a route that hands the
   * outlet over to the remote.
   *
   * Two things make that different from an ordinary lazy route:
   *
   *   1. The module specifier is `<remote name>/<exposed key>` — not a file path.
   *      Neither half exists on this disk; both are declared in configuration.
   *   2. It only works once the shell declares the remote (see
   *      apps/shell/module-federation.config.ts), because that is what tells
   *      webpack to compile the import into a container lookup.
   *
   * RemoteUnavailableComponent is already written for you in this folder. TOUR.md
   * explains where it fits — and, more usefully, what it does NOT protect against.
   */
];
