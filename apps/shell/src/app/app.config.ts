import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LAB_ROUTES } from '@mf-lab/lab-dashboard';
import { appRoutes } from './app.routes';

/**
 * `LAB_ROUTES` adds /lab, the live lab dashboard. It is spread in here rather than
 * written into app.routes.ts because app.routes.ts is a file you edit in step 2 and
 * should hold nothing but your own work.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter([...appRoutes, ...LAB_ROUTES]),
  ],
};
