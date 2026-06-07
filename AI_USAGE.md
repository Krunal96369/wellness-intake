# AI Usage

This document is an honest account of how I used AI while building the Wellness
Intake stepper form — what it did well, where I had to overrule it, and how I
made sure the result was actually correct rather than just plausible-looking.

My short version: I used AI as a fast, tireless pair-programmer, but I stayed the
architect and the reviewer. Every design decision was mine; AI accelerated the
typing, surfaced options, and caught some of my mistakes. I caught some of its
mistakes too — that back-and-forth is the interesting part, so I've written it
down in detail below.

---

## 1. AI tools I used

| Tool | What I used it for |
| ---- | ------------------ |
| **Claude Code** (Anthropic's CLI, running Claude Opus) | The main driver. Whole-repo context, multi-file edits, running commands, reading errors, iterating. This is where ~90% of the AI work happened. |
| **Claude design skill** (a user-invocable Agent Skill, lives in `design-mock/`) | Turned the assignment's raw step mockups into a documented design system — a token sheet, written visual rules, and a React UI-kit reference — that the app's theme and components were built against. |
| **Claude (chat)** | Rubber-ducking architecture before writing code — "config-driven vs hard-coded steps", how to model progress, where to put the validation boundary. Throwaway thinking, not code. |

I deliberately kept it to one primary tool. Context is the whole game with these
models; jumping between assistants means re-explaining the project every time and
getting inconsistent conventions. Keeping everything in Claude Code meant it
always saw the actual files, the real types, and the last error message — so its
suggestions were grounded in *this* codebase, not a generic one.

---

## 2. My workflow

I didn't "ask AI to build the app." I ran a tight loop, one slice at a time:

1. **Decide the contract myself.** Before any code for a slice, I wrote down the
   shape — the types, the endpoint, the failure modes. This is the part I refused
   to outsource, because if the contract is wrong, fast code just gets you to the
   wrong place faster.
2. **Draft with AI.** Hand Claude Code the contract and the surrounding files;
   let it produce the first implementation.
3. **Read every line.** I treated AI output like a PR from a competent but
   over-eager teammate: assume it's *mostly* right and *occasionally* confidently
   wrong. Nothing got committed unread.
4. **Run it.** `npm run typecheck`, hit the endpoints with `curl`, click through
   the UI. Behaviour over vibes.
5. **Push back / refine.** When something was off, I described the *symptom* and
   made it find the cause, rather than pasting a fix — that's how the subtle bugs
   in section 4 got found instead of papered over.
6. **Tidy.** A dedicated "make this consistent" pass per slice — naming, comments,
   error shape — so quality didn't erode as the file count grew.

Slices, roughly in order: types & validation engine → Mongoose models & indexes →
REST routes → seed/config → frontend list view → dynamic field renderer → the
stepper dialog → the unsaved-changes bonus → an end-to-end edge-case sweep.

I built the **validation engine first, before any UI or routes**, on purpose. It's
the heart of the spec ("invalid fields block submitting," "save partial progress,"
"defensive edge cases"), it's pure and easy to reason about, and once it existed
both the API and the UI could be built *around a thing that was already correct*.

---

## 3. How I used AI to design and architect

The big decisions were mine; I used AI to pressure-test them and then execute.

- **Config-driven, not hard-coded.** The spec says "configs should be managed in
  the backend" and asks for an *extensible* form. I decided early that a form
  should be **data, not code**: the backend owns a `FormConfig` (steps → fields →
  validation rules) and both the API and UI derive everything from it. Adding a
  step or changing a rule is a config edit, zero code. I asked Claude to argue the
  *other* side (hard-coded steps) so I wasn't just confirming my bias — its
  trade-off list (simplicity now vs. extensibility later) confirmed config-driven
  was right for what this assignment is actually testing.
- **One validation engine, two homes.** I wanted instant UI feedback *and* a
  server that never trusts the client — without writing the rules twice and
  letting them drift. So `validation.ts` is a **pure module** (no Express, no
  Mongo) that I mirror on the frontend. The backend is authoritative; the
  frontend is a copy for UX. AI's instinct was to scatter `if (!value) ...` checks
  into the route handlers; I pulled all of it into the pure engine instead.
- **The config is the contract, so snapshot it.** A submission stores the
  `configKey` *and* `configVersion` it was created under. That way, editing the
  config later never corrupts an in-flight draft. AI's first data model didn't
  version the config at all — I added that after thinking through "what happens to
  a half-finished draft when an admin tweaks the form next week."
- **Denormalize progress.** Listing is the hot path. Rather than load every
  submission's answers and recompute "3 of 3 steps" per row, I store
  `completedSteps`/`totalSteps` on the document and recompute them on each
  save/submit. The list endpoint then projects out the heavy `answers` field and
  runs `.lean()` against a compound index. AI's first list handler hydrated full
  documents and computed progress in the response map — correct, but exactly the
  kind of thing the "optimize DB queries" requirement is watching for.

### Design: from raw mockups to a design system

The assignment came with raw screen mockups, not a spec. Rather than eyeball-match
colors and spacing, I used a **Claude design skill** to turn those mockups into a
proper, documented design system — what now lives in `design-mock/`: a token sheet
(`colors_and_type.css`), a written spec of the color / type / spacing / component
rules, and a high-fidelity React UI-kit recreation of the list and the three-step
form.

That gave me an unambiguous source of truth *before* I wrote any app code: the
single teal accent (`#147D6F`), Roboto at specific weights/sizes, outlined (never
filled) inputs, ~8px input/button radii and ~12px card radii, no heavy shadows,
sentence-case buttons, and the draft/completed pill colors. I encoded those tokens
into `theme.ts` and built every component against them, so "match the design"
meant matching a precise spec instead of a vibe. It also let me design the states
the raw mockups didn't cover — open dropdowns, the multi-select goal chips, and the
unsaved-changes dialog — consistently with the rest of the system.

---

## 4. Representative prompts I gave

I didn't keep a literal log, but these are faithful to how I actually prompted —
contract-first, symptom-driven, and asking for reasoning rather than just code.

**Design / architecture**
> "I'm building a config-driven multi-step form. Here are my draft TypeScript
> types for FormConfig / StepConfig / FieldConfig. Poke holes in this shape before
> I build on it — what won't extend cleanly, what's ambiguous?"

> "Make the case *against* config-driven forms here. When would hard-coded steps
> be the better call for a take-home like this?"

> *(design skill)* "Here are the step mockups. Turn them into a design system —
> extract the exact tokens (color, type, spacing, radii), write down the component
> rules, and recreate the screens as a React UI kit I can build against."

**Implementation**
> "Write a pure validation module against these types. Two modes: draft
> (format-check provided values, don't enforce required) and submit (enforce
> everything). No Express, no Mongo — it has to be mirrorable on the frontend."

> "Design the Mongoose schema and indexes for the submissions list query: 'my
> submissions, newest first, optionally filtered by status.' Explain why each
> index earns its place."

**Debugging (symptom, not solution)**
> "PATCH returns 200 and the right JSON, but on the *next* GET the answers are the
> old values — the update didn't stick. Walk me through why, don't just hand me a
> patch."

**Review / cleanup**
> "Review submissions.ts as if it were a PR. Where am I trusting client input?
> Which failure modes return 500 when they should be 400/422? Be specific."

**Edge cases**
> "List every malformed-input case the spec implies — bad step index, unknown
> option, broken config, junk ObjectId — and tell me which ones this code does
> *not* yet handle."

---

## 5. What I changed from the AI output

Plenty. AI gave me strong first drafts; the judgment was in the editing.

- **Pulled validation out of the routes** into the pure engine (above), and made
  draft vs. submit a single `enforceRequired` flag instead of two near-duplicate
  code paths.
- **Tuned the required-field messages to the control type** — radio says "Please
  choose one," select says "Please select an option," text says "Required." AI
  emitted one generic "This field is required" everywhere; the mocks clearly
  wanted control-appropriate copy.
- **Clamped instead of trusting.** AI assigned `currentStep` straight from the
  request body. I changed it to `Math.max(0, Math.min(step, lastStep))` so a
  client can't park a submission on step 9 of a 3-step form.
- **Added `sanitizeAnswers`** to strip any answer keys that aren't declared fields
  before persisting — AI happily stored whatever the client sent into a `Mixed`
  field, which is a quiet way to let junk into the DB.
- **Snapshotted config version** on the submission and made the route load *that*
  version (falling back to active) — not in AI's first model.
- **Restructured the unsaved-changes flow.** AI's first pass was a plain
  `confirm()`. I replaced it with a three-way dialog — **Discard / Keep editing /
  Save draft** — plus a `beforeunload` guard, and the subtle bit: discarding a
  *brand-new, never-saved* draft deletes its empty row so the list stays clean.
- **Design fidelity.** AI's first components were default MUI (blue, elevated
  cards). I replaced the palette/typography with the tokens from the design system
  (§3) — teal `#147D6F`, Roboto, outlined inputs, soft radii, no heavy shadows.
- **Comments with the *why*, not the *what*.** I rewrote AI's narration-style
  comments ("// loop over fields") into ones that explain decisions ("// Draft
  mode: don't enforce required, but reject malformed provided values.").

---

## 6. What AI got wrong (the useful part)

This is where staying in the loop paid off. None of these would have been caught
by "looks right" — only by running it.

1. **Mongoose `Mixed` updates silently didn't persist.** `answers` is
   `Schema.Types.Mixed`. Mongoose can't track in-place mutations on Mixed paths,
   so `sub.answers = {...}; await sub.save()` returned 200 and *did nothing* on
   updates. The fix is `sub.markModified('answers')` before save. AI's code looked
   completely correct and the bug only showed up on the *second* request. I found
   it by prompting with the symptom ("update didn't stick") rather than asking for
   a rewrite. This is the bug I'm most glad I tested for.

2. **Draft save initially blocked on empty required fields.** AI's first
   validation conflated "save progress" with "submit," so you couldn't save a
   half-filled form — which is literally requirement #9. That's what drove the
   `enforceRequired` split: drafts format-check provided values but tolerate
   missing required ones; submit enforces everything.

3. **Malformed ObjectId returned 500.** Hitting `/submissions/not-a-real-id` threw
   a Mongoose `CastError` that fell through to a generic 500. The spec explicitly
   wants defensive handling of invalid input, so I mapped `CastError → 400 Invalid
   identifier` in the central error handler.

4. **Empty-draft clutter.** Because I create the submission the moment "New" is
   clicked (so drafts survive a refresh — requirement #10), opening "New" and
   immediately closing left an empty ghost row in the list. AI didn't anticipate
   this second-order effect of its own (correct) persistence design; I added the
   "delete the row if it was never saved" cleanup, tracked with an `everSaved`
   ref.

5. **Multi-select wasn't defended.** For a `select` with `multiple: true`, AI
   checked that the value was an array but not that every entry was a *known*
   option, nor that there were no duplicates. A crafted request could store
   `["Sleep better", "garbage", "garbage"]`. I tightened the engine to reject
   unknown values and duplicates.

6. **A broken regex in config could crash validation.** AI built `new
   RegExp(rules.pattern)` with no guard. A bad pattern in a config would throw at
   request time. I wrapped it in try/catch (and added the same check to the
   config-integrity pass) so a misconfigured form fails *safe* — and the
   integrity check turns "broken form configuration" into a clear 500 message
   instead of a stack trace.

7. **Over-engineering offers.** A couple of times AI volunteered things I didn't
   ask for — a websocket layer for "live" progress, a generic plugin system for
   field types. I declined. For a single-user take-home, that's complexity with no
   payoff, and unused abstraction is a cost, not a feature.

The meta-lesson: AI is excellent at the *common* case and weakest exactly where
the assignment is graded — the edges. So I spent my review time there.

---

## 7. How I verified correctness

I did not trust "it compiles" or "it looks right." Verification was layered:

- **Types as the first gate.** TypeScript strict on both sides; `npm run
  typecheck` (backend) and the type-check baked into `npm run build` (frontend)
  had to pass before I'd even click through anything. Shared types mean a
  contract change breaks loudly at compile time.
- **API exercised directly with `curl`** — the happy path *and* the nasty path:
  create → save partial → reload → submit incomplete (expect 422 + `fieldErrors`)
  → fix → submit (expect 200). Then the deliberate abuse: junk ObjectId, unknown
  option, out-of-range step, status filter garbage.
- **The persistence bug specifically.** After fixing the `markModified` issue I
  re-ran save → GET → save → GET to confirm updates actually stuck across
  requests, because that's the failure that *looked* fine the first time.
- **Manual UI walkthrough** against the mock: every field type, required blocking
  on Next and on Submit, the first-bad-step jump, draft survives a hard refresh,
  and the full unsaved-changes matrix (X / backdrop / Escape / browser refresh ×
  dirty/clean × new/existing).
- **Edge-case matrix.** I kept a checklist mapped straight to the spec's
  "defensively handle" list and ticked each one off against real behaviour, not
  against the code reading correct.

I treated the spec's edge-case list as my acceptance tests. If I couldn't make it
misbehave, it passed.

---

## 8. Code review and keeping it clean

To stop quality from drifting as the codebase grew, I leaned on AI as a reviewer,
not just an author:

- **"Review this like a PR" passes** on each module, specifically hunting for
  trust-the-client mistakes and wrong status codes. That's how the `CastError` and
  the `sanitizeAnswers` gaps surfaced.
- **One way to do each thing.** Errors always flow through one `ApiError` +
  central handler and come out in one JSON shape (`{ error, fieldErrors? }`).
  Async routes are all wrapped in one `asyncHandler` so a rejected promise can
  never silently hang a request. Request bodies are all parsed with Zod at the
  edge. I had AI enforce these patterns consistently rather than letting each
  route improvise.
- **Pure core, thin edges.** Validation/progress logic is pure and
  framework-free; routes just orchestrate (load → validate → persist → shape).
  Easy to read, easy to test, easy to mirror on the client.
- **Comments earn their place.** They explain *why* a decision was made (why
  clamp, why snapshot the version, why `markModified`), not what the next line
  obviously does.
- **No secrets, no dead code.** Only `.env.example` is committed; I deleted the
  scaffolding AI generated that I didn't end up using.

---

## 9. Where I used judgment / was creative

A few calls that weren't spelled out by the spec and that I think show the
thinking the assignment is asking for:

- **Config versioning + snapshot** so editing a form can't corrupt in-flight
  submissions — a small amount of foresight that makes the "configurable product"
  requirement actually safe in practice.
- **Denormalized progress** as a concrete answer to "optimize DB queries for
  listing": the list view never loads answers or touches the config.
- **Draft vs. submit as one engine with a flag** — the cleanest way I found to
  satisfy "save partial progress" and "invalid fields block completing" without
  two parallel validators that could drift.
- **The unsaved-changes UX** (the bonus): not just a warning, but a *recoverable*
  one — "Save draft" right there in the leave dialog — plus auto-cleanup of empty
  ghost drafts, which is the kind of polish that only shows up once you actually
  use the thing.
- **Control-aware copy and exact design tokens**, because matching the design
  system I generated up front (§3) is part of "UX and flow design."
- **A client-side filter/sort toolbar** for the list — sort (newest/oldest),
  date range (7/30/90 days), and status — kept as pure functions in
  `lib/filters.ts` so the rules are testable and the toolbar stays a thin,
  declarative shell. Small, but it's the difference between a list and a *usable*
  list. (For one user's data, filtering in the browser is instant; the API still
  exposes `?status=` for when the dataset would outgrow that.)

---

## 10. Honest limits

In the interest of transparency:

- The frontend validation rules are a **deliberate mirror** of the backend, not a
  literally shared package. For an assignment this size, a shared npm workspace
  was more ceremony than it's worth; the backend stays authoritative, so the
  worst case of drift is a slightly-late error message, never a bad write.
- I verified with type-checking, `curl`, and thorough manual testing rather than
  an automated test suite. Given more time, the very first thing I'd add is unit
  tests around `validation.ts` — it's pure, it's the riskiest logic, and it's the
  cheapest thing in the codebase to test exhaustively.

Net: AI made me considerably faster, but the parts that make this submission
correct — the architecture, the edge-case handling, and catching the bugs AI
introduced — came from staying engaged and verifying everything against real
behaviour.
