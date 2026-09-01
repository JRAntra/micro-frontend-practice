# Step 2 — Load the remote from the shell

**Ticket 2 of 6** · required · 25 points · ≈15 min · checks named `[s2]`

> _The Products link in our own header goes to a 404. Customers have noticed._

You will edit: `apps/shell/module-federation.config.ts` · `apps/shell/src/app/app.routes.ts`

---

## Do this

Two files, and you need **both** — this is the step where doing one half and being confused by the
other is the normal experience.

**1. Declare the remote.** In `apps/shell/module-federation.config.ts`:

```ts
remotes: ['products'],
```

A bare string means "a project in this workspace with that name". Nx looks up that project's serve
port and bakes `http://localhost:4272/remoteEntry.mjs` into the build.

**2. Route to it.** In `apps/shell/src/app/app.routes.ts`, add an ordinary lazy route — with one
unusual detail: the specifier is `<remote name>/<exposed key>`, not a file path.

```ts
{
  path: 'products',
  loadChildren: () => import('products/Routes').then((m) => m.remoteRoutes),
}
```

The exposed file exports a const named `remoteRoutes`, so `.then()` has to return `m.remoteRoutes`
rather than the module. `RemoteUnavailableComponent` is already written for you next door if you
want a `.catch()` — read the solution's note on what it does and does not buy you.

If TypeScript complains it cannot find `products/Routes`, that is expected and already handled:
`tsconfig.base.json` maps it so `tsc` can type-check a specifier with no file behind it at runtime.
That mapping is also a trap — see **Do not trust the dev server** below.

```bash
npm test -- -t "[s2]"
```

> **Restart the affected dev server.** `module-federation.config.ts` is read once, when webpack
> starts — see [SETUP.md](../SETUP.md#editing-a-federation-config-requires-a-restart). The
> `:watch` scripts do it for you. `app.routes.ts` is ordinary application code and hot-reloads.

**Before you change anything you will see:** `remotes is empty — the shell knows of no remotes`, and
`path found: false, import found: false`.

---

## Why it matters

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

## See it in the browser

On the dashboard, the shell→products arrow draws itself and goes green, and the header badge counts
step 2. Click **Products** in the shell nav: you should see the remote's own page instead of the
_Remote unavailable_ fallback.

**Do not trust the render.** A `loadChildren` import of `products/Routes` compiles and renders even
with no remote declared — this is the tsconfig path-mapping trap, and it is the single most common
way to "finish" this step without doing it. `TOUR.md` →
**[`tsconfig.base.json` — the workspace module map](../TOUR.md)** explains why.

Three things see through it: the dashboard's s2 check (which looks for the actual `remoteEntry.mjs`
request rather than trusting the render), the DevTools **Network** tab, and
`npm run build && npm run serve:dist` — two real origins, no path mappings.

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
