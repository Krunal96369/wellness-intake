# AI Usage Report

## Overview

- **Date:** 5 June 2026
- **Time spent:** ~2.5 days (architecture planning through final polish)
- **AI tools used:** Claude Code (Anthropic CLI, Claude Opus), Claude Design (Anthropic prototyping tool), Claude chat (architecture rubber-ducking)
- **IDE / environment:** Vs Code with Claude Code CLI



## Tools

| Tool                                                   | What I used it for                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code** (Anthropic's CLI, running Claude Opus) | The main driver. Whole-repo context, multi-file edits, running commands, reading errors, iterating. Roughly 90% of the AI work happened here.                                                                                                                                                                                                                       |
| **Claude Design** (Anthropic's prototyping tool)       | Turned the assignment's mock images into a documented design system. I gave it the mocks plus context on what I was building, then exported the guideline (tokens, type, spacing, component rules) into `design-mock/`. The PNGs there are screenshots of its output; the React prototype it generated stayed local. `theme.ts` was built from the exported tokens. |
| **Claude (chat)**                                      | Designing architecture before any code. Config-driven vs hard-coded steps, how to model progress, where the validation boundary belongs. Throwaway thinking, not code.                                                                                                                                                                                              |

I stayed on one main tool on purpose. Context is the whole game with these models.
Spread the work across three assistants and you lose half the day re-explaining the
project and the other half talking them out of three different naming conventions.
With everything in Claude Code, it was always looking at the real files, the real
types, and the last real error.

---

## Scope of AI Assistance

**Where AI was used:**

- Rubber-ducking architecture decisions before writing code (config-driven vs hard-coded, validation boundary, data model shape)
- Turning the assignment's mock PNGs into a documented design system with tokens, spacing, and component rules (Claude Design)
- Drafting initial implementations of each slice after I defined the contract (types, endpoint shape, failure modes)
- PR-style code review passes to catch trust-the-client mistakes, wrong status codes, and missing edge cases
- Debugging by symptom: I described what I observed and had AI trace the root cause before proposing a fix

**Where AI was not used:**

- Architecture decisions were mine. I decided on config-driven forms, the validation engine boundary, config versioning, and denormalized progress before any code was written
- Final correctness validation was always manual: `npm run typecheck`, `curl` against the API (happy and malformed paths), and clicking through the full UI
- I caught every bug listed in section 6 of `AI_USAGE.md` by running the code, not by reading AI output
- Manual testing against the mock designs, the unsaved-changes matrix, and the full edge-case list from the spec

## Task Understanding

- **Goal:** Build a configurable, multi-step stepper form system where users can create submissions, save partial progress as drafts, resume later, and complete the form once all required fields are valid. The backend owns the form configuration; the frontend renders dynamically from it.
- **Inputs:** A PDF with functional requirements, mock designs for 3 steps (Personal Details, Wellness Preferences, Availability), and a rubric covering UX, code clarity, API/DB modeling, configurability, edge-case handling, and transparent AI usage.
- **Expected output:** A working fullstack app (React + Express + MongoDB) with a GitHub repo, live demo.
- **Constraints / assumptions:** No authentication needed (single implicit user). Free choice of libraries. Must support text, select, and radio field types with required fields and basic validation. Must handle edge cases defensively. AI usage encouraged but must be documented.

## Prompt Log

### Prompt 1

**Intent:** Architecture planning and type design review

**Prompt:**

```text
Here are my draft types for FormConfig / StepConfig / FieldConfig. Poke holes in
this shape before I build on it. What won't extend cleanly, what's ambiguous?

[pasted draft of types.ts with FormConfigShape, StepConfig, FieldConfig,
FieldValidation, Answers, FieldErrors]
```

**AI output summary:**

- Confirmed the shape was solid for the three field types
- Suggested adding `multiple` flag for multi-select and `multiline` for textarea rendering
- Pointed out that `options` should be required for select/radio but optional for text
- Raised the question of how validation rules would compose (e.g., numeric + min/max)

**What was accepted:**

- The `multiple` and `multiline` rendering hints
- The composition model for validation rules (all optional, checked in sequence)

**What was changed or rejected:**

- AI suggested making `options` a discriminated union per field type. I kept it simpler: `options` is optional on the type but enforced at runtime by the integrity checker. A discriminated union would've been more type-safe but added complexity for three field types.

**Reasoning:**

- The integrity checker (`checkConfigIntegrity`) catches missing options at seed/load time anyway, so the runtime safety is there without the type gymnastics.

---

### Prompt 2

**Intent:** Stress-test the config-driven decision

**Prompt:**

```text
Argue the case *against* config-driven forms here. When would hard-coded steps
be the better call for a take-home like this?
```

**AI output summary:**

- Hard-coded steps are simpler to build, easier to reason about, and avoid the indirection of a config layer
- For a take-home with exactly one form and no admin UI, the config layer is technically unnecessary
- The counter-argument: the spec explicitly says "configurable product" and "configs should be managed in the backend," so hard-coding would miss a core requirement

**What was accepted:**

- The reassurance that config-driven was the right call given the spec's language. This wasn't a code change, it was a sanity check before committing to the architecture.

**What was changed or rejected:**

- Nothing changed. The point was to hear the other side so I wasn't just agreeing with myself.

**Reasoning:**

- The spec grades on "designing configurable product" and "dynamic form handling and extensibility." Config-driven is the only answer that scores well on those criteria.

---

### Prompt 3

**Intent:** Build the pure validation engine

**Prompt:**

```text
Write a pure validation module for these types. Two modes: draft format-checks
provided values but tolerates missing required; submit enforces everything. No
Express, no Mongo, has to mirror on the frontend. Here are the types:
[pasted types.ts]
```

**AI output summary:**

- Produced `validateField`, `validateStep`, `validateForm`, `isEmpty`, and `isStepComplete`
- Used an `enforceRequired` boolean flag to toggle draft vs submit behavior
- Included basic text rules (minLength, maxLength, pattern) and option membership for select/radio

**What was accepted:**

- The overall structure: pure functions, `enforceRequired` flag, per-field then per-step then per-form composition
- The `isEmpty` helper treating undefined, null, empty string, and empty array uniformly

**What was changed or rejected:**

- AI's first version had one generic "This field is required" message for all types. I changed it to type-aware messages: radio says "Please choose one," select says "Please select an option," text says "Required." The mocks clearly showed different copy per control.
- AI didn't handle multi-select validation (array of values, unknown entries, duplicates). I added the array check, unknown-value rejection, and duplicate detection.
- AI built `new RegExp(rules.pattern)` without a try/catch. A broken pattern in the config would crash validation at request time. I wrapped it so a misconfigured form fails safe.

**Reasoning:**

- The required-message change was a UX decision from the mocks. The multi-select and regex guards were defensive-coding decisions from the spec's "handle edge cases" requirement.

---

### Prompt 4

**Intent:** Design the data model and indexes

**Prompt:**

```text
Design the Mongoose schema and indexes for the list query: my submissions,
newest first, optional status filter. Tell me why each index earns its place.
```

**AI output summary:**

- Proposed a `Submission` schema with `userId`, `configKey`, `status`, `answers` (Mixed), `currentStep`, `completedSteps`, `totalSteps`, timestamps
- Suggested compound indexes: `{ userId, status, createdAt }` for filtered queries and `{ userId, createdAt }` for unfiltered
- Recommended `.lean()` and field projection for the list endpoint

**What was accepted:**

- The schema shape, the compound indexes, the `.lean()` + projection approach

**What was changed or rejected:**

- AI's first model didn't include `configVersion`. I added `configKey` + `configVersion` as a snapshot so editing a config later can't corrupt an in-flight draft. This was my design decision after asking myself: "What happens to somebody's half-finished draft when an admin tweaks the form next Tuesday?"
- AI's first list handler loaded full documents and computed progress in the response mapper. I changed it to denormalize `completedSteps`/`totalSteps` on the document and recompute on every save, so the list endpoint never touches `answers` or the config.

**Reasoning:**

- Config versioning is the kind of foresight the "configurable product" criterion is testing for.
- Denormalized progress is the concrete answer to the "optimized queries" requirement. The list endpoint should be a single index scan projecting only list-view columns.

---

### Prompt 5

**Intent:** Build the submission CRUD routes

**Prompt:**

```text
Implement the Express routes for submissions: list, create, get, save (PATCH),
submit, delete. Use the validation engine, Zod for request shape, asyncHandler
for error propagation, and ApiError for typed responses. Here's the contract:
[pasted route signatures, expected status codes, error shapes]
```

**AI output summary:**

- Produced working routes for all six endpoints
- Used Zod schemas for request body parsing
- Called the validation engine for save and submit

**What was accepted:**

- The overall route structure and Zod integration
- The `asyncHandler` wrapping pattern

**What was changed or rejected:**

- AI set `currentStep` directly from the request body. I changed it to clamp into `[0, lastStep]` so a client can't park a submission on step 9 of a 3-step form.
- AI wrote whatever the client sent into the `answers` Mixed field. I added `sanitizeAnswers` to strip any keys not declared in the config before persisting.
- AI's first version didn't call `sub.markModified('answers')` before save. Mongoose can't track in-place mutation on Mixed paths, so updates silently didn't persist. This was the most important bug I caught (see Prompt 7).

**Reasoning:**

- Clamping and sanitizing are both from the "defensively handle edge cases" requirement. The `markModified` fix was caught by actually running the code, not by reading it.

---

### Prompt 6

**Intent:** Design system extraction from mock images

**Prompt (to Claude Design):**

```text
Here are the step mockups from the assignment PDF. Pull out the exact tokens
(colors, type, spacing, radii, shadows), write down the component rules, and
rebuild the screens as a React UI kit I can work against.
```

**AI output summary:**

- Extracted teal `#147D6F` as the single accent, Roboto font family, outlined (never filled) inputs
- Documented radii (~8px inputs/buttons, ~12px cards), no heavy shadows, sentence-case button labels
- Generated a CSS token sheet and component-level rules (draft pill = gray, completed pill = teal, etc.)
- Built a React prototype of the three steps

**What was accepted:**

- The full token set went into `theme.ts`
- The component rules (outlined inputs, soft radii, pill colors, button casing)
- The design system let me handle states the mocks never showed (open dropdowns, multi-select chips, leave-confirmation dialog) in a way that fits the rest

**What was changed or rejected:**

- The React prototype stayed local. The real app is the deliverable; the prototype was just a reference.
- I adjusted some spacing values after seeing them in the actual MUI components (MUI's default padding differs from raw CSS).

**Reasoning:**

- Starting from extracted tokens instead of eyeballing meant "match the design" was a lookup, not a guessing game. Every component was built against one source of truth.

---

### Prompt 7

**Intent:** Debug the silent persistence failure

**Prompt:**

```text
PATCH returns 200 with the right JSON, but the next GET shows the old answers.
The update didn't stick. Walk me through why before you hand me a fix.
```

**AI output summary:**

- Identified that `answers` is `Schema.Types.Mixed` and Mongoose can't detect in-place mutations on Mixed paths
- Explained the Mongoose change-tracking model: for subdocuments and typed paths, Mongoose diffs automatically; for Mixed, it doesn't know the shape and can't tell what changed
- The fix: call `sub.markModified('answers')` before `await sub.save()`

**What was accepted:**

- The root cause explanation and the `markModified` fix

**What was changed or rejected:**

- Nothing rejected. But I re-ran save → GET → save → GET to confirm updates really stuck across multiple requests, because this failure had looked perfectly fine the first time.

**Reasoning:**

- This was the bug that justified staying in the loop. The code looked completely correct. The JSON response after PATCH was correct. Only running a second request revealed the data wasn't actually persisted. No amount of code review catches this one.

---

### Prompt 8

**Intent:** Debug the toast animation glitch

**Prompt:**

```text
The delete toast doesn't fade cleanly. It shrinks, I see two icons for a frame,
it flashes green, then it goes. Find the cause before changing anything.
```

**AI output summary:**

- Traced it to the snackbar's open state being tied to its content (`open={Boolean(toast)}`). Closing set `setToast(null)`, which cleared the message and severity mid-fade.
- With no message, the Alert collapsed; with no severity, it defaulted to `'success'` (teal/green), causing the flash.
- The fix: split open-ness from content. A separate `toastOpen` flag drives the transition; `TransitionProps.onExited` clears content only after the fade finishes.

**What was accepted:**

- The root cause analysis and the split-state fix

**What was changed or rejected:**

- Nothing rejected. The structural issue (open-ness and content sharing one piece of state) was clearly the problem.

**Reasoning:**

- Another case where the code read fine but only running it showed the seam. The symptom-first approach ("describe what you see, not what you think is wrong") was key to getting a useful diagnosis.

---

### Prompt 9

**Intent:** PR-style review pass

**Prompt:**

```text
Read submissions.ts like a PR. Where am I trusting client input? Which failures
return 500 when they should be 400 or 422? Be specific.
```

**AI output summary:**

- Flagged that Mongoose `CastError` on malformed ObjectIds fell through to a generic 500
- Noted that the error handler should map `CastError` to 400
- Pointed out that client-supplied answer keys weren't being stripped

**What was accepted:**

- Added `CastError` mapping to 400 in the central error handler
- Added `sanitizeAnswers` to strip unknown keys before persisting

**What was changed or rejected:**

- AI also suggested adding request-rate limiting, which I skipped. For a single-user take-home, it's complexity with no payoff.

**Reasoning:**

- The CastError gap is exactly the kind of thing the spec's "defensively handle edge cases" tests for. The sanitization prevents a quiet data-integrity leak.

---

### Prompt 10

**Intent:** Edge-case audit

**Prompt:**

```text
List every malformed-input case the spec implies (bad step index, unknown
option, broken config, junk ObjectId) and tell me which ones this code doesn't
handle yet.
```

**AI output summary:**

- Listed ~12 cases including out-of-range step, unknown select/radio option, duplicate multi-select values, missing required on submit, broken regex in config, empty config (no steps), junk ObjectId
- Identified that multi-select duplicate detection and regex pattern guarding were missing

**What was accepted:**

- Added duplicate rejection in multi-select validation
- Added try/catch around `new RegExp(rules.pattern)` in both the validation engine and the integrity checker

**What was changed or rejected:**

- AI suggested adding a "field type not recognized" error that would reject the whole form. I changed it to fail safe (return null, skip the field) since an unknown type in config shouldn't crash validation for every other field.

**Reasoning:**

- Fail-safe over fail-hard for config issues. A broken config should surface as a clear error via the integrity checker, not as a cascade of validation failures.

---

### Prompt 11

**Intent:** Unsaved-changes UX implementation

**Prompt:**

```text
Implement unsaved-changes handling: mark dirty on edit, confirm on close with
Discard / Keep editing / Save draft, add beforeunload, and clean up empty
never-saved drafts on discard so the list stays tidy.
```

**AI output summary:**

- Produced a `dirty` state flag, a `confirmClose` dialog, and a `beforeunload` event listener
- Created the three-way choice dialog (Discard / Keep editing / Save draft)

**What was accepted:**

- The overall flow and the `beforeunload` guard
- The three-way dialog structure

**What was changed or rejected:**

- AI's first version used `window.confirm()` instead of a real dialog. I replaced it with the MUI Dialog matching the design system.
- AI missed the ghost-draft cleanup: opening "New" then immediately closing would leave an empty row. I added the `everSaved` ref and the delete-on-discard logic for never-saved drafts.

**Reasoning:**

- The ghost-draft issue is a second-order effect of the persistence design (creating the submission immediately so it survives refresh). You only notice it by living with the app for a few minutes.

---

### Prompt 12

**Intent:** Delete UX redesign

**Prompt:**

```text
Make the delete icon visible on every row all the time, and put a warning dialog
in front of delete. Then replace the undo flow entirely: on confirm, delete
immediately.
```

**AI output summary:**

- Moved the delete icon from hover-only to always-visible
- Added a confirmation dialog ("Delete submission? This can't be undone.")
- Removed the deferred-undo toast pattern

**What was accepted:**

- The always-visible icon and the confirmation dialog pattern

**What was changed or rejected:**

- I'd originally built this as an undoable delete (deferring the API call behind a 5-second "Undo" toast). It worked, but stacking a confirm dialog and a deferred undo is two safety nets for one action. I cut the undo and kept the dialog as the clearer of the two.
- This swap is what introduced the toast animation bug (Prompt 8).

**Reasoning:**

- Simplicity. One clear safety net (the dialog) is better UX than two overlapping ones.

## Code Areas Influenced by AI

| Area                | AI contribution                                                   | Final human judgment applied                                                                |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Project setup       | Scaffolded Express app, Vite config, tsconfig, package.json       | Pinned exact dependency versions, added Vercel config, set up proxy                         |
| Type definitions    | Drafted initial `types.ts` for both sides                         | Added `configVersion`, `multiple`/`multiline` flags, and `FieldErrors` shape                |
| Validation engine   | Wrote first pass of `validateField`/`validateStep`/`validateForm` | Added type-aware required messages, multi-select defense, regex guarding, `sanitizeAnswers` |
| Mongoose models     | Drafted schemas and indexes                                       | Added config versioning, denormalized progress, compound index justification                |
| Express routes      | Implemented all six CRUD endpoints                                | Added step clamping, answer sanitization, `markModified`, config version snapshotting       |
| Design system       | Extracted tokens from mock PNGs (Claude Design)                   | Tuned spacing for MUI, designed states mocks didn't show (dropdowns, chips, dialogs)        |
| React components    | Drafted FormDialog, DynamicField, SubmissionRow, Stepper          | Rewrote unsaved-changes flow, fixed ghost-draft cleanup, replaced confirm() with dialog     |
| Client-side filters | Drafted filter/sort functions and FilterMenu component            | Kept as pure functions in `lib/filters.ts`, verified derivation logic manually              |
| Error handling      | Drafted `ApiError`, `asyncHandler`, central error handler         | Added `CastError` mapping to 400, ensured one consistent error shape everywhere             |
| Documentation       | Drafted sections of README and CLAUDE.md                          | Rewrote all comments to explain "why" not "what", wrote AI_USAGE.md entirely myself         |

## Manual Changes Made After AI Output

- **Moved validation out of route handlers** into the pure engine with the `enforceRequired` flag, preventing two near-identical code paths from drifting
- **Added `markModified('answers')`** after discovering the Mongoose Mixed-path persistence bug through manual testing
- **Added `sanitizeAnswers`** to strip arbitrary client-supplied keys before persisting
- **Added config version snapshotting** (`configKey` + `configVersion` on each submission) so editing a config can't corrupt in-flight drafts
- **Clamped `currentStep`** to `[0, lastStep]` instead of trusting the client value
- **Rewrote required-field messages** to match the control type (radio/select/text)
- **Added multi-select defense:** unknown-value rejection and duplicate detection
- **Wrapped regex pattern construction** in try/catch in both the validator and the integrity checker
- **Replaced `window.confirm()`** with a proper three-way MUI dialog for unsaved changes
- **Added ghost-draft cleanup:** `everSaved` ref tracks whether a new draft was ever persisted; discarding a never-saved draft deletes its empty row
- **Fixed the toast animation bug** by splitting open-ness from content state
- **Rewrote all comments** from narration ("loop over fields") to decisions ("Draft mode: don't enforce required, but reject malformed provided values")
- **Replaced default MUI styling** (blue, elevated cards) with the design-system tokens (teal, Roboto, outlined inputs, soft radii)
- **Deleted scaffolding** Claude generated that wasn't used (websocket layer suggestion, plugin system suggestion)

## Validation and Verification

- **Type checking:** `npm run typecheck` on the backend, type-check baked into `npm run build` on the frontend. Both had to pass before manual testing.
- **API testing with `curl`:** Happy path (create → save partial → reload → submit) and deliberate abuse (junk ObjectId, unknown option, out-of-range step, garbage status filter, submitting with missing required fields).
- **Persistence bug verification:** After the `markModified` fix, re-ran save → GET → save → GET to confirm updates stuck across multiple requests.
- **UI testing against the mocks:** Every field type, required blocking on Next and Submit, jump to first bad step on submit failure, draft surviving hard refresh.
- **Unsaved-changes matrix:** Tested X button, backdrop click, Escape key, and browser refresh, crossed with dirty/clean state and new/existing submissions.
- **Edge-case checklist:** Treated the spec's "defensively handle" list as acceptance criteria and verified each one against real behavior.
- **No automated test suite** (acknowledged tradeoff). The validation engine is pure and would be the first thing to get unit tests given more time.

## Tradeoffs and Decisions

- **Config-driven over hard-coded:** More indirection, but the spec explicitly requires configurability. Adding a step or changing a rule is a config edit, not a code change.
- **One validation engine with a flag over two validators:** Draft and submit share the same code path with `enforceRequired` toggling the missing-field check. This prevents drift between two near-identical validators.
- **Denormalized progress over computed:** The list endpoint never loads answers or recomputes progress. Costs a recompute on every save/submit, but saves on every list fetch, which is the hot path.
- **Frontend validation mirror over shared package:** For this size, a shared npm workspace was more ceremony than value. The backend has the final say; the worst case of drift is a slightly late error message, never a bad write.
- **Client-side filtering over server-side:** One user's data is small enough to filter in the browser. The API still exposes `?status=` for the day the dataset outgrows that.
- **Confirmation dialog over undoable delete:** One clear safety net beats two overlapping ones. The dialog is more discoverable and easier to reason about.
- **Rejected AI suggestions:** Declined a websocket layer for "live" progress and a generic plugin system for field types. For a single-user take-home, these are complexity with no payoff.

## Risks and Limitations

- Frontend validation is a deliberate mirror, not a shared package. Drift is possible but bounded (backend always has the final say).
- No automated test suite. The validation engine is pure and the cheapest thing to test exhaustively; it would be the first addition given more time.
- The config integrity checker runs at read time, not write time. A bad config edit would surface on the next API call, not at seed time (though the seed script does check).
- No auth. The implicit `local-user` userId is a placeholder. Adding auth would require indexing changes and token middleware but no schema changes.

## Final Declaration

AI was used as a development assistant for architecture discussion, initial code drafting, design-system extraction, debugging (symptom-driven, not solution-driven), and PR-style review. All architecture decisions, edge-case handling, and final correctness validation were performed manually. Every AI-generated suggestion was treated as a draft from a capable but over-eager teammate: usually right, occasionally confident and wrong, and always read line-by-line before committing. The bugs documented in AI_USAGE.md sections 5 and 6 were caught by running the code, not by reviewing AI output.



### Rejected suggestions

- **Websocket layer for real-time progress:** Unnecessary for a single-user form. Adds dependency and complexity with zero user-facing benefit.
- **Generic plugin system for field types:** Three field types don't justify a plugin architecture. An abstraction nobody uses is a cost dressed up as a feature.
- **Discriminated union for field types:** More type-safe but adds complexity. The runtime integrity checker catches the same issues without the TypeScript gymnastics.
- **Request rate limiting:** Irrelevant for a single-user take-home.

### Testing commands used

```bash
# Type checking
cd backend && npm run typecheck
cd frontend && npm run build  # includes tsc --noEmit

# Seed and start
cd backend && npm run seed && npm run dev

# API smoke tests
curl http://localhost:4000/api/health
curl http://localhost:4000/api/configs/wellness-intake
curl http://localhost:4000/api/submissions

# Malformed input tests
curl http://localhost:4000/api/submissions/not-a-real-id          # expect 400
curl http://localhost:4000/api/submissions?status=garbage          # expect 400
curl -X PATCH http://localhost:4000/api/submissions/<id> \
  -H 'Content-Type: application/json' \
  -d '{"answers":{"gender":"InvalidOption"}}'                     # expect 422
curl -X POST http://localhost:4000/api/submissions/<id>/submit \
  -H 'Content-Type: application/json' \
  -d '{"answers":{}}'                                              # expect 422 with fieldErrors
```
