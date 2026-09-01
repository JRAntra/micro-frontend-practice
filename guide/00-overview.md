# Overview — what you are building and why

## Week one at Boundary &amp; Co.

You have just joined the storefront team. Last sprint the **products** team split their half of the
site into its own application — their own build, their own deploy schedule, their own on-call. In
principle that is what everybody wanted.

In practice, this morning: the **Products** link in your own header goes nowhere, the home page has
a hole where the week's pick should be, and signing in on the header is invisible to the catalogue.
Nothing crashes. Nothing is red in CI. It simply does not work.

Six tickets, about 80 minutes. Every one of them is **build configuration** — you will not write a
component. That is the point of the exercise: in a federated system the interesting decisions live
in config files, and the bugs have no stack traces.

This is a **lab, not a test.** Every step has the concept, the exact task, three hints and the full
solution in a collapsed block. **Reading a solution costs you nothing.**

> In a hurry, or done this before? [`CHEATSHEET.md`](CHEATSHEET.md) is the whole lab on one screen.

## What a microfrontend is, in one paragraph

A normal single-page app is one build and one deploy: everything ships together, so every team ships
together. Microfrontends split the _runtime_ instead of just the codebase — several independently
built and deployed applications cooperate in one browser tab. One of them (the **host**) owns the
page shell and hands parts of the UI over to the others (**remotes**), which it downloads _while it
is running_. **Webpack Module Federation** is the mechanism that makes that possible: it lets one
bundle import code from another bundle it never compiled against.

The prize is independent deployment. The price is a set of new problems that this lab is mostly
about: who publishes what, who is allowed to import it, and what happens when two applications each
think they own the same thing.

## This workspace

```
apps/shell/          the HOST. Brand, nav, sign-in, basket, 404 page, routing.
apps/products/       a REMOTE. The catalogue and its cards; ships on its own schedule.
libs/shared-auth/    the session: who is signed in, and what is in the basket.
libs/lab-dashboard/  the lab's own live progress view. Not part of the exercise.
styles/theme.css     the design system, imported by both applications.
tests/               the checks, one file per step. Read them freely.
guide/               these documents.
```

It is a working storefront rather than a scaffold on purpose. The interesting problems in this
architecture only appear when two independently deployed applications have to cooperate on one real
page — so the remote owns the Add-to-basket buttons while the shell owns the basket counter, and
getting those two to agree is step 3.

Two applications, one library, and — importantly — **one root `package.json`**. This is an Nx
_integrated_ monorepo, so there is a single dependency install for the whole workspace.

```
   ┌──────────────────────── one browser tab ────────────────────────┐
   │                                                                 │
   │   apps/shell  (host)                                            │
   │   ┌───────────────────────────────────────────────────────┐     │
   │   │ header: nav + sign in            [shell code]         │     │
   │   ├───────────────────────────────────────────────────────┤     │
   │   │ <router-outlet>                                       │     │
   │   │   /            → shell's own Home     [shell code]    │     │
   │   │   /products    → ??? ─────────────────────────────┐   │     │
   │   └───────────────────────────────────────────────────┼───┘     │
   └───────────────────────────────────────────────────────┼─────────┘
                                                           │ fetched at RUNTIME
                              ┌────────────────────────────▼──────────┐
                              │ apps/products (remote)                │
                              │ built + deployed separately           │
                              │ remoteEntry.mjs ── the container      │
                              └───────────────────────────────────────┘
```

Right now that `???` does not work. Wiring it up is the lab.

## The six steps

Do them in order. Each is a prerequisite for observing the next — you cannot see what the remote
_sees_ until the remote renders.

|     | Ticket                                                                   | Time | Points |          |
| --- | ------------------------------------------------------------------------ | ---- | ------ | -------- |
| 1   | [Publish something from the remote](01-publish-from-the-remote.md)       | 5m   | 15     | required |
| 2   | [Load the remote from the shell](02-load-the-remote-from-the-shell.md)   | 15m  | 25     | required |
| 3   | [Share state as a singleton](03-share-state-as-a-singleton.md)           | 15m  | 20     | required |
| 4   | [Federate one component, not a whole page](04-federate-one-component.md) | 10m  | 15     | bonus    |
| 5   | [Pin the framework contract](05-pin-the-framework-contract.md)           | 10m  | 15     | bonus    |
| 6   | [Write down the design reasoning](06-write-down-the-design-reasoning.md) | 25m  | 10     | bonus    |

The three required steps are what "finished" means: 60 of the 100 points. The three bonus steps are
independent of each other — skipping one does not block the others.

## Before you change anything

Get both servers running and look around. Setup details are in [SETUP.md](../SETUP.md); the short
version is two terminals:

```bash
npm run start:watch
```

```bash
npm run start:remote:watch
```

Then open **<http://localhost:4271>** and click through the whole header — Start here, Home,
Products and Lab.

- **Start here** is the same instructions you are reading now, inside the running app, with the
  file each step touches listed beside it.
- **Products** does not work yet. The shell has no route for it, so you get a 404 that says so.
  That is step 2.
- **Lab** is the dashboard: a live picture of what the two applications are actually doing, with a
  checklist that updates as you work. Keep it open in a second tab.

Now run the checks:

```bash
npm test
```

Eleven of the eighteen fail. **That is the correct starting state** — those failures are your task
list, not a broken repo. Each one names the file, the configuration key and the concept behind it.
Read a few before touching anything.

One thing you should _not_ see is a broken build. The workspace compiles cleanly as shipped; if it
stops compiling, that is something you changed.

## Two things worth knowing up front

**A rendered page is not proof of federation.** `tsconfig.base.json` maps the federated specifiers
straight at the remote's real source, so a Products page can render perfectly while no federation is
happening at all. This costs people more time than anything else in the lab:
[`TOUR.md` → the workspace module map](../TOUR.md) explains it once, properly.

**Editing a federation config needs a server restart.** `start:watch` and `start:remote:watch` do it
for you; plain `npm start` does not, and saving will appear to do nothing. Details in
[SETUP.md](../SETUP.md#editing-a-federation-config-requires-a-restart).

## Where to look for help

- **These step documents** — the task first, then the concept, then hints and the full solution.
- **[`CHEATSHEET.md`](CHEATSHEET.md)** — every change in the lab, on one screen.
- **[`TOUR.md`](../TOUR.md)** — a guided walk through every configuration file in the workspace, key
  by key. The single most useful file in the repo; the hints point into it by heading.
- **[`DESIGN.md`](../DESIGN.md)** — the design questions for step 6.
- **The `/start` page and the `/lab` dashboard** — the instructions, and what is true right now, in
  the running app.
- **Comments marked `STEP sN:`** — every place you need to change something is marked in the code
  itself, with the step id that matches the `[sN]` test names. `grep -rn "STEP s" apps` lists them
  all.

## Which files do you actually edit?

Almost everything you need is configuration:

| File                                        | Step       |
| ------------------------------------------- | ---------- |
| `apps/products/module-federation.config.ts` | 1, 3, 4, 5 |
| `apps/shell/module-federation.config.ts`    | 2, 3, 5    |
| `apps/shell/src/app/app.routes.ts`          | 2          |
| `DESIGN.md`                                 | 6          |

That is the point of the exercise. In a federated system the interesting decisions live in build
configuration, not in components.

---

Start with [Step 1 — Publish something from the remote](01-publish-from-the-remote.md).
