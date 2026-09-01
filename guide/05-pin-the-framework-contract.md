# Step 5 — Pin the framework contract

**Ticket 5 of 6** · bonus · 15 points · ≈10 min · checks named `[s5]`

> _Products want to move to Angular 20 next quarter. Nobody can say what happens to us if they do._

You will edit: `apps/shell/module-federation.config.ts` · `apps/products/module-federation.config.ts`

---

## Do this

Nothing is broken. This ticket is about writing down a decision you are currently inheriting.

In **both** config files, make the `shared` callback state an explicit policy for `@angular/core`:

```ts
shared: (name, sharedConfig) =>
  name === '@angular/core'
    ? { ...sharedConfig, singleton: true, strictVersion: true }
    : sharedConfig,
```

Spreading `sharedConfig` keeps the `requiredVersion` Nx derived from the root `package.json` and
overrides only the policy. Pass everything else through unchanged — including
`@mf-lab/shared-auth` from step 3. Both sides must declare it: a policy declared by one participant
is not a contract.

```bash
npm test -- -t "[s5]"
```

> **Restart the affected dev server.** `module-federation.config.ts` is read once, when webpack
> starts — see [SETUP.md](../SETUP.md#editing-a-federation-config-requires-a-restart). The
> `:watch` scripts do it for you. `app.routes.ts` is ordinary application code and hot-reloads.

**Before you change anything you will see:** `Expected: strictVersion: true` /
`Received: {"singleton":true}`, once per application.

> **Be aware of what this step is and is not.** Nx's `getNpmPackageSharedConfig` already returns
> `{ singleton: true, strictVersion: true, requiredVersion }` for every npm package, so
> `@angular/core` is **already strict** in this workspace — you can see the green flag in the `/lab`
> share-scope table before you write a line, and it is green for `@angular/common` too. This is not
> a bug fix. It is the difference between a policy you _have_ and a policy you have **chosen**, and
> the check deliberately calls your callback with a bare `{ singleton: true }` so that it measures
> what you declared rather than what your build tool handed you. A default is someone else's
> decision that currently matches yours; it can change on a minor version bump and nobody will
> review it, because it is not in your repository.

---

## Why it matters

Host and remote are built and deployed at _different times_, by different teams.
But they run together, in one browser tab, and they have to agree at runtime about
every singleton they share — Angular most of all.

Angular keeps process-wide state: the injector, the current change-detection
context. Two copies in one page means a component compiled against copy A running
inside copy B's injector, and Angular simply stops working. `NG0203` — _inject()
must be called from an injection context_ — is the classic symptom.

So what happens when the versions do not match? By default, this:

```
  shell wants @angular/core ~19.2      remote wants ~20.1
              │                                  │
              └──────────► share scope ◄─────────┘
                            │
  webpack default:  incompatible → warn, load BOTH  ← silent, in production
    strictVersion:  incompatible → throw at load time  ← loud, on the deploy
```

webpack's own default is deliberately permissive, and that is the trap it sets. A
quiet fallback to two Angulars converts a _build-time version problem_ into a
_runtime injector problem_, in production, in whichever combination of deploys
happens to be live. You will debug it as a mysterious DI bug and never think about
versions.

`strictVersion: true` moves the failure to the moment it is cheap: you find out on
the deploy that caused it. That is the whole value — not preventing the mismatch,
but refusing to paper over it.

## See it in the browser

Find `@angular/core` in the dashboard's **live share scope** table and read the

`strictVersion` column. It says `yes` — and it said `yes` before you started, because of the Nx
default above. This step will not change anything you can see there, and that is the lesson rather
than a broken dashboard: **the runtime cannot tell you whose decision it is enforcing.** The
dashboard says as much in its own caption.

This is also the one step whose result never reaches the built `mf-manifest.json` — webpack consumes
`strictVersion` and never writes it there. So of the lab's four feedback channels, exactly one can
see this step at all: `npm test`, which evaluates your config file. Worth knowing in general — a
federation setting that leaves no trace in the build output is a setting only your source can prove.

## Hints

They get more specific. Stop as soon as one is enough.

**1.** Read `TOUR.md` → **The share scope** (the flag table) and **Why Angular in particular must be a singleton**.

**2.** The callback signature is `(name: string, sharedConfig) => sharedConfig | false | undefined`. You want to return a _modified copy_ of `sharedConfig` for one package name, and the unmodified `sharedConfig` for everything else — spreading the original keeps the `requiredVersion` Nx already worked out.

**3.** `shared: (name, sharedConfig) => name === '@angular/core' ? { ...sharedConfig, singleton: true, strictVersion: true } : sharedConfig` — in both files.

## Solution

This is a lab, not an exam. Reading the solution costs you nothing — but read the _why_ underneath
it, because that is the part the next step assumes you have.

<details>
<summary>Show the solution for step 5</summary>

Identical addition to both configs:

```ts
// apps/shell/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['products'],
  shared: (name, sharedConfig) => (name === '@angular/core' ? { ...sharedConfig, singleton: true, strictVersion: true } : sharedConfig),
};
```

```ts
// apps/products/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'products',
  exposes: {
    './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts',
    './ProductCard': 'apps/products/src/app/remote-entry/product-card.component.ts',
  },
  shared: (name, sharedConfig) => (name === '@angular/core' ? { ...sharedConfig, singleton: true, strictVersion: true } : sharedConfig),
};
```

**Why this works.** Spreading `sharedConfig` keeps the `requiredVersion` Nx
derived from the root `package.json` (`~19.2.0`) and overrides only the policy.
Both apps currently resolve to exactly 19.2.25, so `strictVersion` changes nothing
today — which is the point. It changes what happens on the _first_ deploy where
the versions diverge: instead of silently loading two Angulars, the page fails
immediately and names the mismatch.

**Worth knowing:** `strictVersion` never appears in the emitted
`mf-manifest.json` — webpack consumes it without recording it. That is why this
step's test loads your config file and calls the callback, and it is a good
reminder that a built manifest shows you _effects_, not _intent_.

</details>

---

← [Step 4: Federate one component, not a whole page](04-federate-one-component.md) · [All steps](00-overview.md#the-six-steps) · [Step 6: Write down the design reasoning](06-write-down-the-design-reasoning.md) →
