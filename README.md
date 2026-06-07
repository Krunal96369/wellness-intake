# Wellness Intake: Stepper Form

A configurable, multi-step intake form for a mental-wellness product. You start a
submission, work through it a step at a time, save as a draft, and come back to finish whenever. It completes once every required field checks out. The whole thing is config-driven: the backend owns the form definition (steps, fields, validation rules) and the API and UI both read from that one source.
The form is data you can change, not code you have to rewrite.


---

## Contents

- [Wellness Intake: Stepper Form](#wellness-intake-stepper-form)
  - [Contents](#contents)
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
  - [Data model and query optimization](#data-model-and-query-optimization)
  - [Filtering and sorting](#filtering-and-sorting)
  - [Validation and edge cases](#validation-and-edge-cases)
  - [Unsaved-changes handling](#unsaved-changes-handling)
  - [Deployment](#deployment)
    - [Database: MongoDB Atlas](#database-mongodb-atlas)
    - [Backend: Render / Railway / Fly (any Node host)](#backend-render--railway--fly-any-node-host)
    - [Frontend: Vercel / Netlify (static)](#frontend-vercel--netlify-static)
  - [Conventions](#conventions)

---

## Highlights

A form is just data. Add or remove steps and fields, or change a rule, and the UI and
API follow along with no code change.

One validation engine runs in two places. The backend has the final say; the frontend
mirrors it so you see errors the moment you create them. Invalid fields block saving
and completing on both sides.

Drafts don't evaporate. A submission hits the database the second you start it, so
your progress survives a refresh, a closed tab, or switching to another device.

The list query stays cheap on purpose. It pulls only the columns it needs, runs
`.lean()`, and rides on compound indexes. Progress is denormalized, so listing never
joins or recomputes a thing.

Filter and sort without a round-trip. A small toolbar sorts newest or oldest and
filters by date range and status, all client-side over the rows you already have, with
a Clear button that shows up when something's on.

Defensive by default. Bad values, unknown options, missing required fields,
out-of-range steps, junk ids, broken configs: all of it comes back as a clear, typed
error instead of a crash.

The form notices unsaved edits and warns you before you wander off, both in-app and at
the browser level.

TypeScript end to end, styled against the design system in `design-mock/` (teal
`#147D6F`, Roboto, outlined inputs, soft radii, nothing heavy).

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

The config is the contract. A `FormConfig` lays out ordered `steps`, each holding
`fields`. A field has a `type` (`text`, `select`, `radio`), a `required` flag, and
optional `validation` (length, regex, numeric range, option membership). The backend
validates against it; the frontend renders and pre-validates against the same shape.
And every submission snapshots the `configKey` and `configVersion` it was created
under, so editing a config next month can't reach back and corrupt something already
in flight.

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
└── design-mock/                # Design system: tokens, rules, and the source mocks
```

---

## Running locally

### Prerequisites

- Node.js 18+ and npm
- MongoDB running locally on `localhost:27017` (a local install or running service is
  fine; no replica set required)

### 1. Backend

```bash
cd backend
cp .env.example .env          # Windows: copy .env.example .env
npm install
npm run seed                  # creates the config + 3 sample submissions
npm run dev                   # API on http://localhost:4000
```

You should see `[mongo] connected` and `[api] listening on http://localhost:4000`.
Sanity check: `curl http://localhost:4000/api/health` returns `{"ok":true}`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # optional for local dev; defaults work
npm install
npm run dev                   # app on http://localhost:5173
```

Open **http://localhost:5173**. In development the Vite dev server proxies `/api/*` to
the backend on port 4000, so there's no CORS to think about.

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

| Variable            | Default (dev) | Notes                                                                                              |
| ------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | *(empty)*     | Empty uses `/api` via the Vite proxy. In production, set it to the deployed API origin (e.g. `https://your-api.onrender.com`). |

---

## API reference

Base path: `/api`. All bodies are JSON.

| Method | Path                      | Purpose                                                      |
| ------ | ------------------------- | ------------------------------------------------------------ |
| GET    | `/health`                 | Liveness check                                               |
| GET    | `/configs`                | List active configs (lightweight)                            |
| GET    | `/configs/:key`           | Active config for a key (404 missing, 500 if broken)         |
| GET    | `/submissions`            | List submissions; optional `?status=` filter (draft or completed) |
| POST   | `/submissions`            | Create a new empty draft (`{ "configKey": "..." }`)          |
| GET    | `/submissions/:id`        | Full submission (answers, step, progress)                    |
| PATCH  | `/submissions/:id`        | Save draft (merge answers, set step), 422 on bad values      |
| POST   | `/submissions/:id/submit` | Complete the form, 422 with `fieldErrors` if invalid         |
| DELETE | `/submissions/:id`        | Delete a submission                                          |

Errors come back in one shape: `{ "error": "message", "fieldErrors"?: { "<fieldId>": "..." } }`.
The list endpoint returns denormalized progress per row:
`{ id, title, status, currentStep, progress: { completed, total }, createdAt, updatedAt }`.

---

## Data model and query optimization

A `Submission` keeps `userId` (it defaults to the one local user), `configKey` and
`configVersion` (the snapshot), `title`, `status`, `answers`, `currentStep`,
`maxStepReached`, and the denormalized `completedSteps` / `totalSteps`. The validation
engine recomputes progress on every save and submit, which is the whole reason the
list view never has to crack open the answers or recompute anything itself.

Indexes:

- `Submission`: `{ userId, status, createdAt }` and `{ userId, createdAt }`. These
  cover both the status-filtered (`GET /submissions?status=`) and the unfiltered list
  query, already sorted newest first. The current UI fetches the unfiltered list and
  filters client-side (see below), but the endpoint and these indexes support
  server-side `?status=` filtering for when the dataset grows.
- `FormConfig`: `{ key, version }` unique, and `{ key, isActive }` for the "active
  config for this key" lookup.

The list query also projects only the columns the list needs (no `answers`) and uses
`.lean()` to skip Mongoose hydration.

---

## Filtering and sorting

The list view has a small toolbar with three independent controls, all applied
client-side over the rows already in hand. It's one user's submissions, so filtering in
the browser keeps things instant and skips the extra round-trips:

- Sort by newest or oldest first.
- Date range: any time, or the last 7 / 30 / 90 days.
- Status: all, drafts only, or completed only.

The rules live as pure functions in `lib/filters.ts` (`applyFilters`,
`hasActiveFilters`), which keeps them easy to reason about and test while the toolbar
(`FilterMenu.tsx`) stays a thin, declarative shell. A Clear control turns up the moment
any control drifts from its default. The API can do server-side `?status=` filtering
for bigger datasets too; the UI just doesn't need it at this scale.

---

## Validation and edge cases

One engine (`validation.ts`, mirrored on both sides) handles all of it:

- Required fields with type-aware messages (radio: "Please choose one", select:
  "Please select an option", text: "Required").
- Text rules: min/max length, regex pattern, numeric, integer, min/max value.
- Choice rules: the value must be one of the configured options; multi-select must be
  an array with no duplicates or unknown values.
- Draft vs submit: drafts allow missing required fields but still reject malformed
  values; submitting enforces everything.

Defensive handling, verified end to end:

| Case                                    | Result                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Age out of range while saving a draft   | `422` with a field error                                                       |
| Unknown select/radio option             | `422` (rejected, not stored)                                                   |
| Submitting with required fields missing | `422` with `fieldErrors`; UI jumps to the first bad step                       |
| `currentStep` out of range              | Clamped to a valid step                                                        |
| Malformed Mongo `:id`                   | `400` (CastError mapped)                                                       |
| Broken/invalid config                   | Integrity check returns `500` with a clear message instead of a corrupt render |
| Unknown answer keys                     | Stripped before persisting                                                     |

---

## Unsaved-changes handling

- Editing a field marks the step dirty.
- Trying to close the dialog (X, backdrop, or Escape) with unsaved edits opens a
  confirmation offering Discard / Keep editing / Save draft.
- A `beforeunload` listener warns before a browser refresh or tab close while there are
  unsaved changes.
- Discarding a brand-new, never-saved draft deletes its empty row so the list stays
  clean.

---

## Deployment

Nothing in the code assumes a specific host. A common, free-tier-friendly setup:

### Database: MongoDB Atlas

1. Create a free cluster and a database user.
2. Allow access from your hosting provider (or `0.0.0.0/0` for a quick start).
3. Copy the `mongodb+srv://...` connection string.

### Backend: Render / Railway / Fly (any Node host)

- Build: `npm install && npm run build`
- Start: `npm start`
- Environment:
  - `MONGODB_URI` = your Atlas connection string
  - `PORT` = provided by the host (the app reads `process.env.PORT`)
  - `CORS_ORIGIN` = your deployed frontend URL
- After the first deploy, run the seed once to create the config: `npm run seed` (as a
  one-off job, or temporarily from your machine pointed at Atlas).

### Frontend: Vercel / Netlify (static)

- Build: `npm install && npm run build`
- Output directory: `dist`
- Environment: `VITE_API_BASE_URL` = your deployed backend origin.

Once both are live, make sure the backend's `CORS_ORIGIN` lists the frontend URL and
the frontend's `VITE_API_BASE_URL` points at the backend.

---

## Conventions

- TypeScript strict on both sides; the frontend build runs a type-check before
  bundling.
- No secrets in git. Only `.env.example` files are committed.
- Backend is CommonJS plus `tsx` for dev; frontend is ESM plus Vite.
