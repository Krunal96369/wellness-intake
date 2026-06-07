# Wellness Intake — Working Agreement (read me first)

Guardrails for building this project. These are decisions made *before* coding, so
they don't get re-litigated or quietly broken slice by slice. When something here
conflicts with a quick suggestion, this file wins unless we explicitly change it.

## What we're building

A **config-driven, multi-step "stepper form"** for a wellness product. A user can
create a submission, save partial progress as a **draft**, resume it later, and
**complete** it once required fields are valid; the list shows **progress as
completed-steps / total-steps**. Single implicit user — **no auth** (assume
authenticated). The **backend owns the form config**; the API and UI both derive
everything from it.

## Non-negotiable architecture

- **The config is the contract.** A form is *data* (ordered steps → fields →
  validation rules), stored in the DB and served by the API. No hard-coded fields.
  Adding/removing a step or changing a rule must be a config edit, not a code change.
- **One validation engine, mirrored.** A **pure** module (no Express, no Mongo) is
  the authoritative validator on the backend; the frontend mirrors it for instant
  feedback. **The backend never trusts the client** — every save and submit revalidates.
- **Draft vs submit is one engine + a flag.** Draft = format-check *provided*
  values but tolerate missing required. Submit = enforce everything. Don't write two validators.
- **Snapshot the config version** on each submission, so editing a config later
  never corrupts an in-flight draft.
- **Denormalize progress** (`completedSteps`/`totalSteps`) on the document so the
  list view never loads answers or recomputes.

## Stack (pinned — don't add dependencies casually)

- Frontend: **React 18 + Vite + MUI 6 + TypeScript (strict)**
- Backend: **Node + Express 4 + TypeScript (strict)**, **Mongoose 8**, **Zod** for request-shape parsing
- DB: **MongoDB**
- Not now (unless we agree): auth, a state library, GraphQL, a test framework, real-time/websockets.

## Conventions

- **TS strict both sides.** Shared domain types; frontend types mirror the backend.
- **Errors:** throw a single `ApiError(status, message, fieldErrors?)`; one central
  error-handler middleware; one response shape `{ error, fieldErrors? }`. Wrap every
  async route in an `asyncHandler` so rejections can't hang a request.
- **Validate at the edge with Zod:** request body/query shape → `400`; field-level
  validation failures → `422` (with `fieldErrors`).
- **Comments explain *why*, not *what*.**
- **No secrets in git** — commit only `.env.example`.
- Keep the core **pure and small**; routes just orchestrate (load → validate →
  persist → shape DTO).

## Design system — source of truth is `design-mock/`

Pull exact tokens from `design-mock/colors_and_type.css` into `theme.ts`; don't
eyeball MUI defaults.

- **One accent: teal `#147D6F`.** Everything else neutral — white cards on off-white,
  gray text, thin gray borders. Never a second accent hue.
- **Roboto.** Inputs are **outlined, never filled.** Radii ≈ 8px (inputs/buttons/chips),
  ≈ 12px (cards). **No heavy shadows, no gradients, no imagery.**
- **Sentence-case buttons** ("Save and next", not `SAVE AND NEXT`). Plain noun labels;
  required fields get a trailing ` *`.
- Draft pill = gray; Completed pill = teal. Progress = thin teal bar / teal step underline.

## Fields & validation rules

- Types: **text, select (single + multiple), radio**. Required supported.
- Field rules: `minLength`/`maxLength`, `pattern` (+ message), `numeric`/`integer`,
  `min`/`max`.
- Choice values must be one of the configured options; multi-select must be an array
  with **no unknown values and no duplicates**.
- **Strip unknown answer keys** before persisting (never store arbitrary client keys).

## Edge cases to always handle (the spec grades these)

- Out-of-range `currentStep` → **clamp**, don't trust the client.
- Malformed Mongo `:id` → **400** (map Mongoose `CastError`), not 500.
- Unknown option / malformed value → **422**.
- Missing required on submit → **422** with `fieldErrors`; UI jumps to the first bad step.
- Broken/invalid config → **integrity check → clear 500**, never a crash or a corrupt render.

## Data & queries

- List endpoint: filter by `userId` (+ optional `status`), sort `createdAt` desc,
  **project only the list columns (exclude `answers`)**, use `.lean()`.
- Back it with compound indexes: `{ userId, status, createdAt }` and `{ userId, createdAt }`.
- Recompute progress on every save/submit.

## Anti-goals (resist these)

- No premature abstraction — no generic plugin system, no real-time layer for a
  single-user form.
- Don't leak validation logic into route handlers; it lives in the engine.
- Don't add a library to do what ~20 lines of clear code already does.

## Workflow

- **Contract first:** agree types + endpoint + failure modes before implementing a slice.
- **Build the validation engine first** — everything depends on it.
- **Run before declaring done:** `npm run typecheck`, hit the endpoints (happy *and*
  malformed paths), click the UI. Behavior over vibes.

## Bonus — unsaved changes

Mark a step **dirty** on edit; on close, confirm with **Discard / Keep editing / Save
draft**; add a `beforeunload` guard; and **delete a never-saved empty draft** on discard
so the list stays clean.

## Commands

- backend: `npm run dev | seed | build | start | typecheck`
- frontend: `npm run dev | build | preview`
