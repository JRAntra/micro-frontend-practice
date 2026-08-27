# Step 3 — Share state as a singleton

**Required** · 20 points · checks named `[s3]`

You will edit: `apps/shell/module-federation.config.ts` · `apps/products/module-federation.config.ts` · `libs/shared-auth/src/lib/session.store.ts`

---

## The concept

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

## Your task

First, see the bug. Sign in on the shell's header, then click **Products**. The
shell greets you by name; the remote says you are browsing anonymously — one click
later, in the same tab.

Note what is _not_ wrong: the build is green, the console is clean, and
`SessionStore` (`libs/shared-auth/src/lib/session.store.ts`) is an ordinary
root-provided Angular service. The Products page prints its `SessionStore`
instance id at the bottom; compare it across a reload to convince yourself there
are two objects.

Now fix it. In **both** `apps/shell/module-federation.config.ts` **and**
`apps/products/module-federation.config.ts`, a previous developer added a
`shared` callback that returns `false` for `@mf-lab/shared-auth` — the comment
says it was to silence a version warning. Returning `false` removes a package
from the share scope entirely.

Make the library shared as a singleton again. Both sides must agree: fixing one
side alone still produces two copies.

**What you will see before you change anything:** `@mf-lab/shared-auth is missing from what shell shares`,
and the runtime test reporting that the remote greeted nobody.

## How to check it

```bash
npm test -- -t "[s3]"
```

> **Restart the dev server after this edit.** `module-federation.config.ts` and
> `app.routes.ts` differ here: the routes file is application code and hot-reloads, but the
> federation config is read by webpack when the server _starts_. Save it and nothing happens.
> Stop the affected server and run `npm start` (or `npm run start:remote`) again.

**In the browser.** This step has two demonstrations, and the second one is the more convincing.

_The basket._ The **Add to basket** buttons on the Products page are the remote's code. The basket
counter in the header, and the panel behind it, are the shell's. Add something:

- If the store is shared, the header counter moves the instant you click.
- If it is not, the button works, the card says "In basket", and the header stays at zero — with no
  error in the console and nothing in the build output. That silence is the whole problem. A feature
  that is quietly half-broken in production is worse than one that crashes.

_The instance ids._ The **session store instance** panel on the dashboard shows the ids side by
side — the one the shell holds, and the one the remote reports.

Before this step they differ, and the panel is red: two copies of the store exist, so signing in on
the shell is invisible inside the remote. Try it — type a name into the shell's sign-in box and watch
the remote keep saying nobody is signed in.

After it, the two ids collapse into a single green chip, and `@mf-lab/shared-auth` appears in the
**live share scope** table with `singleton: true`. Sign in again and the remote updates with the
shell.

The share-scope table is worth reading closely even when it is green. It is the actual runtime object
webpack negotiates between the two applications, and it is the thing steps 3 and 5 are really about.

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
