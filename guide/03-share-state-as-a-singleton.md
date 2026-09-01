# Step 3 — Share state as a singleton

**Ticket 3 of 6** · required · 20 points · ≈15 min · checks named `[s3]`

> _Support ticket: "I signed in, then the catalogue asked who I was." Basket count never moves either._

You will edit: `apps/shell/module-federation.config.ts` · `apps/products/module-federation.config.ts`

You will read, but not change: `libs/shared-auth/src/lib/session.store.ts` — the point of this
ticket is that nothing in that file is wrong.

---

## Do this

**First, see the bug.** Sign in on the shell's header, then click **Products**. The shell greets you
by name; the remote says you are browsing anonymously — one click later, in the same tab. Add
something to the basket from a product card: the card says "In basket" and the header counter stays
at zero.

Nothing is broken in any component. Both `module-federation.config.ts` files contain this:

```ts
shared: (name, sharedConfig) => (name === '@mf-lab/shared-auth' ? false : sharedConfig),
```

Returning `false` removes the package from the share scope entirely, so each application bundles its
own private copy of `SessionStore`. Two stores, two truths, no error message anywhere. A previous
developer added it to silence a version warning, and silenced it by creating the exact bug the
warning was about.

**Fix it in both files.** Either delete the callback, or make it stop refusing:

```ts
shared: (name, sharedConfig) => sharedConfig,
```

Keeping the callback is the better move — step 5 wants one. Both sides must agree: fixing one alone
still gives you two copies.

```bash
npm test -- -t "[s3]"
```

> **Restart the affected dev server.** `module-federation.config.ts` is read once, when webpack
> starts — see [SETUP.md](../SETUP.md#editing-a-federation-config-requires-a-restart). The
> `:watch` scripts do it for you. `app.routes.ts` is ordinary application code and hot-reloads.

**Before you change anything you will see:** `false — the library is excluded from sharing`, once
per config.

---

## Why it matters

Federation loads several independently-built bundles into one page. Each of them
was compiled on its own, so by default each brings **its own copy** of every
dependency it uses — including your workspace libraries.

For pure functions, a duplicate copy is just wasted bytes. For anything holding
**state**, it is a correctness bug: two copies of a store are two different sets of
values, and nothing tells you.

```
  NOT SHARED                          SHARED AS SINGLETON
  ┌────────┐   ┌──────────┐           ┌────────┐   ┌──────────┐
  │ shell  │   │ products │           │ shell  │   │ products │
  │ Session│   │ Session  │           │    ╲   │   │   ╱      │
  │ user=  │   │ user=    │           │     ╲  │   │  ╱       │
  │ "Ada"  │   │ null     │           │   ┌──▼───────▼──┐     │
  └────────┘   └──────────┘           │   │  Session    │     │
   two objects, two truths            │   │  user="Ada" │     │
                                      │   └─────────────┘     │
                                      └───────────────────────┘
```

The share scope is the negotiation that prevents duplication. Three levels:

- **not shared** — a private copy per bundle.
- **shared** — "reuse a copy if the versions are compatible". An optimisation.
- **shared + `singleton: true`** — "there must never be more than one of these in
  the page". A _correctness_ requirement, and what state needs.

Nx already shares workspace libraries as singletons for you. So when this goes
wrong, it is because some configuration is actively opting out.

## See it in the browser

This step has two demonstrations, and the second one is the more convincing.

_The basket._ The **Add to basket** buttons on the Products page are the remote's code. The basket
counter in the header, and the panel behind it, are the shell's. Add something:

- If the store is shared, the header counter moves the instant you click.
- If it is not, the button works, the card says "In basket", and the header stays at zero — with no
  error in the console and nothing in the build output. That silence is the whole problem. A feature
  that is quietly half-broken in production is worse than one that crashes.

_The instance ids._ The **session store instances** panel on `/lab` shows every copy of the store
constructed in this tab. Before this step there are two and the chips are red; after it they
collapse to one green chip, and `@mf-lab/shared-auth` appears in the **live share scope** table with
`singleton: true`.

Compare them **within one page load** — the id is generated per construction, so it changes on every
reload whether or not the store is shared.

## Hints

They get more specific. Stop as soon as one is enough.

**1.** Read `TOUR.md` → **The share scope**. It has a table of the three levels and explains why `singleton` is a correctness requirement rather than an optimisation.

**2.** Nx shares workspace libraries as singletons _by default_ — so the shortest correct fix is to stop overriding it, rather than to write a more elaborate override. Look at what the `shared` callback returns for this one package name.

**3.** Either delete the `shared` callback from both configs entirely, or make it return `sharedConfig` (the defaults Nx computed) for `@mf-lab/shared-auth` instead of `false`. Both work; the second is what you want if you plan to add a policy for other packages later — which s5 does.

## Solution

This is a lab, not an exam. Reading the solution costs you nothing — but read the _why_ underneath
it, because that is the part the next step assumes you have.

<details>
<summary>Show the solution for step 3</summary>

The minimal fix is to stop excluding it. In **both** config files, delete the
`shared` callback:

```ts
// apps/shell/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['products'],
};
```

```ts
// apps/products/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'products',
  exposes: { './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts' },
};
```

Or, if you would rather keep the callback (s5 will want one), make it pass the
defaults through instead of refusing them:

```ts
shared: (name, sharedConfig) => sharedConfig,
```

**Why this works.** Nx's `withModuleFederation` already computes a shared entry
for every workspace library, with `singleton: true`. The callback was overriding
that decision. With the override gone, both builds declare
`@mf-lab/shared-auth` as a singleton in the share scope; whichever container
loads first provides the instance, and the other reuses it. One object, one set of
signal values, and signing in on the shell is immediately visible in the remote.

**The lesson worth keeping.** This bug had no error message. It could not be found
by reading component code, because no component was wrong. Behaviour across a
federation boundary is decided by build configuration, so that is where you look
when two parts of one page disagree about reality.

</details>

---

← [Step 2: Load the remote from the shell](02-load-the-remote-from-the-shell.md) · [All steps](00-overview.md#the-six-steps) · [Step 4: Federate one component, not a whole page](04-federate-one-component.md) →
