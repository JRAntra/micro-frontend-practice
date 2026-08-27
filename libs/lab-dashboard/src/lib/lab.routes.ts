import { Route } from '@angular/router';
import { LabDashboardComponent } from './lab-dashboard.component';

/**
 * The dashboard's route, spread into the shell's router in app.config.ts.
 *
 * Deliberately NOT added to `apps/shell/src/app/app.routes.ts`: that file is one of
 * the files you edit in step 2, and it should contain nothing but your own work.
 * Note also that this is an eager `component` route, not a lazy `loadChildren`
 * one — the lab should not hand you the pattern step 2 asks you to write.
 */
export const LAB_ROUTES: Route[] = [
  { path: 'lab', component: LabDashboardComponent },
];
