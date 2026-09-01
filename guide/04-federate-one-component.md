# Step 4 — Federate one component, not a whole page

**Ticket 4 of 6** · bonus · 15 points · ≈10 min · checks named `[s4]`

> _Marketing wants the week's pick on the home page. The card is the products team's; the page is ours._

You will edit: `apps/products/module-federation.config.ts`

---

## Do this

The shell's home page already asks the remote for a single component —
`apps/shell/src/app/home.component.ts` imports `products/ProductCard` in `ngOnInit` and swallows any
failure, so an optional embed can never take the host's page down.

The remote does not publish it. Add a **second** entry to `exposes`:

```ts
exposes: {
  './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts',
  './ProductCard': 'apps/products/src/app/remote-entry/product-card.component.ts',
},
```

Workspace-root relative, same as step 1. The key must match what the shell imports: the part after
`products/`, with `./` in front.

```bash
npm test -- -t "[s4]"
```

> **Restart the affected dev server.** `module-federation.config.ts` is read once, when webpack
> starts — see [SETUP.md](../SETUP.md#editing-a-federation-config-requires-a-restart). The
> `:watch` scripts do it for you. `app.routes.ts` is ordinary application code and hot-reloads.

**Before you change anything you will see:** `Received: ["./Routes"]` — the card key is absent.

---

## Why it matters

So far the remote has published a routed **area**: the shell handed its outlet over
and the remote owned the whole page. That is the coarse-grained form of
federation, and the easiest to reason about — one owner per URL.

The finer-grained form publishes a single **component**, which the host embeds in a
page it still owns and lays out. Same mechanism, different granularity:

```
  ROUTE-LEVEL (s2)                COMPONENT-LEVEL (this step)
  ┌──────────────────┐            ┌──────────────────────────┐
  │ shell header     │            │ shell header             │
  ├──────────────────┤            ├──────────────────────────┤
  │                  │            │ shell's own home content │
  │  remote owns     │            │ ┌──────────────────────┐ │
  │  this whole page │            │ │ remote's card        │ │
  │                  │            │ └──────────────────────┘ │
  └──────────────────┘            │ shell's own footer text  │
                                  └──────────────────────────┘
```

The useful insight is that `exposes` is just a map of public entry points. What
sits behind a key is entirely up to the remote: routes, a component, a service, a
plain function. Choosing the granularity _is_ the architectural decision — coarse
boundaries are simpler to own, fine ones let a host compose several teams' work
into one screen.

It also changes the failure mode. A missing route is obvious. A missing embedded
widget just… isn't there.

## See it in the browser

The remote-entry badge in the dashboard gains a second exposed key,

`./ProductCard`, and the shell's **home page** fills in the empty card slot.

The chip beside **This week's pick** on the home page is the thing to read. It says
`fetched from the remote at runtime` only when the browser really requested `remoteEntry.mjs`, and
`compiled into the shell — not federated` when it did not — because `products/ProductCard` is
mapped in `tsconfig.base.json` too, so a rendered card is not proof of anything. Same trap as step 2.

## Hints

They get more specific. Stop as soon as one is enough.

**1.** You already did this once in s1 — same key/value shape, same file. Read `TOUR.md` → **`apps/products/module-federation.config.ts`** if you want the shape again, and the **gotcha** note at the end of that section.

**2.** The key must match what the shell imports. Look at the import specifier in `home.component.ts`: the part after `products/` is the key, with `./` in front.

**3.** Add `'./ProductCard': 'apps/products/src/app/remote-entry/product-card.component.ts'` alongside the `'./Routes'` entry. If the Angular compiler complains that the file is _"missing from the TypeScript compilation"_, it means nothing inside `apps/products` references it — the remote's own page already imports it here, so this should not bite, but that is the cause if it ever does.

## Solution

This is a lab, not an exam. Reading the solution costs you nothing — but read the _why_ underneath
it, because that is the part the next step assumes you have.

<details>
<summary>Show the solution for step 4</summary>

```ts
// apps/products/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'products',
  exposes: {
    './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts',
    './ProductCard': 'apps/products/src/app/remote-entry/product-card.component.ts',
  },
};
```

**Why this works.** Each `exposes` key becomes its own entry point in the
container, so the shell can ask for `./ProductCard` without pulling in the
remote's routes. The shell loads the module, reads `ProductCardComponent` off it,
and renders it through `NgComponentOutlet` into a layout the shell controls.

**Why the extra network assertion matters.** `tsconfig.base.json` maps
`products/ProductCard` to the real file so TypeScript can type-check an import
that has no local file at runtime. If the host has not declared the remote,
webpack has no container to ask and falls back to that mapping — quietly compiling
the component into the host's bundle. Identical pixels, zero federation, and a
shared-state bug waiting to happen. Always confirm the bytes came from where you
think they did.

</details>

---

← [Step 3: Share state as a singleton](03-share-state-as-a-singleton.md) · [All steps](00-overview.md#the-six-steps) · [Step 5: Pin the framework contract](05-pin-the-framework-contract.md) →
