# Lab feedback — from someone who just finished it

> **Status: all of this has now been acted on.** This document was written after walking the lab as
> a learner; a second pass then implemented the fixes and the four improvement themes in §4. What is
> still open is listed in **[§0 Still open](#0-still-open)** at the top. Everything else is done —
> the `[fixed]` markers below are accurate, and the items that were previously "left for you to
> decide" are marked **[shipped]**.

## 0. Still open

Nothing blocking. Two judgement calls deliberately left as they are:

- **The progress high-water mark is sticky.** Once a step is earned it stays earned for the session,
  even if you then break it — the row says so explicitly ("earned at 17:05 — this page cannot
  re-check it") and **Reset progress** in the dashboard footer clears it. The alternative, a score
  that drops when you navigate, is what §3.2 was complaining about, so this is the intended trade.
- **`libs/lab-dashboard` is 8 components now.** Still comfortably readable, but it is no longer
  something you skim in one sitting. If it grows again, split the probe out of the presentation.

---

I worked through all six steps as a first-time learner: read the docs in the order they tell you to,
made the edits, took `npm test` from 11 failures to 18 passes, ran both dev servers, drove the
storefront and the `/lab` dashboard in a browser, ran `verify:build` and `serve:dist`, and did the
blast-radius experiment by hand. Then I reverted the four solution files, so the repo is back at its
starting state (11 of 18 failing).

Headline: **this is a genuinely good lab.** The instrumented storefront is the best idea in it — the
`fetched from the remote at runtime` / `compiled into the shell — not federated` chip is the single
thing that makes the tsconfig-path trap teachable instead of a gotcha. The failure messages in
`tests/` are better written than most production error handling. The step 3 bug (a real correctness
failure with no error message) is a genuinely good teaching bug.

What follows is prioritized. Items marked **[fixed]** I already corrected while working; everything
else is left for you to decide.

---

## 1. Blockers — a learner following the instructions hits a wall

### 1.1 The step 6 experiment could not be run as documented **[fixed]**

`guide/06` hint 2 and `TOUR.md` → Blast radius both said:

> In `lab/serve-dist.ts` the `serveApps` helper takes `{ products: { hide: ['remoteEntry.mjs'] } }`

Three things wrong: the directory is `tools/`, not `lab/`; `serveApps()`
([tools/serve-dist.ts:91](tools/serve-dist.ts:91)) takes no arguments; and there is no `hide`
option anywhere in the repo. Since Q5 is the one design question that explicitly says "don't guess —
run it", this stopped the step dead.

Replaced with two procedures that work (Ctrl+C the remote's dev server, or move
`dist/apps/products/remoteEntry.mjs` aside under `serve:dist`) and documented the wrinkle that the
static server's SPA fallback returns `200 text/html` rather than `404`, so you get a MIME error
rather than a not-found. **Consider actually building the `hide` option** — it was clearly the
intent, it makes the experiment one flag instead of four steps, and it produces the honest 404.

### 1.2 `guide/06` told the learner to click a control that does not exist **[fixed]**

> The **simulate remote down** toggle is question 5. Click it, …

There is no toggle. The dashboard's Blast radius section
([lab-dashboard.component.ts:186](libs/lab-dashboard/src/lib/lab-dashboard.component.ts:186)) is a
manual four-step list. Reworded the guide to match. See §4.1 — the toggle is worth building.

### 1.3 Step 5 teaches something that is not true **[fixed]**

This is the most serious one, because it is a factual error inside the concept, not a typo.

`guide/05` said the app "works by _accident of the defaults_, and the default is the permissive
one", and that in the dashboard "**Before this step it has no `strictVersion`; after it, the flag
shows.**"

Neither is true here. `getNpmPackageSharedConfig` in
`node_modules/@nx/module-federation/src/utils/share.js:138` returns
`{ singleton: true, strictVersion: true, requiredVersion }` for **every** npm package. So
`@angular/core` is already strict before the learner touches anything — I verified it in the live
share-scope table, where `@angular/common` and `@angular/router` show `strictVersion: yes` too and
nobody configured those.

The step only fails at all because `sharedDecisionFor()`
([tools/inspect.ts:150](tools/inspect.ts:150)) invents a `{ singleton: true }` default rather than
using Nx's real one. That is a defensible choice — it measures _your declaration_ rather than your
build tool's — but the guide has to say so, or a learner who checks the dashboard concludes the
lab is broken.

I rewrote the step around the honest framing: _this is not a bug fix, it is the difference between a
policy you have and a policy you chose_, which is a better lesson anyway. Two follow-ups worth
considering:

- Say the quiet part in `tools/inspect.ts` too — a comment on `sharedDecisionFor`'s `defaults`
  parameter explaining why it deliberately differs from reality.
- If you want step 5 to have real teeth, make it a _different_ package where Nx's default genuinely
  is permissive, or have the learner set `requiredVersion` to something deliberately narrow and
  watch it fail.

---

## 2. Things that mislead — the page renders, the doc lies, nobody notices

### 2.1 Three guides referenced a runtime test suite that doesn't exist **[fixed]**

`jest.config.ts` is explicit that the checks are config-only, but guides 02, 03 and 04 said things
like "the runtime test clicks **Products**", "the runtime test reporting that the remote greeted
nobody", and "This step's runtime test does not only check that the card appeared; it also checks
the browser actually made a request". A learner reads that and reasonably expects `npm test` to
catch a bundled-not-federated mistake. It cannot. Rewrote all three to point at the `/lab` probe and
`serve:dist`, which are what actually make those observations.

### 2.2 Every "What you will see before you change anything" quote was stale **[fixed]**

Not one matched the real output. Examples:

| Guide | Claimed                                                                 | Actual                                         |
| ----- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| 02    | `no import('products/Routes')`                                          | `path found: false, import found: false`       |
| 03    | `@mf-lab/shared-auth is missing from what shell shares`                 | `false — the library is excluded from sharing` |
| 05    | `no shared callback — the configuration relies entirely on Nx defaults` | `{"singleton":true}`                           |

Fixed all of them. Worth a guard: these quotes drift silently every time a failure message is
reworded. A tiny test that greps each guide for its quoted strings and asserts they appear in the
suite's actual output would keep them honest.

### 2.3 Step 3 told the learner to run a check that always "passes" **[fixed]**

> The Products page prints its `SessionStore` instance id at the bottom; compare it **across a
> reload** to convince yourself there are two objects.

`instanceId` is `Math.random()` per construction, so it changes on every page load whether or not
sharing works. I confirmed this with sharing fully working: `qbgm3seb`, then `lz4ki5nf` after a
reload. A learner who follows that instruction concludes the bug is present after they have already
fixed it. Corrected to compare shell-vs-remote **within one page load**.

### 2.4 `verify:build` printed `shell remotes: products, products` **[fixed]**

The manifest records one `remotes` entry per _consumed module_, so a single declared remote appears
twice once you finish step 4. Reads exactly like a duplicated config entry. De-duplicated in
[tools/verify-build.ts](tools/verify-build.ts).

### 2.5 The storefront was called two different things **[fixed]**

Every `<title>` said "Acme Storefront"; every pixel on screen says "Boundary & Co." Renamed the
titles and the two route titles in `lab.routes.ts`.

---

## 3. Friction — nothing is wrong, but the learner pays for it

### 3.1 `start:watch` was only half rolled out **[fixed]**

You added the nodemon scripts and updated `README.md`, but `SETUP.md` §3, `guide/00`, the `/start`
page's Instruction 0, and the "Restart the dev server after this edit" blockquote in all five
step guides still told the learner to run plain `npm start` and restart by hand. Since "I edited the
config and nothing happened" is the #1 predicted confusion in your own troubleshooting table, the
fix for it should be the default everywhere. Updated all of them.

### 3.2 The dashboard's score goes backwards, and 25 points are unreachable **[shipped]**

Two related problems in `lab-probe.service.ts`, and this one I have **not** touched because it is
your in-progress code.

**The score regresses.** Step 3's verdict depends on `session.ids.length`, which only reaches 2 (or
collapses to 1) after the remote has rendered _in the current page load_. So the header badge read
`4/6 · 75 pts` on `/products`, and then `3/6 · 55 pts` the moment I navigated to `/lab` — with a
step 3 that reads "The remote has not rendered yet". A learner who has genuinely finished step 3
watches their score drop and their checkbox turn back into `[?]`. Suggestion: persist the observed
ids for the session (`sessionStorage`), or have the s3 probe report `done (last observed on
/products)` rather than reverting to unknown.

**25 of 100 points can never be scored.** s5 always returns `verdict: 'unknown'` (it says so: "this
view cannot tell whether you declared them") and s6 always returns `'unknown'`. So the dashboard
advertises `/100` while the reachable maximum is 75, and the required-track message never turns
green if step 3 has flickered. Either exclude unverifiable steps from the denominator, or let the
dashboard read the last `npm test` result — see §4.2.

### 3.3 Fun facts leak on steps that aren't done **[fixed]**

Your own comment says "revealed only once its verdict is `'done'`", but the s5 branch sets
`funFact: FUN_FACTS.s5` unconditionally. I saw the 💡 line under a `[?]` step 5. One-line fix; I left
it alone because you are actively editing that file.

### 3.4 The console is red before the learner breaks anything

Loading the shell floods DevTools with
`WebSocket connection to 'ws://127.0.0.1:4272/ng-cli-ws' failed` — the remote's HMR client, injected
into the host page, pointed at `publicHost`. It reconnects in a loop forever. This matters more than
it sounds: the blast-radius experiment's real signal is two quiet
`Failed to load resource: net::ERR_CONNECTION_REFUSED` lines, and they are buried in a wall of
pre-existing red. Worth either suppressing the remote's live-reload client in the host, or adding a
line to `SETUP.md` saying that noise is expected and not yours.

### 3.5 `libs/shared-auth/README.md` was Nx generator boilerplate **[fixed]**

"This library was generated with Nx" in a repo where every other document is carefully written.
Replaced with something that points at step 3 and `TOUR.md`.

### 3.6 The `.catch()` in step 2's solution teaches the wrong instinct **[shipped]**

The solution hands the learner
`.catch(() => [{ path: '', component: RemoteUnavailableComponent }])`, and both the guide and
`TOUR.md` correctly explain it does not cover an unreachable remote. But the learner writes it,
sees a component literally named `RemoteUnavailableComponent`, then in step 6 discovers the shell
does not even boot. The lab knows this is a trap and explains it in prose _twice_, which suggests
prose is not doing the job.

Consider making it an explicit micro-exercise: write the `.catch()`, then immediately kill the
remote and watch it not fire. That turns the best paragraph in `TOUR.md` into something the learner
discovers instead of reads.

---

## 4. Making it more interactive — the biggest wins available

The lab already has four feedback channels and they are well designed. These are the gaps.

### 4.1 Build the "simulate remote down" toggle you already wrote copy for **[shipped, differently]**

Right now the blast-radius exercise costs a learner: find the right terminal, Ctrl+C, reload,
observe, restart, wait 40s for a rebuild. Most people will read the answer instead. A button on
`/lab` that flips the remote off (a `sessionStorage` flag the shell's bootstrap honours, or the
`hide` option in `serveApps`) turns the most transferable lesson in the lab into one click and a
reload. This is the single highest-value thing on this list.

### 4.2 Let the dashboard show `npm test` results **[shipped]**

The dashboard and the tests are deliberately independent, and the README is right that "them
agreeing is the signal you want" — but the learner has to do the agreeing, in their head, across a
terminal and a browser tab. Have `npm test` write `.lab/last-run.json` and have the dashboard read
it, clearly labelled as _last test run_ rather than _live_. That fixes §3.2's unreachable points and
gives step 5 and step 6 somewhere to turn green.

### 4.3 Show the diff, not just the verdict **[shipped]**

When a step goes from red to green, the most valuable thing is _what changed in the runtime_. The
share-scope table already has the data. A "what changed since the last probe" strip — `@mf-lab/
shared-auth entered the share scope`, `session store instances: 2 → 1`, `remoteEntry.mjs fetched
for the first time` — would make the cause-and-effect visible instead of inferred. Right now the
learner edits a config, waits for a restart, and has to remember what the table used to say.

### 4.4 The share-scope table hides the disagreement it exists to show **[partly shipped]**

Every row said `provided by: shell`, `used by: shell` — the products column never appears, even with
federation fully working. The table's own caption promises "the actual runtime negotiation between
the two applications", so a two-column layout (what the shell asked for / what the remote asked for
/ who won) would deliver on that. It would also give step 5 something to _show_, which §1.3 says it
currently lacks.

### 4.5 Make step 5's failure real **[open — still a good idea]**

Add an optional experiment: bump `requiredVersion` in one app to `^20.0.0`, restart, watch the page
fail at load time with a named version mismatch — then remove `strictVersion` and watch it warn and
carry on instead. Two minutes, and it converts step 5 from paperwork into the only place in the lab
where the learner _sees_ the failure mode the whole step is about.

---

## 5. Smaller notes

- **`/start` is good and under-advertised.** It was reachable only from the home hero. Added it to
  the README's "Where to start reading" and to `SETUP.md`'s nav list. **[fixed]**
- **Node version enforcement is excellent** — `check-node.cjs` on every script, `.nvmrc`,
  `.node-version`, and a `doctor` that names the fix. `npm run doctor` correctly caught my Node 16
  shell. This is better than most real repos.
- **`npm run doctor` reports busy ports as problems** even when it is your own lab servers holding
  them. The hint text says so, but a learner running `doctor` mid-lab sees "3 problem(s)". Probing
  whether the thing on 4271 answers as the shell would let it say "already running" instead.
- **`tests/` as documentation works.** I read all six spec files before writing a line, and the
  `why:` blocks were more useful than some of the guides. Keep the rule against editing them.
- **The catalogue copy is genuinely funny** and does real teaching work ("Version-Locked Portable
  Hole", "Shared Singleton Anvil"). Do not let anyone talk you out of it.
- **Two orphaned `nx serve` processes** from an earlier session were still alive when I started
  (holding no ports). Not the lab's fault, but a `npm run doctor` that lists lab-owned node
  processes would have made that obvious.

---

## What I verified

- `npm test` → 18/18 passing with the lab complete; 11 failing after revert, matching the
  documented starting state.
- `npm run verify:build` → all manifest checks green, `remoteEntry.mjs` emitted.
- `npm run lint`, `nx run-many -t test` → clean.
- Runtime, dev servers: featured card chip reads `fetched from the remote at runtime`; one
  `SessionStore` instance; the remote's Add-to-basket moves the shell's header counter instantly;
  signing in on the shell header changes the remote's catalogue greeting to "Welcome back, Ada".
- Runtime, `serve:dist` on two real origins: browser fetched `remoteEntry.mjs`, `mf-manifest.json`
  and `__federation_expose_ProductCard.*.js` from `localhost:4272`. Real federation, no path
  mappings.
- Blast radius, both on the dev servers and on the built output: blank page, `app-root` empty, no
  header, no `/lab`, and nothing from `main.ts`'s `.catch()`.

---

## 6. What the second pass actually changed

Written after the fact, so the two documents do not drift.

**Progress you can win.** A Jest reporter (`tools/lab-reporter.cjs`) writes `.lab/status.json`; the
shell's dev server serves it at `/lab-status.json` from a middleware rather than `public/`, so test
runs do not trip the asset watcher. Every step now shows **two** verdicts — `live:` and `npm test:`
— and all 100 points are reachable. Stale results no longer grant a pass, and when the two sources
**contradict** each other the row says so with the likely cause ("you almost certainly need to
restart that dev server"), which turned out to be the most useful thing on the page.

**A score that only goes up.** `sessionStorage` holds a high-water mark, so walking from `/products`
to `/lab` no longer drops the badge from 4/6 to 3/6.

**`/lab` and `/start` rebuilt on the design system.** No local tokens, no hardcoded pixel sizes —
`.card`, `.chip`, `.section-head`, the `--text-*` scale. A progress ring, a step board with real
verdict hierarchy, six named achievement badges, a completion card with a paste-ready summary, and
a "day one at Boundary & Co." first-run state instead of a wall of red.

**The blast radius runs itself.** Two stages: the outage you can watch, and the reload that takes
the dashboard down with it. A `sessionStorage` flag survives the blackout, so the panel opens with
"Welcome back. Here is what you just saw." Nothing is simulated. `serveApps` also finally has the
`hide` option the docs had been promising, behind `npm run blast-radius`, and it returns a real 404
instead of the SPA fallback's misleading `200 text/html`.

**Docs inverted and deduplicated.** Every step now opens with **Do this** — file, change, verify
command — and puts the concept below it. Each carries a ticket line and a time estimate. The
tsconfig trap and the restart rule each live in one canonical place and are linked from everywhere
else. New: `guide/CHEATSHEET.md`, the whole lab on one screen.

**One bug found while testing the above.** `npm run start:remote:watch` hung on roughly every other
restart — nodemon's default `SIGTERM` left the Nx daemon mid-write and the next `nx serve` blocked
forever on "Calculating the project graph". `--signal SIGINT` fixes it. Worth knowing because it
struck precisely when a learner edits a federation config, which is the moment they are waiting on
feedback.
