import { Route } from '@angular/router';
import { LabDashboardComponent } from './lab-dashboard.component';
import { StartHereComponent } from './start-here.component';

/**
 * The dashboard's routes, spread into the shell's router in app.config.ts:
 * `/start`, the on-ramp, and `/lab`, the live dashboard.
 *
 * Deliberately NOT added to `apps/shell/src/app/app.routes.ts`: that file is one of
 * the files you edit in step 2, and it should contain nothing but your own work.
 * Note also that these are eager `component` routes, not lazy `loadChildren`
 * ones — the lab should not hand you the pattern step 2 asks you to write.
 */
export const LAB_ROUTES: Route[] = [
  {
    path: 'start',
    component: StartHereComponent,
    title: 'Start here · Boundary & Co.',
  },
  {
    path: 'lab',
    component: LabDashboardComponent,
    title: 'Lab dashboard · Boundary & Co.',
  },
];
