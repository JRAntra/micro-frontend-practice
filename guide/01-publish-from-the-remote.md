# Step 1 — Publish something from the remote

**Ticket 1 of 6** · required · 15 points · ≈5 min · checks named `[s1]`

> _The products team shipped their split-out app and forgot to make any of it public._

You will edit: `apps/products/module-federation.config.ts`

---

## Do this

`apps/products` currently publishes **nothing**. Give it one public entry point.

Open `apps/products/module-federation.config.ts` and fill in the empty `exposes` map:

```ts
exposes: {
  './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts',
},
```

Two things to get right, and they are the two things people get wrong:

- The **key** is the specifier consumers use after the remote's name. The shell will import
  `products/Routes`, so the key is `'./Routes'`.
- The **value** is **workspace-root relative** — it starts with `apps/products/…`, not `./`.

Point it at `entry.routes.ts`, not `app.routes.ts`. The remote has two front doors: `app.routes.ts`
is its own root table for when you open `:4272` directly, and `remote-entry/entry.routes.ts` is the
one meant for federation. (`TOUR.md` → **Two front doors**.)

Then check it:

```bash
npm test -- -t "[s1]"
```

> **Restart the remote's dev server.** `module-federation.config.ts` is read once, when webpack
> starts — see [SETUP.md](../SETUP.md#editing-a-federation-config-requires-a-restart).
> `npm run start:remote:watch` does it for you.

**Before you change anything you will see:** `exposes is empty — nothing is published`.

---

## Why it matters

A **remote** is an application that publishes some of its modules for other
applications to import at runtime. It is a black box: the only things the outside
world can reach are the ones it explicitly publishes.

That list is the `exposes` map, and the published artifact is a small file called
`remoteEntry.mjs` — the **container**. When a host wants something from this
remote, it downloads the container and asks it for a module by name.

```
apps/products                            what the outside world sees
┌───────────────────────────────┐
│ entry.routes.ts    ← exposed  │  ──►  './Routes'
│ entry.component.ts            │       (private)
│ product-card.component.ts     │       (private)
│ ...everything else            │       (private)
└───────────────────────────────┘
        published as ──►  dist/apps/products/remoteEntry.mjs
```

Note what does _not_ control this: TypeScript's `export` keyword. A file can be
exported perfectly and still be invisible to every other application, because
visibility across a federation boundary is a **build configuration** decision, not
a language one.

In a real company this is the API-review surface. Adding a key here is a public
commitment: another team will import it, and you cannot rename it without
coordinating a deploy.

## See it in the browser

With both servers running, open <http://localhost:4271/lab>. Before this step the dashboard's
**products** box is grey and reads
_publishes nothing_; the remote-entry badge shows no exposed keys.

After restarting the remote's server, the box turns solid and the badge lists `./Routes` — you do not
have to reload the dashboard, it re-polls every two seconds and will catch the change on its own.

Note what has _not_ happened yet: the arrow from shell to products is still dashed. Publishing and
consuming are two separate decisions, and you have only made the first one.

## Hints

They get more specific. Stop as soon as one is enough.

**1.** Read `TOUR.md` → **`apps/products/module-federation.config.ts` — the remote's contract**. It describes the exact shape of an `exposes` entry and which end is the key.

**2.** The shape is `exposes: { '<public key>': '<workspace-relative path>' }`. Both halves are strings. The key must start with `./` — that is the convention Module Federation uses for a container's own entry points.

**3.** You need exactly one entry, whose key is `'./Routes'` and whose value is the path to `entry.routes.ts` starting from the workspace root (i.e. beginning with `apps/products/...`).

## Solution

This is a lab, not an exam. Reading the solution costs you nothing — but read the _why_ underneath
it, because that is the part the next step assumes you have.

<details>
<summary>Show the solution for step 1</summary>

```ts
// apps/products/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'products',
  exposes: {
    './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts',
  },
  shared: (name, sharedConfig) => (name === '@mf-lab/shared-auth' ? false : sharedConfig),
};
```

**Why this works.** `withModuleFederation` passes `exposes` to webpack's
`ModuleFederationPlugin`, which makes `entry.routes.ts` a separate chunk and
records it in the container under the name `./Routes`. The build now emits
`dist/apps/products/remoteEntry.mjs`, whose job is to answer "what do you
publish, and what do you already have loaded?".

Nothing consumes it yet — that is s2. Publishing and consuming are two separate
decisions, made by two different teams, in two different files.

</details>

---

← [Overview](00-overview.md) · [All steps](00-overview.md#the-six-steps) · [Step 2: Load the remote from the shell](02-load-the-remote-from-the-shell.md) →
