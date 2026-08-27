import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { Route, provideRouter } from '@angular/router';
import { LAB_ROUTES } from '@mf-lab/lab-dashboard';
import { appRoutes } from './app.routes';
import { NotFoundComponent } from './not-found.component';

/** The catch-all. Must stay last — see the ordering note below. */
const fallbackRoutes: Route[] = [{ path: '**', component: NotFoundComponent }];

/**
 * The shell's router, assembled from three sources.
 *
 * `appRoutes` first, because that is your file and your routes must win. Then
 * `LAB_ROUTES` for /lab. Then the `**` catch-all, which has to be last: Angular
 * matches in declaration order and `**` matches everything, so anything after it is
 * dead.
 *
 * Both of the additions are kept out of `apps/shell/src/app/app.routes.ts` on
 * purpose. That file is one of the two you edit in step 2 and should contain nothing
 * but your own work — and a `**` route sitting at the bottom of it would silently
 * swallow the `/products` route you are about to add if you appended after it.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter([...appRoutes, ...LAB_ROUTES, ...fallbackRoutes]),
  ],
};
