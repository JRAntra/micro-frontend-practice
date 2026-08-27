# Setup — running this lab on your own machine

Everything here runs locally. There is no server to connect to, no account, and nothing to install
beyond Node and the repo's own dependencies.

---

## 1. Prerequisites

|                |                                           | how to check                 |
| -------------- | ----------------------------------------- | ---------------------------- |
| **Node**       | 20.11.1 or newer (22.12+ / 24+ also fine) | `node -v`                    |
| **npm**        | 10 or newer — ships with Node 20          | `npm -v`                     |
| **git**        | any recent version                        | `git --version`              |
| **Disk**       | about 1.2 GB for `node_modules`           | it is an Angular monorepo    |
| **Free ports** | 4271 and 4272                             | `npm run doctor` checks them |

No browser prerequisite, and nothing is downloaded at install time beyond npm packages.

**If `node -v` prints 16.x or 18.x**, switch versions before installing. The repo ships `.nvmrc` and
`.node-version`, so your version manager can read it:

```bash
nvm install && nvm use
```

`fnm use`, `volta install node@20.19.5` and `asdf local nodejs 20.19.5` all work too. `npm ci`,
`npm start`, `npm run build` and `npm test` each refuse to run on an unsupported Node and tell you
how to fix it — Angular 19 and Nx 20 otherwise fail with errors that mention neither Node nor the
version. (`nx serve` on Node 16 dies with `availableParallelism is not a function`, which is not a
clue anybody enjoys chasing.)

---

## 2. Install

From the **repository root**, not inside an app directory:

```bash
npm ci
```

Two things about that command matter.

**`npm ci`, not `npm install`.** This lockfile is pinned, and one of the pins is load-bearing:

```json
"overrides": { "@rspack/core": "1.3.15" }
```

`@nx/module-federation` 20.8.4 accepts `^1.1.5`, but newer 1.x releases dropped an internal method it
calls. Resolve to one of those and the build dies with
`compiler.__internal__registerBuiltinPlugin is not a function` — an error that points at nothing you
wrote. `npm ci` honours the lockfile exactly and avoids the whole question. `TOUR.md` →
"`package.json` — one dependency install, and one pin worth reading" has the longer story.

**One install for the whole workspace.** This is an Nx _integrated_ monorepo: a single root
`package.json` covers both applications and both libraries. There is no `npm install` to run inside
`apps/shell`.

Then confirm your setup:

```bash
npm run doctor
```

It checks Node, the ports and whether the workspace is writable, and prints a fix for anything that
is wrong.

---

## 3. Run it

Two terminals. The applications are separate deployables — that is the entire point of the
architecture — so they get separate dev servers.

**Terminal 1 — the host:**

```bash
npm start
```

**Terminal 2 — the remote:**

```bash
npm run start:remote
```

Then open **<http://localhost:4271>**. That is the only URL you need; port 4272 exists so the shell
can fetch the remote from it.

|                        | serves                                     | port     |
| ---------------------- | ------------------------------------------ | -------- |
| `npm start`            | `apps/shell`, the host — the page you open | **4271** |
| `npm run start:remote` | `apps/products`, the remote                | **4272** |

Both watch and live-reload. The shell's nav has three links:

- **Home** — the shell's own page. The empty slot in the middle is step 4.
- **Products** — nothing yet. That is step 2.
- **Lab** — the dashboard. Keep it open in a second browser tab while you work.

### Why 4272 is not a port you can freely change

Nx bakes the remote's URL into the shell **at build time**. It reads `serve.options.host` and
`serve.options.port` from `apps/products/project.json` and writes
`http://localhost:4272/remoteEntry.mjs` into the shell's bundle. Change the port in one place and the
built shell goes looking for a remote that is not there.

Note also `publicHost: "http://127.0.0.1:4272"` on that same target. It looks like it should be the
remote's address and it is not — it is only the hot-reload client's URL, and nothing reads it when
resolving the remote entry. It is exactly the kind of plausible-looking dead end `TOUR.md` exists to
mark.

### Editing a federation config requires a restart

Component and template edits hot-reload normally. **`module-federation.config.ts` does not.** Webpack
reads it when the dev server starts, so saving it looks like it did nothing. Stop that server and
start it again.

Which server: the products one for `apps/products/module-federation.config.ts`, the shell one for
`apps/shell/module-federation.config.ts`. `app.routes.ts` is ordinary application code and
hot-reloads.

---

## 4. Run the checks

```bash
npm test
```

Eighteen checks, one file per step in `tests/`. They read your configuration files directly, so the
whole suite takes a couple of seconds — no build, no browser, no servers needed.

On a fresh clone, **eleven of them fail. That is correct.** They are the task list.

Useful variations:

```bash
npm test -- -t "[s2]"     # just step 2's checks
npm run test:watch        # re-run on every save
npm run test:units        # the applications' own Angular unit tests
```

Every failure is written to teach rather than to report. It names what was checked, what was wanted,
what was found, why it matters, the file to open, and the guide page to read.

---

## 5. Build, and see what production sees

```bash
npm run build          # both applications -> dist/apps/{shell,products}
npm run verify:build   # builds, then checks the emitted manifests
npm run serve:dist     # serves the built output on 4271 / 4272
```

`npm run verify:build` is worth knowing about because it checks something the unit tests cannot: it
reads the `mf-manifest.json` webpack actually emitted, and whether `remoteEntry.mjs` exists at all. A
configuration that looks right but does not take effect passes the unit tests and fails here.

`npm run serve:dist` matters for a subtler reason. **The dev server proves less than you think.** In
dev mode both applications are compiled from one Nx graph, and `tsconfig.base.json` maps
`products/Routes` and `products/ProductCard` straight at the remote's real source files. So an
import can resolve, render, and look completely correct while no federation happened at all —
webpack quietly compiled the remote's code into the host bundle. You get one build, one deploy, and
none of the independence that was the point.

Three things see through it:

- `npm run serve:dist`, which puts the two applications on genuinely separate origins with no shared
  module resolution.
- The browser's **Network** tab: real federation fetches `remoteEntry.mjs` from `localhost:4272`.
- The `/lab` dashboard, whose step 2 check looks for exactly that request rather than trusting the
  render.

---

## 6. Everything else

```bash
npm run lint            # eslint across the workspace
npm run format          # prettier
npm run graph           # Nx's interactive project graph
npm run clean           # remove dist, caches, coverage
npm run doctor          # re-check Node, ports, writability
```

---

## Troubleshooting

| Symptom                                                        | Cause and fix                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` refuses to start                                      | Your Node is too old. `nvm install && nvm use`, then retry.                                                                                                   |
| `availableParallelism is not a function`                       | Same cause — a Node 16 shell. This usually means you installed on Node 20 and then opened a fresh terminal.                                                   |
| `compiler.__internal__registerBuiltinPlugin is not a function` | You ran `npm install` instead of `npm ci`, so `@rspack/core` drifted off its pin. `rm -rf node_modules && npm ci`.                                            |
| `EADDRINUSE` on 4271 or 4272                                   | Something else has the port. `npm run doctor` will say which are taken. 4272 in particular is baked into the shell build, so free it rather than changing it. |
| I edited a config and nothing happened                         | It was a `module-federation.config.ts`. Restart that dev server.                                                                                              |
| Products renders but step 2 stays red                          | Working as intended — see §5. The tsconfig path mapping is satisfying the import without federation. Declare the remote and restart.                          |
| `npm run serve:dist` 404s everything                           | No build yet. `npm run build` first.                                                                                                                          |
| Stale behaviour after a config change                          | `npm run clean`, then rebuild.                                                                                                                                |
| Deep links like `/lab` 404                                     | Only possible if `apps/shell/webpack.config.ts` lost its `historyApiFallback` block. `git diff` it.                                                           |
| Windows: the shell cannot reach the remote                     | `localhost` resolving to `::1` while the dev server bound `127.0.0.1`. Try `127.0.0.1:4271` in the browser.                                                   |

If something still will not work, `npm run doctor` and the output of `npm test` between them cover
almost every case — and neither needs the applications to be running.
