# Step 5 — Pin the framework contract

**Bonus** · 15 points · checks named `[s5]`

You will edit: `apps/shell/module-federation.config.ts` · `apps/products/module-federation.config.ts`

---

## The concept

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
              default:  incompatible → warn, load BOTH  ← silent, in production
   strictVersion:  incompatible → throw at load time    ← loud, on the deploy
```

The default is deliberately permissive, and that is the trap. A quiet fallback to
two Angulars converts a _build-time version problem_ into a _runtime injector
problem_, in production, in whichever combination of deploys happens to be live.
You will debug it as a mysterious DI bug and never think about versions.

`strictVersion: true` moves the failure to the moment it is cheap: you find out on
the deploy that caused it. That is the whole value — not preventing the mismatch,
but refusing to paper over it.

## Your task

This step is different from the others: nothing is broken. Nx already shares
Angular as a singleton, so the app works — it works by _accident of the defaults_,
and the default is the permissive one.

Make the policy explicit. In **both** `apps/shell/module-federation.config.ts`
and `apps/products/module-federation.config.ts`, add a `shared` callback that,
for `@angular/core`, returns a config with:

- `singleton: true` — never more than one in the page
- `strictVersion: true` — a version mismatch is an error, not a warning

Pass everything else through unchanged. Both sides must declare it: a policy
declared by only one participant is not a contract.

**What you will see before you change anything:** `no shared callback — the configuration relies entirely
on Nx defaults`, or `strictVersion: undefined`.

Note that the test reads your callback by _calling_ it, not by pattern-matching
the source, so how you write it is up to you.

## How to check it

```bash
npm test -- -t "[s5]"
```

> **Restart the dev server after this edit.** `module-federation.config.ts` and
> `app.routes.ts` differ here: the routes file is application code and hot-reloads, but the
> federation config is read by webpack when the server _starts_. Save it and nothing happens.
> Stop the affected server and run `npm start` (or `npm run start:remote`) again.

**In the browser.** Find `@angular/core` in the dashboard's **live share scope** table. Before this
step it has no `strictVersion`; after it, the flag shows.

This is the one step whose result you cannot see in the built `mf-manifest.json` — webpack consumes
`strictVersion` and never writes it there. The unit test reads your config file by evaluating it,
and the dashboard reads the share scope out of the running browser. Those are the only two places
the decision is observable, which is itself worth knowing: a federation setting that leaves no trace
in the build output is a setting you can only test at runtime.

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
