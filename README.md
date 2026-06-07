# Wellness Intake — Stepper Form

A configurable, multi-step intake form for a mental-wellness product. Users can
start a new submission, fill it out step by step, save partial progress as a
draft, revisit drafts later, and complete the form once every required field is
valid. The form itself is **config-driven**: the backend owns the form
definition (steps, fields, validation rules), and both the API and the UI derive
everything they do from that single source of truth.

> Built as a take-home assignment. Single implicit user (no auth).

---

## Table of contents

- [Wellness Intake — Stepper Form](#wellness-intake--stepper-form)
  - [Table of contents](#table-of-contents)
  - [Highlights](#highlights)
  - [Tech stack](#tech-stack)
  - [Architecture](#architecture)
  - [Project layout](#project-layout)
  - [Running locally](#running-locally)
    - [Prerequisites](#prerequisites)
    - [1. Backend](#1-backend)
    - [2. Frontend](#2-frontend)
    - [Useful scripts](#useful-scripts)
  - [Environment variables](#environment-variables)
  - [API reference](#api-reference)
  - [Data model \& query optimization](#data-model--query-optimization)
  - [List filtering \& sorting](#list-filtering--sorting)
  - [Validation \& edge cases](#validation--edge-cases)
  - [Bonus: unsaved-changes handling](#bonus-unsaved-changes-handling)
  - [Deployment](#deployment)
    - [Database — MongoDB Atlas](#database--mongodb-atlas)
    - [Backend — Render / Railway / Fly (any Node host)](#backend--render--railway--fly-any-node-host)
    - [Frontend — Vercel / Netlify (static)](#frontend--vercel--netlify-static)
  - [Project conventions](#project-conventions)

---

## Highlights

- **Config-driven forms** — a form is just data. Add/remove steps and fields, or
  change validation, by editing one config document; the UI and API adapt with
  no code changes.
- **One validation engine, two homes** — the exact same rules run on the backend
  (authoritative) and the frontend (instant feedback). Invalid fields block
  saving/completing in both places.
- **Draft persistence** — a submission is created in the database the moment you
  start it, so progress survives a page refresh, a closed tab, or a different
  device.
- **Optimized listing** — the list endpoint projects only the columns it needs,
  uses `.lean()`, and is backed by compound indexes; progress
  (completed steps / total steps) is denormalized so listing never joins or
  recomputes.
- **Filter & sort the list** — a toolbar sorts by newest/oldest and filters by
  date range (7 / 30 / 90 days) and status, applied client-side over the loaded
  rows, with a "Clear" affordance when any filter is active.
- **Defensive by default** — malformed values, unknown options, missing required
  fields, out-of-range steps, bad IDs, and broken configs all return clear,
  typed errors instead of crashing.
- **Bonus** — the form shows when a step has unsaved edits and warns before you
  navigate away (both in-app and at the browser level).
- **TypeScript end to end**, matching the `design-mock/` design system (teal
  `#147D6F` accent, Roboto, outlined inputs, soft radii, no heavy shadows).

---

## Tech stack

| Layer      | Choice                                                                           |
| ---------- | -------------------------------------------------------------------------------- |
| Frontend   | React 18, Vite, Material UI 6, TypeScript                                        |
| Backend    | Node.js, Express 4, TypeScript                                                   |
| Database   | MongoDB with Mongoose 8                                                          |
| Validation | Hand-written engine mirrored on both sides; Zod guards request shapes on the API |

---

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │            MongoDB                  │
                    │  formconfigs   submissions          │
                    └───────────────────────────┬─────────┘
                                    ▲           │
                                    │           │
                          (reads config)   (reads/writes submissions,
                                    │        progress denormalized)
                    ┌───────────────┴───────────▼──────────┐
                    │        Express API (TypeScript)      │
                    │  /api/configs      /api/submissions  │
                    │  validation.ts ← authoritative rules │
                    └───────────────▲──────────────────────┘
                                    │ JSON over HTTP
                          (dev: Vite proxies /api → :4000)
                    ┌───────────────┴───────────────────────┐
                    │      React + MUI app (TypeScript)     │
                    │  validation.ts ← same rules, instant  │
                    │  DynamicField renders from config     │
                    └───────────────────────────────────────┘
```

**The config is the contract.** A `FormConfig` describes ordered `steps`, each
with `fields`. A field has a `type` (`text` | `select` | `radio`), a `required`
flag, and optional `validation` (min/max length, regex, numeric/integer range,
option membership). The backend validates against it; the frontend renders and
pre-validates against the same shape. Submissions snapshot the `configKey` and
`configVersion` they were created under, so changing a config later never
corrupts in-flight submissions.

---

## Project layout

```
wellness-intake/
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express app + server bootstrap
│   │   ├── db.ts               # Mongoose connection
│   │   ├── http.ts             # ApiError, asyncHandler, error handler
│   │   ├── types.ts            # Shared domain types
│   │   ├── validation.ts       # Authoritative validation engine
│   │   ├── seedConfig.ts       # The Wellness Intake config (3 steps)
│   │   ├── seed.ts             # Idempotent seed (config + sample data)
│   │   ├── models/
│   │   │   ├── FormConfig.ts   # Config schema + indexes
│   │   │   └── Submission.ts   # Submission schema + indexes
│   │   └── routes/
│   │       ├── configs.ts      # GET configs
│   │       └── submissions.ts  # CRUD + submit
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx            # Theme provider + mount
│   │   ├── App.tsx             # List view + filter/sort toolbar + dialog wiring
│   │   ├── theme.ts            # Design tokens → MUI theme
│   │   ├── types.ts            # Mirrors backend types + DTOs
│   │   ├── validation.ts       # Frontend mirror of the rules
│   │   ├── api/client.ts       # Typed fetch client
│   │   ├── lib/filters.ts      # Pure client-side sort/date/status filtering
│   │   └── components/
│   │       ├── FormDialog.tsx  # The dynamic stepper form
│   │       ├── DynamicField.tsx# FieldConfig → MUI control
│   │       ├── FilterMenu.tsx  # Reusable filter dropdown (sort/date/status)
│   │       ├── Stepper.tsx, StatusPill.tsx, ProgressBar.tsx,
│   │       └── SubmissionRow.tsx
│   ├── .env.example
│   └── package.json
└── design-mock/                # Design system — tokens, CSS, UI kit (reference)
```

---

## Running locally

### Prerequisites

- **Node.js 18+** and npm
- **MongoDB** running locally on `localhost:27017` (a local install / running
  service is fine; no replica set required)

### 1. Backend

```bash
cd backend
cp .env.example .env          # Windows: copy .env.example .env
npm install
npm run seed                  # creates the config + 3 sample submissions
npm run dev                   # API on http://localhost:4000
```

You should see `[mongo] connected` and `[api] listening on http://localhost:4000`.
Sanity check: `curl http://localhost:4000/api/health` → `{"ok":true}`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # optional for local dev; defaults work
npm install
npm run dev                   # app on http://localhost:5173
```

Open **http://localhost:5173**. In development the Vite dev server proxies
`/api/*` to the backend on port 4000, so there is no CORS setup to worry about.

### Useful scripts

| Location | Command             | What it does                                  |
| -------- | ------------------- | --------------------------------------------- |
| backend  | `npm run dev`       | API with hot reload (tsx watch)               |
| backend  | `npm run seed`      | Seed config + sample submissions (idempotent) |
| backend  | `npm run build`     | Compile TypeScript to `dist/`                 |
| backend  | `npm start`         | Run the compiled server                       |
| backend  | `npm run typecheck` | Type-check without emitting                   |
| frontend | `npm run dev`       | Vite dev server                               |
| frontend | `npm run build`     | Type-check + production build to `dist/`      |
| frontend | `npm run preview`   | Preview the production build                  |

---

## Environment variables

**Backend (`backend/.env`)**

| Variable      | Default                                     | Notes                           |
| ------------- | ------------------------------------------- | ------------------------------- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/wellness-intake` | Connection string               |
| `PORT`        | `4000`                                      | API port                        |
| `CORS_ORIGIN` | `http://localhost:5173`                     | Comma-separated allowed origins |

**Frontend (`frontend/.env`)**

| Variable            | Default (dev) | Notes                                                                                                                        |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | *(empty)*     | Empty → use `/api` via the Vite proxy. In production, set to the deployed API origin (e.g. `https://your-api.onrender.com`). |

---

## API reference

Base path: `/api`. All bodies are JSON.

| Method | Path                      | Purpose                                                  |
| ------ | ------------------------- | -------------------------------------------------------- |
| GET    | `/health`                 | Liveness check                                           |
| GET    | `/configs`                | List active configs (lightweight)                        |
| GET    | `/configs/:key`           | Active config for a key (404 missing, 500 if broken)     |
| GET    | `/submissions`            | List submissions; optional `?status=draft                | completed` |
| POST   | `/submissions`            | Create a new empty draft (`{ "configKey": "..." }`)      |
| GET    | `/submissions/:id`        | Full submission (answers, step, progress)                |
| PATCH  | `/submissions/:id`        | Save draft (merge answers, set step) — 422 on bad values |
| POST   | `/submissions/:id/submit` | Complete the form — 422 with `fieldErrors` if invalid    |
| DELETE | `/submissions/:id`        | Delete a submission                                      |

Errors are consistent JSON: `{ "error": "message", "fieldErrors"?: { "<fieldId>": "..." } }`.
The list endpoint returns denormalized progress per row:
`{ id, title, status, currentStep, progress: { completed, total }, createdAt, updatedAt }`.

---

## Data model & query optimization

**`Submission`** stores `userId` (defaults to the single local user),
`configKey` + `configVersion` (snapshot), `title`, `status`, `answers`,
`currentStep`, `maxStepReached`, and **denormalized** `completedSteps` /
`totalSteps`. Progress is recomputed by the validation engine on every save and
submit, so the list view never has to load answers or recompute anything.

Indexes:

- `Submission`: `{ userId, status, createdAt }` and `{ userId, createdAt }` —
  cover both the status-filtered (`GET /submissions?status=`) and the unfiltered
  list queries, already sorted newest-first. The current UI fetches the
  unfiltered list and filters client-side (see below), but the endpoint and these
  indexes support server-side `?status=` filtering for when the dataset grows.
- `FormConfig`: `{ key, version }` unique, and `{ key, isActive }` for the
  "active config for this key" lookup.

The list query additionally **projects only the columns the list needs**
(excludes `answers`) and uses `.lean()` to skip Mongoose hydration.

---

## List filtering & sorting

The list view has a small toolbar with three independent controls, all applied
**client-side** over the already-fetched rows. The dataset is a single user's
submissions, so filtering in the browser keeps the UI instant and avoids extra
round-trips:

- **Sort** — newest or oldest first.
- **Date range** — any time, or the last 7 / 30 / 90 days.
- **Status** — all, drafts only, or completed only.

The rules live in pure functions in `lib/filters.ts` (`applyFilters`,
`hasActiveFilters`) so they're easy to reason about and test, while the toolbar
(`FilterMenu.tsx`) stays a thin, declarative shell. A **Clear** affordance
appears whenever any control differs from its default. (The API also supports
server-side `?status=` filtering for larger datasets — the UI just doesn't need
it at this scale.)

---

## Validation & edge cases

A single engine (`validation.ts`, mirrored on both sides) handles:

- **Required fields** with type-aware messages (radio → "Please choose one",
  select → "Please select an option", text → "Required").
- **Text rules**: min/max length, regex pattern, numeric, integer, min/max value.
- **Choice rules**: value must be one of the configured options; multi-select
  must be an array with no duplicates or unknown values.
- **Draft vs submit**: drafts allow missing required fields but still reject
  *malformed* values; submitting enforces everything.

Defensive handling that has been verified end to end:

| Case                                    | Result                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Age out of range while saving a draft   | `422` with a field error                                                       |
| Unknown select/radio option             | `422` (rejected, not stored)                                                   |
| Submitting with required fields missing | `422` with `fieldErrors`; UI jumps to the first bad step                       |
| `currentStep` out of range              | Clamped to a valid step                                                        |
| Malformed Mongo `:id`                   | `400` (CastError mapped)                                                       |
| Broken/invalid config                   | Integrity check → `500` with a clear message instead of serving a corrupt form |
| Unknown answer keys                     | Stripped before persisting                                                     |

---

## Bonus: unsaved-changes handling

- Editing a field marks the step **dirty**.
- Trying to close the dialog (X, backdrop, or Escape) with unsaved edits opens a
  confirmation offering **Discard / Keep editing / Save draft**.
- A `beforeunload` listener warns before a browser refresh or tab close while
  there are unsaved changes.
- Discarding a brand-new, never-saved draft deletes its empty row so the list
  stays clean.

---

## Deployment

The app is deploy-ready; nothing in the code assumes a specific host. A common,
free-tier-friendly setup:

### Database — MongoDB Atlas

1. Create a free cluster and a database user.
2. Allow access from your hosting provider (or `0.0.0.0/0` for a quick start).
3. Copy the `mongodb+srv://...` connection string.

### Backend — Render / Railway / Fly (any Node host)

- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- **Environment:**
  - `MONGODB_URI` = your Atlas connection string
  - `PORT` = provided by the host (the app reads `process.env.PORT`)
  - `CORS_ORIGIN` = your deployed frontend URL (e.g. `https://wellness-intake.vercel.app`)
- After the first deploy, run the seed once to create the config:
  `npm run seed` (as a one-off job, or temporarily locally pointed at Atlas).

### Frontend — Vercel / Netlify (static)

- **Build:** `npm install && npm run build`
- **Output directory:** `dist`
- **Environment:** `VITE_API_BASE_URL` = your deployed backend origin
  (e.g. `https://wellness-intake-api.onrender.com`).

Once both are live, make sure the backend's `CORS_ORIGIN` lists the frontend URL
and the frontend's `VITE_API_BASE_URL` points at the backend.

---

## Project conventions

- **TypeScript strict** on both sides; the frontend build runs a type-check
  before bundling.
- **No secrets in git** — only `.env.example` files are committed.
- Backend is CommonJS + `tsx` for dev; frontend is ESM + Vite.
