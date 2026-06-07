# How I used AI

The short version: AI did the fast typing and never got bored of my edge cases. I
made the calls. Every architecture decision in here is mine, and a few times AI
nudged toward something I didn't want and I turned it down. It drafted code, argued
the opposite side when I asked, and caught me cutting a corner once or twice. I
caught it being wrong more than that, which is the interesting part, so that's where
most of this doc goes.

If you've only got a minute, skip to the bugs in section 6. That's the bit that
earns the whole "stay in the loop" thing its keep.

---

## 1. Tools

| Tool                                                   | What I used it for                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code** (Anthropic's CLI, running Claude Opus) | The main driver. Whole-repo context, multi-file edits, running commands, reading errors, iterating. Roughly 90% of the AI work happened here.                                                                                                                                                                                                                       |
| **Claude Design** (Anthropic's prototyping tool)       | Turned the assignment's mock images into a documented design system. I gave it the mocks plus context on what I was building, then exported the guideline (tokens, type, spacing, component rules) into `design-mock/`. The PNGs there are screenshots of its output; the React prototype it generated stayed local. `theme.ts` was built from the exported tokens. |
| **Claude (chat)**                                      | Rubber-ducking architecture before any code. Config-driven vs hard-coded steps, how to model progress, where the validation boundary belongs. Throwaway thinking, not code.                                                                                                                                                                                         |

I stayed on one main tool on purpose. Context is the whole game with these models.
Spread the work across three assistants and you lose half the day re-explaining the
project and the other half talking them out of three different naming conventions.
With everything in Claude Code, it was always looking at the real files, the real
types, and the last real error, not a generic version of any of that. That grounding
is most of why its suggestions were useful instead of merely plausible.

---

## 2. The loop I ran

I didn't hand the thing over and wait for a finished app. I worked in slices, same
rhythm every time:

1. **Decide the contract myself, first.** Types, endpoint shape, failure modes, all
   written down before any code. This is the part I refused to delegate. Get the
   contract wrong and all the speed in the world just gets you to the wrong place
   faster.
2. **Let Claude draft it.** Hand over the contract and the surrounding files, and it
   writes the first pass.
3. **Read every line.** I treated its output like a PR from a sharp but over-eager
   teammate: usually right, occasionally confident and wrong. Nothing got committed
   unread.
4. **Run it.** Typecheck, hit the endpoints with `curl`, click through the UI. I
   trust behavior, not vibes.
5. **Push back by symptom, not solution.** When something broke I described what I
   saw and made it find the cause. That one habit is why the subtle bugs surfaced
   instead of getting quietly patched over.
6. **Clean-up pass per slice.** Naming, comments, error shape, all squared away
   before moving on, so quality didn't rot as the files piled up.

Order of slices, roughly: validation engine, then the Mongoose models and indexes,
then the REST routes, then seed and config, then the list view, the dynamic field
renderer, the stepper dialog, the unsaved-changes handling, and finally a sweep for
edge cases across all of it.

I built the validation engine before any UI or route, on purpose. It's the heart of
the spec (invalid fields block submit, drafts save partial progress, bad input
handled defensively), it's pure and easy to hold in your head, and once it existed I
got to build the API and the UI around something that was already known-good.
Starting anywhere else would've meant building on a maybe.

---

## 3. Design and architecture

The big calls were mine. I used AI to poke at them, then to do the typing.

**Config-driven, not hard-coded.** The spec wants the form configurable from the
backend and easy to extend, so a form is data, not code: the backend owns a
`FormConfig` (steps, fields, rules) and both API and UI read from it. Add a step or
change a rule, that's a config edit and nothing more. Before I committed to it I
asked Claude to make the case *for* hard-coded steps instead, just so I wasn't
nodding along with myself. Its argument (simpler now, more painful to extend later)
was exactly the reassurance I was after.

**One validation engine, living in two places.** I wanted instant feedback in the UI
and a server that never trusts the client, without writing the rules twice and
watching them drift apart. So `validation.ts` is pure (no Express, no Mongo) and the
frontend keeps a mirror of it. The backend has the final say; the frontend copy is
purely for UX. Claude's first instinct was to sprinkle `if (!value)` checks through
the route handlers, which works fine right up until the rules drift. I pulled all of
it into the engine.

**The config is the contract, so I snapshot it.** Each submission stores the
`configKey` and `configVersion` it was created under. Edit the form next week and an
in-flight draft still renders and validates against the version it started on.
Claude's first data model didn't version anything. I added it after sitting with one
question: what happens to somebody's half-finished draft when an admin tweaks the
form next Tuesday?

**Denormalized progress.** Listing is the hot path. Instead of loading every
submission's answers and recomputing "2 of 3 steps" per row, I store `completedSteps`
and `totalSteps` on the document and recompute them on each save and submit. The list
endpoint then projects out the heavy `answers` field and runs `.lean()` against a
compound index. Claude's first list handler hydrated full documents and computed
progress in the response map. Correct, sure. Also exactly the thing the "optimize the
queries" requirement is watching for.

### Turning the mockups into a design system

The assignment's design came as mock images in a PDF, not a spec. Rather than eyeball
the colors and hope, I used Claude Design (Anthropic's prototyping tool) to turn them
into a real design system. I gave it the mocks plus context on what I was building, and
exported the guideline into `design-mock/`: the token sheet (`colors_and_type.css`) and
the written rules for color, type, spacing and components. The PNGs in that folder are
screenshots of what it produced; the React prototype it generated stayed local, since
the real app is the deliverable.

That gave me one source of truth before I wrote a line of app code: one teal accent
(`#147D6F`), Roboto at fixed weights, outlined inputs (never filled), ~8px radii on
inputs and buttons, ~12px on cards, no heavy shadows, sentence-case button labels, a
gray draft pill and a teal completed pill. All of it went straight into `theme.ts`,
and every component got built against it, so "match the design" stopped being a
guessing game. It also let me design the states the mockups never showed (open
dropdowns, the multi-select chips, the leave-confirmation dialog) so they'd fit the
rest instead of looking bolted on after the fact.

---

## 4. Prompts, roughly as I gave them

No literal log, but these are true to how I worked: contract first, symptom-driven,
asking for the reasoning more than the code.

**Design and architecture**
> "Here are my draft types for FormConfig / StepConfig / FieldConfig. Poke holes in
> this shape before I build on it. What won't extend cleanly, what's ambiguous?"

> "Argue the case *against* config-driven forms here. When would hard-coded steps be
> the better call for a take-home like this?"

> *(design skill)* "Here are the step mockups. Pull out the exact tokens, write down
> the component rules, and rebuild the screens as a React UI kit I can work against."

**Implementation**
> "Write a pure validation module for these types. Two modes: draft format-checks
> provided values but tolerates missing required; submit enforces everything. No
> Express, no Mongo, has to mirror on the frontend."

> "Design the Mongoose schema and indexes for the list query: my submissions, newest
> first, optional status filter. Tell me why each index earns its place."

**Debugging (symptom, not solution)**
> "PATCH returns 200 with the right JSON, but the next GET shows the old answers. The
> update didn't stick. Walk me through why before you hand me a fix."

> "The delete toast doesn't fade cleanly. It shrinks, I see two icons for a frame, it
> flashes green, then it goes. Find the cause before changing anything."

**A UI change, contract first**
> "Make the delete icon visible on every row all the time, and put a warning dialog in
> front of delete. Then replace the undo flow entirely: on confirm, delete immediately."

**Review**
> "Read submissions.ts like a PR. Where am I trusting client input? Which failures
> return 500 when they should be 400 or 422? Be specific."

**Edge cases**
> "List every malformed-input case the spec implies (bad step index, unknown option,
> broken config, junk ObjectId) and tell me which ones this code doesn't handle yet."

---

## 5. What I changed from the AI drafts

The first drafts were good. The judgment lived in the edits.

- **Moved validation out of the routes** into the pure engine, and folded
  draft-vs-submit into a single `enforceRequired` flag instead of two near-identical
  code paths doing almost the same thing.
- **Tuned the required-field messages to the control.** Radio says "Please choose
  one," select says "Please select an option," text says "Required." Claude handed
  back one generic "This field is required" for everything; the mocks clearly wanted
  copy that fits the control.
- **Clamped the step instead of trusting it.** Claude set `currentStep` straight from
  the request body. I changed it to clamp into range so a client can't park a
  submission on step 9 of a 3-step form.
- **Added `sanitizeAnswers`** to drop any answer keys that aren't declared fields
  before saving. Claude was happy to write whatever the client sent into a `Mixed`
  field, which is a nice quiet way to let junk into your database.
- **Snapshotted the config version** on the submission and made the route load *that*
  version, falling back to active. Wasn't in Claude's first model.
- **Reworked the unsaved-changes flow.** Claude's first pass was a plain `confirm()`.
  I swapped it for a real three-way choice (Discard, Keep editing, Save draft) plus a
  `beforeunload` guard, and the easy-to-miss bit: discarding a brand-new, never-saved
  draft deletes its empty row so the list stays tidy.
- **Replaced the default MUI styling** (blue, elevated cards) with the design tokens:
  teal, Roboto, outlined inputs, soft radii, no heavy shadows.
- **Rewrote the comments.** Claude narrates (`// loop over fields`). I changed them to
  explain decisions (`// Draft mode: don't enforce required, but reject malformed
  provided values.`), which is the only kind of comment worth keeping.

---

## 6. Bugs AI introduced that I caught

This is the section that pays for staying in the loop. Not one of these would've been
caught by "looks right." Every one needed running.

1. **Mixed updates silently didn't persist.** `answers` is `Schema.Types.Mixed`.
   Mongoose can't track in-place mutation on Mixed paths, so `sub.answers = {...};
   await sub.save()` returned a cheerful 200 and changed nothing on updates. The fix
   is `sub.markModified('answers')` before save. The code looked completely correct,
   and the bug only showed up on the *second* request. I found it by handing Claude
   the symptom ("the update didn't stick") instead of asking for a rewrite, and it's
   the one I'm most glad I went looking for.

2. **Draft save blocked on empty required fields.** Claude's first validation
   conflated "save progress" with "submit," so you couldn't save a half-filled form.
   That's requirement #9, more or less verbatim. It's what pushed me to the
   `enforceRequired` split: drafts format-check the values you've given but tolerate
   the ones you haven't; submit enforces everything.

3. **Malformed ObjectId returned 500.** Hitting `/submissions/not-a-real-id` threw a
   Mongoose `CastError` that fell straight through to a generic 500. The spec wants
   bad input handled, so I mapped `CastError` to a 400 in the central handler.

4. **Empty-draft clutter.** I create the submission the moment you click "New," so a
   draft survives a refresh (requirement #10). The side effect: open "New," close it
   right away, and you'd leave a ghost row behind. Claude didn't see the second-order
   effect of its own (correct) persistence design. I added the "delete it if it was
   never saved" cleanup, tracked with an `everSaved` ref.

5. **Multi-select wasn't defended.** For a `multiple` select, Claude checked the value
   was an array but never that each entry was a known option, and didn't reject
   duplicates. A crafted request could happily store `["Sleep better", "garbage",
   "garbage"]`. I tightened the engine to reject unknown values and dupes.

6. **A bad regex in a config could crash validation.** Claude built `new
   RegExp(rules.pattern)` with no guard, so one broken pattern would throw at request
   time. I wrapped it in try/catch (and added the same check to the integrity pass) so
   a misconfigured form fails safe and says something useful instead of dumping a
   stack trace.

7. **The toast flashed green and collapsed on its way out.** This one Claude
   introduced while reworking delete (see section 9). The snackbar's open state was
   wired straight to its content (`open={Boolean(toast)}`) and closing did
   `setToast(null)`, so the instant auto-hide fired the content cleared *mid-fade*:
   the alert lost its message, the icons collapsed, and `severity` fell back to its
   `'success'` default, flashing teal-green for a frame before disappearing. I gave
   Claude the symptom ("it shrinks, two icons, turns green, then fades") instead of a
   fix, and the cause was structural: open-ness and content were the same piece of
   state. The fix splits them, a separate `toastOpen` flag drives the transition, and
   `TransitionProps.onExited` clears the content only after the fade finishes. The
   rewrite read fine; only running it showed the seam.

A couple of times it got enthusiastic and offered things I never asked for: a
websocket layer for "live" progress, a generic plugin system for field types. I
passed on both. For a single-user take-home that's complexity with no payoff, and an
abstraction nobody uses is a cost dressed up as a feature.

The thread running through all of it: AI is great at the common case and shakiest
right where the assignment gets graded, which is the edges. So that's where I spent my
reviewing.

---

## 7. How I made sure it worked

I didn't take "it compiles" or "it looks right" as proof of much. The checking came in
layers.

**Types first.** Strict TypeScript on both sides. `npm run typecheck` on the backend
and the type-check baked into the frontend build both had to pass before I clicked a
single thing. Shared types mean a contract change breaks loudly, at compile time,
where you want it to.

**Then the API, by hand, with `curl`,** the happy path and the nasty one: create, save
partial, reload, submit incomplete (expecting a 422 with `fieldErrors`), fix, submit
(expecting 200). Then the deliberate abuse: junk ObjectId, unknown option,
out-of-range step, a garbage status filter.

**The persistence bug got its own pass.** After the `markModified` fix I re-ran save,
GET, save, GET to confirm the updates really stuck across requests, because that's the
failure that looked perfectly fine the first time around.

**The UI by hand against the mock:** every field type, required blocking on Next and
on Submit, the jump to the first bad step, a draft surviving a hard refresh, and the
whole unsaved-changes matrix (X, backdrop, Escape, browser refresh, crossed with
dirty/clean and new/existing).

I treated the spec's "defensively handle" list as my acceptance tests and ticked each
one off against real behavior. If I couldn't make it misbehave, it passed.

---

## 8. Keeping the code clean

I leaned on AI as a reviewer, not just an author, so the quality didn't quietly erode
as the file count climbed.

**"Review this like a PR" passes** on each module, hunting specifically for
trust-the-client mistakes and wrong status codes. That's how the `CastError` gap and
the `sanitizeAnswers` gap both surfaced.

**One way to do each thing.** Errors all flow through one `ApiError` and one central
handler, and come out in one JSON shape (`{ error, fieldErrors? }`). Async routes are
all wrapped in one `asyncHandler` so a rejected promise can't silently hang a request.
Request bodies all get parsed with Zod at the edge. I had Claude apply those patterns
across the board rather than letting each route freestyle.

**Pure core, thin edges.** The validation and progress logic is framework-free; the
routes just orchestrate (load, validate, persist, shape). Easy to read, easy to test,
easy to mirror on the client.

**Comments earn their place:** why I clamp, why I snapshot the version, why
`markModified`. Not a play-by-play of what the next line obviously does.

**No secrets, no dead code.** Only `.env.example` is committed, and I deleted the
scaffolding Claude generated that I didn't end up using.

---

## 9. Judgment calls I'm happy with

A handful of decisions the spec never spelled out, that I think show the kind of
thinking it's really after:

- **Config versioning and snapshotting**, so editing a form can't corrupt an
  in-flight submission. A little foresight that makes "configurable product" safe in
  practice instead of just on paper.
- **Denormalized progress** as the concrete answer to "optimize the listing query."
  The list never loads answers or touches the config.
- **Draft-vs-submit as one engine with a flag**, the cleanest way I found to satisfy
  both "save partial" and "block completing when invalid" without two validators
  slowly drifting out of sync.
- **The leave dialog offering "Save draft" right there**, plus the auto-cleanup of
  empty ghost drafts. That kind of polish only turns up once you've lived with the
  thing for a few minutes.
- **A guarded delete.** DELETE is permanent with no restore-with-data, so I put a
  warning dialog in front of it: the trash icon now sits visible on every row (it used
  to fade in on hover, easy to miss), clicking it opens a "Delete submission?"
  confirmation, and only on confirm does the row vanish and the request fire. I'd first
  built this as an *undoable* delete instead, deferring the API call behind a
  five-second "Undo" toast so undo cost zero round-trips. It worked, but stacking a
  confirm dialog and a deferred-undo toast is two safety nets for one action, so I cut
  the undo and kept the dialog as the clearer of the two. (The swap is also what
  introduced the toast bug in section 6, bug #7.)
- **A client-side filter and sort toolbar** (newest/oldest, date range, status) kept
  as pure functions in `lib/filters.ts` so the rules are testable and the toolbar
  stays a thin shell. For one user's data, filtering in the browser is instant; the
  API still exposes `?status=` for the day the dataset outgrows that.

---

## 10. What I'd still improve

Where I'll be straight with you:

- The frontend validation is a deliberate mirror of the backend, not a shared package.
  For an assignment this size, a shared workspace was more ceremony than it was worth,
  and since the backend keeps the final say, the worst case of drift is a slightly
  late error message, never a bad write.
- I verified with type-checking, `curl`, and a lot of manual testing, not an automated
  suite. Given more time, the first thing I'd add is unit tests around `validation.ts`.
  It's pure, it's the riskiest logic in the repo, and it's the cheapest thing here to
  test exhaustively.

Net: AI made me a lot faster. But the parts that make this submission correct (the
architecture, the edge cases, the bugs I caught it introducing) came from staying in
it and checking everything against what the thing really did, not what it looked like
it did.
