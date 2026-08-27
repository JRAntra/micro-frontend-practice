# Overview — what you are building and why

This is a **lab, not a test.** The goal is that you finish with a working microfrontend and
understand why it works. Every step has a concept explanation, the exact task, hints, and the full
solution — open as much of it as you need. Reading a solution costs you nothing.

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
apps/shell/          the HOST. Owns the page chrome, nav and sign-in box.
apps/products/       a REMOTE. Owned by "the products team"; ships on its own schedule.
libs/shared-auth/    a plain Angular library holding the signed-in user.
libs/lab-dashboard/  the lab's own live progress view. Not part of the exercise.
tests/               the checks, one file per step. Read them freely.
guide/               these documents.
```

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

|     | Step                                                                     | Points |          |
| --- | ------------------------------------------------------------------------ | ------ | -------- |
| 1   | [Publish something from the remote](01-publish-from-the-remote.md)       | 15     | required |
| 2   | [Load the remote from the shell](02-load-the-remote-from-the-shell.md)   | 25     | required |
| 3   | [Share state as a singleton](03-share-state-as-a-singleton.md)           | 20     | required |
| 4   | [Federate one component, not a whole page](04-federate-one-component.md) | 15     | bonus    |
| 5   | [Pin the framework contract](05-pin-the-framework-contract.md)           | 15     | bonus    |
| 6   | [Write down the design reasoning](06-write-down-the-design-reasoning.md) | 10     | bonus    |

The three required steps are what "finished" means: 60 of the 100 points. The three bonus steps are
independent of each other — skipping one does not block the others.

## Before you change anything

Get both servers running and look around. Setup details are in [SETUP.md](../SETUP.md); the short
version is two terminals:

```bash
npm start
```

```bash
npm run start:remote
```

Then open **<http://localhost:4271>** and click through Home, Products and Lab.

- **Products** navigates nowhere. That is step 2.
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

**The dev server proves less than the tests do.** In dev mode both applications are compiled from
one Nx graph, and `tsconfig.base.json` maps the federated specifiers straight at the remote's real
source files. So a Products page can render perfectly while no federation is happening at all —
webpack just bundled the remote's code into the host. The dashboard's step 2 check looks for an
actual `remoteEntry.mjs` request rather than trusting the render, and `npm run serve:dist` puts the
two applications on genuinely separate origins. Details in
[step 2](02-load-the-remote-from-the-shell.md).

**Editing a federation config needs a server restart.** Component and template edits hot-reload.
`module-federation.config.ts` is read by webpack when the dev server _starts_, so saving it appears
to do nothing until you restart that server.

## Where to look for help

- **These step documents** — concept, task, hints and solution. Start here.
- **[`TOUR.md`](../TOUR.md)** — a guided walk through every configuration file in the workspace, key
  by key. The single most useful file in the repo; the hints point into it by heading.
- **[`DESIGN.md`](../DESIGN.md)** — the design questions for step 6.
- **The `/lab` dashboard** — what is true right now, in the running app.
- **Comments marked `// STEP sN:`** — every place you need to change something is marked in the code
  itself, with the step id that matches the `[sN]` test names.

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
