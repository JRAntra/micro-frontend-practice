import { Route } from '@angular/router';

/**
 * The products application's OWN root route table.
 *
 * Worth knowing, because it looks like duplication and isn't quite: federation
 * never reads this file. The shell gets `remote-entry/entry.routes.ts`, because
 * that is the file behind the './Routes' key in exposes.
 *
 * Worth knowing #2: in this scaffold Nx bootstraps `RemoteEntryComponent`
 * *directly* (see src/bootstrap.ts), so when you open the products app on its own
 * the router never gets consulted and this table is effectively unused. It becomes
 * load-bearing the moment the remote grows a second page of its own.
 *
 * See TOUR.md → "Two front doors".
 */
export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('./remote-entry/entry.routes').then((m) => m.remoteRoutes),
  },
];
