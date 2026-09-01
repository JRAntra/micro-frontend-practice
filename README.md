# Micro frontend Practice

A guided, six-step lab on **webpack Module Federation** in an **Nx** monorepo, with Angular 19.

You start with two applications that compile cleanly and do not talk to each other. By the end, one
of them is loading routes and components out of the other at runtime, over the network, with a shared
session store and a deliberate version policy — and you can explain the trade-offs you made.

Everything runs on your own machine. Nothing to sign into.

```
   apps/shell (host)  ──── fetched at RUNTIME ───▶  apps/products (remote)
   brand, nav, basket, routing                      catalogue, cards, prices
```

It is built as a working storefront rather than a scaffold, because most of what makes
microfrontends hard only shows up when two teams share a real page: the **remote** owns the
Add-to-basket buttons, the **shell** owns the basket counter in the header, and whether those two
agree is the entire subject of step 3.

---

## Quick start

```bash
nvm install && nvm use    # Node 20.11.1+; the repo ships .nvmrc
npm ci                    # ~1 minute, and it is a big install
npm run doctor            # confirms Node and that ports 4271/4272 are free
```

Then two terminals:

```bash
npm run start:watch
```

```bash
npm run start:remote:watch
```

Open **<http://localhost:4271>** and look around before changing anything. Then:

```bash
npm test
```

Eleven of the eighteen checks fail. **That is the intended starting state** — those failures are your
task list. Full details in **[SETUP.md](SETUP.md)**.

---

## Where to start reading

Two entry points, and either is fine:

- **<http://localhost:4271/start>** — the same instructions inside the running application: what you
  are building, in what order, and which file each step touches. Nothing to install to read it
  beyond what you already started.
- **[guide/00-overview.md](guide/00-overview.md)** — what a microfrontend is, how this workspace is
  laid out, and the six steps in order.

|     | Ticket                                                                         | Time | Points |          |
| --- | ------------------------------------------------------------------------------ | ---- | ------ | -------- |
| 1   | [Publish something from the remote](guide/01-publish-from-the-remote.md)       | 5m   | 15     | required |
| 2   | [Load the remote from the shell](guide/02-load-the-remote-from-the-shell.md)   | 15m  | 25     | required |
| 3   | [Share state as a singleton](guide/03-share-state-as-a-singleton.md)           | 15m  | 20     | required |
| 4   | [Federate one component, not a whole page](guide/04-federate-one-component.md) | 10m  | 15     | bonus    |
| 5   | [Pin the framework contract](guide/05-pin-the-framework-contract.md)           | 10m  | 15     | bonus    |
| 6   | [Write down the design reasoning](guide/06-write-down-the-design-reasoning.md) | 25m  | 10     | bonus    |

Each step leads with **Do this** — the file, the change, the command to verify — and puts the
concept underneath it, followed by three hints of increasing specificity and the full solution in a
collapsed block. This is a lab, not an exam: open as much of it as you need.

The three required steps are what "finished" means. The three bonus steps are independent of each
other. **[guide/CHEATSHEET.md](guide/CHEATSHEET.md)** is all six changes on one screen if you would
rather just start.

Two other documents matter:

- **[TOUR.md](TOUR.md)** — a walk through every configuration file in the workspace, key by key. The
  hints point into it by heading. If you read one thing beyond the steps, read this.
- **[DESIGN.md](DESIGN.md)** — six design questions. Step 6 is answering them.

---

## The four ways you get feedback

**1. The application itself.**

The storefront is instrumented to tell you the truth about its own composition. The featured slot on
the home page says whether that card _actually_ travelled over the network or was quietly compiled
into the shell. The Products page shows which session store it can see. The footer lists which parts
of the page belong to which application. None of it is decoration — each label is derived from a
runtime observation, and the labels change as you work.

**2. The live dashboard, at <http://localhost:4271/lab>.**

The piece worth keeping open in a second tab. It shows what your two applications are _actually_
doing, re-checked every two seconds:

- a federation diagram that lights up as you wire things together — the shell→remote arrow draws
  itself the moment step 2 lands
- the six tickets, each showing **two** verdicts side by side: what the browser can observe, and what
  your last `npm test` found
- a **what just changed** strip — `session store instances: 2 → 1`, `remoteEntry.mjs fetched for the
first time` — so cause and effect are visible rather than inferred
- the **live share scope**: the real runtime negotiation between the two apps, and the only place
  `strictVersion` is visible at all
- the **session store instances**: one id means the shell and the remote share a store, two means
  they each have their own and signing in on one is invisible to the other
- a **blast radius** experiment that runs in two stages and debriefs you afterwards, because the
  interesting half of that outage takes the dashboard down with it

**3. `npm test` — eighteen checks, one file per step in `tests/`.**

They read your configuration files directly, so the suite runs in a couple of seconds with no build
and no browser. `npm test -- -t "[s3]"` scopes to one step; `npm run test:watch` re-runs on save.

Failures are written to teach: what was checked, what was wanted, what was found, why it matters, the
file to open, and the guide page to read.

**4. `npm run verify:build` — what production sees.**

Builds both applications and inspects the manifests webpack actually emitted, including whether
`remoteEntry.mjs` exists. This catches configuration that looks right but does not take effect.

The dashboard and the tests are deliberately independent — one watches the running browser, the other
reads your source — and the dashboard prints both verdicts next to each other rather than blending
them. Them agreeing is the signal you want.

That separation is not decoration. Two of the six steps are invisible to one of the two checks:
`strictVersion` is consumed by webpack and recorded nowhere, and `DESIGN.md` is a file on disk. So
run `npm test` at least once early — until you do, the dashboard can only show you four of the six.

---

## Two things that will save you an hour

**A rendered page is not proof of federation.** `tsconfig.base.json` maps `products/Routes` and
`products/ProductCard` straight at the remote's real source files, so `import('products/Routes')`
resolves and renders even when the shell has declared no remote at all — webpack simply compiles the
remote's code into the host bundle. One build, one deploy, none of the independence that was the
point, and nothing on screen tells you. Three things see through it: the home page's own chip, the
dashboard's step 2 check, and `npm run serve:dist`.
[`TOUR.md`](TOUR.md) → **the workspace module map** has the full story.

**Editing `module-federation.config.ts` needs a dev-server restart.** Components and templates
hot-reload; that file is only read once, when webpack starts. `start:watch` /
`start:remote:watch` (see Commands) restart the server for you when it changes — plain `npm start`
will not, and saving will appear to do nothing.

---

## The `tests/` directory

Open it, read it, use it as documentation. But do not edit it — the checks are the definition of
done, and a passing test you changed tells you nothing.

---

## Layout

```
apps/shell/           the HOST — brand, nav, sign-in, basket, 404, routing
apps/products/        a REMOTE — catalogue, product cards, generated artwork
libs/shared-auth/     the session: who is signed in, and what is in the basket
styles/theme.css      the design system, imported by both applications
libs/lab-dashboard/   the /lab dashboard. Lab infrastructure, not part of the exercise
guide/                the six steps, plus CHEATSHEET.md
tests/                the checks
tools/                dev scripts: doctor, clean, build verifier, static server
```

One root `package.json` for all of it — an Nx _integrated_ monorepo, one dependency install.

## Commands

|                                          |                                               |
| ---------------------------------------- | --------------------------------------------- |
| `npm start`                              | the host on 4271                              |
| `npm run start:remote`                   | the remote on 4272                            |
| `npm run start:watch`                    | the host, auto-restarting on config changes   |
| `npm run start:remote:watch`             | the remote, auto-restarting on config changes |
| `npm test` · `npm run test:watch`        | the lab checks                                |
| `npm run test:units`                     | the applications' Angular unit tests          |
| `npm run build` · `npm run verify:build` | production build, and check what it emitted   |
| `npm run serve:dist`                     | serve the built output on two real origins    |
| `npm run blast-radius`                   | the same, with the remote's container 404ing  |
| `npm run lint` · `npm run format`        | eslint, prettier                              |
| `npm run doctor` · `npm run clean`       | check the environment, remove generated files |
| `npm run graph`                          | Nx's interactive project graph                |
