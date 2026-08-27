# Step 6 — Write down the design reasoning

**Bonus** · 10 points · checks named `[s6]`

You will edit: `DESIGN.md`

---

## The concept

You have now paid the setup cost of a microfrontend by hand: two builds, a
container, a share scope, a version policy, and one bug that had no error message.
That is the right moment to write down what you think, because you will never
again have such concrete evidence for an opinion about this architecture.

These are the questions a tech lead actually asks — not about syntax, but about
boundaries and failure. None of them has a single right answer, which is exactly
why they are worth writing rather than testing.

One of them asks you to run an experiment first. `TOUR.md` → **Blast radius**
walks you through making the remote's container return 404 and loading the host.
Do it before answering; the result is not what most people predict, and the
explanation is the most transferable thing in this lab.

## Your task

Open **`DESIGN.md`** at the workspace root and answer all six questions under
their existing `##` headings. Delete the italic prompt lines as you go — they do
not count as answers.

A short paragraph each is plenty. Take a position and say what it costs; "it
depends" is only useful if you say what it depends _on_.

A trainer reads what you write here, so this is the one step where the prose is the
deliverable. The test only checks that every heading has a real answer under it —
it is not grading your reasoning, and it cannot.

**What you will see before you change anything:** `6 still unanswered or too short`.

## How to check it

There is a check for this one, but it only looks for real prose:

```bash
npm test -- -t "[s6]"
```

It passes when every `##` heading in `DESIGN.md` has your own writing under it and the italic
prompt lines are gone. It cannot tell you whether your answers are any good — a trainer reads them.

Two dashboard features exist specifically to give you something concrete to write about:

- The **live share scope** table is the evidence for questions 3 and 4. Look at what
  `@angular/core` and `@mf-lab/shared-auth` actually negotiate at runtime.
- The **simulate remote down** toggle is question 5. Click it, watch what breaks and what survives,
  then describe what you saw rather than what you assume would happen.

## Hints

They get more specific. Stop as soon as one is enough.

**1.** Every question maps to something you actually did. Q1 is s1/s3 (a remote vs a library), Q2 is s2, Q3 is s5, Q4 is s3, Q5 is the Blast radius experiment, Q6 is the whole lab.

**2.** For Q5, don't guess — run it. In `lab/serve-dist.ts` the `serveApps` helper takes `{ products: { hide: ['remoteEntry.mjs'] } }`. Serve the shell with that and load it. Then read `TOUR.md` → **Blast radius** for why it happens where it happens.

**3.** Each answer needs at least 25 words of your own prose under its heading. If a question feels unanswerable, that is usually a sign to go back to the relevant step's Concept section — the answer is normally a consequence of something you already made work.

## Solution

This is a lab, not an exam. Reading the solution costs you nothing — but read the _why_ underneath
it, because that is the part the next step assumes you have.

<details>
<summary>Show the solution for step 6</summary>

There is no solution to reveal — these are your opinions, and a trainer responds
to them rather than marking them.

What a strong answer tends to look like, though:

- **Names a tradeoff rather than a benefit.** "Independent deploys, at the cost of
  a runtime contract that no compiler checks" beats "teams can work independently".
- **Refers to something concrete from this workspace.** The s3 bug, the baked-in
  remote URL, the fact that the host would not boot without its remote.
- **Says who decides.** Most microfrontend failures are organisational: nobody owns
  the shared-dependency policy, so it drifts until it breaks.
- **Is willing to argue against the architecture.** For a small team shipping one
  product, this is a lot of machinery to buy very little; saying so is a stronger
  answer than defending it.

If you want a sanity check on Q5: the host does not lose the Products page when the
remote is down — it does not start at all, because webpack initialises every
statically-declared remote while resolving `main.ts`'s `import('./bootstrap')`.
The fix is dynamic remote loading, and the cost is losing build-time type safety on
remote specifiers.

</details>

---

← [Step 5: Pin the framework contract](05-pin-the-framework-contract.md) · [All steps](00-overview.md#the-six-steps)
