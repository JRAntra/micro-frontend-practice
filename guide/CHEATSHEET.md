# Cheat sheet

The whole lab on one screen. Use this if you have done federation before, or if you know what a step
wants and just need the exact key. Everything here is explained properly in the step documents —
this page is deliberately not the place to learn it.

```bash
npm run start:watch          # host   :4271   ← the page you open
npm run start:remote:watch   # remote :4272
npm test                     # 18 checks, 11 red on a fresh clone. That is the task list.
```

Open <http://localhost:4271/lab> in a second tab and leave it there.

---

## The six changes

|     | File                                        | Change                                                                                           |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `apps/products/module-federation.config.ts` | `exposes: { './Routes': 'apps/products/src/app/remote-entry/entry.routes.ts' }`                  |
| 2a  | `apps/shell/module-federation.config.ts`    | `remotes: ['products']`                                                                          |
| 2b  | `apps/shell/src/app/app.routes.ts`          | lazy route `path: 'products'` → `import('products/Routes').then(m => m.remoteRoutes)`            |
| 3   | **both** `module-federation.config.ts`      | `shared` must **not** return `false` for `@mf-lab/shared-auth`                                   |
| 4   | `apps/products/module-federation.config.ts` | second expose `'./ProductCard'` → `apps/products/src/app/remote-entry/product-card.component.ts` |
| 5   | **both** `module-federation.config.ts`      | `@angular/core` → `{ ...sharedConfig, singleton: true, strictVersion: true }`                    |
| 6   | `DESIGN.md`                                 | answer all six questions, ≥25 words each, delete the italic prompts                              |

Steps 3 and 5 are the same callback, so write it once and paste it into both files:

```ts
shared: (name, sharedConfig) =>
  name === '@angular/core'
    ? { ...sharedConfig, singleton: true, strictVersion: true }
    : sharedConfig,
```

`exposes` paths are **workspace-root relative**, not relative to the config file.

---

## Four rules that cost people the most time

1. **Editing a `module-federation.config.ts` needs a dev-server restart.** Webpack reads it once,
   at startup. The `:watch` scripts above restart for you; plain `npm start` does not, and saving
   will appear to do nothing at all.
2. **A rendered page is not proof of federation.** `tsconfig.base.json` maps `products/Routes` and
   `products/ProductCard` straight at the remote's real source, so the import resolves and renders
   with no remote declared — webpack just compiles the remote into the host. Check the chip on the
   home page, the Network tab, or `npm run serve:dist`.
3. **Both sides must agree on a shared package.** Fixing one config alone still gives you two
   copies.
4. **Steps 5 and 6 leave no runtime trace.** `strictVersion` never reaches `mf-manifest.json` and
   `DESIGN.md` is a file, so `/lab` cannot see either. `npm test` settles both.

---

## Checking your work

```bash
npm test -- -t "[s3]"    # one step
npm run test:watch       # re-run on save
npm run verify:build     # build both apps, inspect the emitted manifests
npm run serve:dist       # the built apps on two real origins — no path mappings
npm run blast-radius     # same, but the remote's container returns 404
npm run doctor           # Node version, ports
```

## Where things are

```
apps/shell/            the HOST — chrome, nav, basket, routing
apps/products/         the REMOTE — catalogue, cards
libs/shared-auth/      the session store both applications share
libs/lab-dashboard/    /start and /lab. Lab infrastructure, not the exercise
tests/                 the 18 checks. Read them; do not edit them
TOUR.md                every config file, key by key
DESIGN.md              step 6
```

---

← [All steps](00-overview.md) · [Step 1](01-publish-from-the-remote.md)
