# Step 2 — Load the remote from the shell

**Required** · 25 points · checks named `[s2]`

You will edit: `apps/shell/module-federation.config.ts` · `apps/shell/src/app/app.routes.ts`

---

## The concept

The remote publishes; the **host** decides what it is willing to load. Those are
independent, and both are required — a published module that nobody declares is
just an unused build artifact.

The host side has two halves, and it is easy to do one and be confused by the
other:

1. **Declare the remote** (configuration). This tells webpack that a container
   named `products` exists, so an import beginning `products/...` should compile
   into a _container lookup_ rather than a file lookup.
2. **Use it** (code). A route whose `loadChildren` imports `products/Routes`.

```
  shell                                         products
  ┌────────────────────────┐                    ┌──────────────────┐
  │ remotes: ['products']  │ ── knows about ──► │ name: 'products' │
  │                        │                    │ exposes:         │
  │ route /products        │ ── imports ──────► │   './Routes'     │
  │  import('products/Routes')                  └──────────────────┘
  └────────────────────────┘
        │  at RUNTIME: GET http://localhost:4272/remoteEntry.mjs
        └────────────────────────────────────────────────────────►
```

The specifier `products/Routes` is `<remote name>/<exposed key>`. Neither half is
a path on disk. Both come from configuration — the name and key from s1, the
`remotes` list from this step. That is why this looks like an ordinary dynamic
import and behaves nothing like one.

This is the moment microfrontends actually happen: one application rendering a
component it never compiled, fetched over the network while the user waits.

## Your task

Two files.

**1. `apps/shell/module-federation.config.ts`** — `remotes` is empty, so the
shell knows about no remotes. Declare the products remote. A bare string means "a
project in this workspace with that name"; Nx looks up that project's serve port
and bakes `http://localhost:<port>/remoteEntry.mjs` into the build.

**2. `apps/shell/src/app/app.routes.ts`** — there is no `/products` route. The
header already links to it (see `app.component.ts`), so clicking **Products**
today goes nowhere. Add a route with:

- `path: 'products'`
- `loadChildren` that imports `products/Routes` and returns its `remoteRoutes`
  export.

**What you will see before you change anything:** `remotes is empty — the shell knows about no remotes`,
and `no import('products/Routes')`. Once both are in place, the runtime test
clicks **Products** and expects the remote's page to appear.

If you get a TypeScript error about not finding the module `products/Routes`,
that is expected and already solved for you — `tsconfig.base.json` maps it so
`tsc` can type-check a specifier that has no local file at runtime. `TOUR.md`
explains why that mapping is also a trap.

## How to check it

```bash
npm test -- -t "[s2]"
```

> **Restart the dev server after this edit.** `module-federation.config.ts` and
> `app.routes.ts` differ here: the routes file is application code and hot-reloads, but the
> federation config is read by webpack when the server _starts_. Save it and nothing happens.
> Stop the affected server and run `npm start` (or `npm run start:remote`) again.

**In the browser.** The dashboard's shell→products arrow goes solid green, and the header badge
counts step 2. Click **Products** in the shell nav: you should see the remote's own page instead of
the _Remote unavailable_ fallback.

**Do not trust the dev server alone here.** `tsconfig.base.json` maps `products/Routes` straight at
the real source file, so a `loadChildren` import compiles and renders even when the shell has not
declared the remote at all — webpack just bundles the component into the host. The page looks right
and no federation happened. This is the single most common way to "finish" this step without doing
it.

Two things see through it, and they are what the dashboard's s2 probe uses:

```bash
npm run build && npm run serve:dist   # two real origins, no path mappings
```

and the browser DevTools **Network** tab: a genuinely federated route fetches
`remoteEntry.mjs` from `localhost:4272`. If you don't see that request, it isn't federated.

## Hints

They get more specific. Stop as soon as one is enough.

**1.** Read `TOUR.md` → **`apps/shell/module-federation.config.ts` — the host's contract** for `remotes`, and **The one-minute version** for why both halves are needed.

**2.** `remotes` is an array of strings: the remote's `name` from its own config. For the route, this is a normal Angular lazy route — `loadChildren: () => import(...).then(m => ...)` — the only unusual part is that the import specifier is `products/Routes` rather than a relative path.

**3.** `remotes: ['products']`. And the exposed file exports a const named `remoteRoutes`, so the route's `.then()` needs to return `m.remoteRoutes`.

## Solution

This is a lab, not an exam. Reading the solution costs you nothing — but read the _why_ underneath
it, because that is the part the next step assumes you have.

<details>
<summary>Show the solution for step 2</summary>

```ts
// apps/shell/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['products'],
  shared: (name, sharedConfig) => (name === '@mf-lab/shared-auth' ? false : sharedConfig),
};
```

```ts
// apps/shell/src/app/app.routes.ts
import { Route } from '@angular/router';
import { HomeComponent } from './home.component';
import { RemoteUnavailableComponent } from './remote-unavailable.component';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  {
    path: 'products',
    loadChildren: () => import('products/Routes').then((m) => m.remoteRoutes).catch(() => [{ path: '', component: RemoteUnavailableComponent }]),
  },
];
```

**Why this works.** Declaring `products` in `remotes` makes webpack treat any
import starting `products/` as a container lookup. At runtime the browser fetches
`remoteEntry.mjs` from the remote's origin, asks it for `./Routes`, and hands the
resulting route array to the Angular router — which activates the remote's
component inside the shell's outlet.

**About that `.catch()`.** It is worth having, but be precise about what it buys
you: it covers a container that loads but cannot supply this module — a renamed
key, an exposed file that throws, a 404 chunk. It does **not** make the shell
survive a remote that is entirely unreachable, because with statically-declared
remotes webpack initialises every container while resolving `main.ts`'s
`import('./bootstrap')`, so a dead container stops the shell booting before any
route exists. `TOUR.md` → **Blast radius** has the experiment.

</details>

---

← [Step 1: Publish something from the remote](01-publish-from-the-remote.md) · [All steps](00-overview.md#the-six-steps) · [Step 3: Share state as a singleton](03-share-state-as-a-singleton.md) →
