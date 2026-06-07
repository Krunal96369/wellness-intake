# Wellness Intake: Stepper Form

A multi-step intake form where the backend defines the entire form through config: steps, fields, validation rules. The frontend renders whatever the config says. Users fill it out one step at a time, save partial progress as a draft, and pick it back up whenever. The form won't complete until every required field passes validation. Change the config, and both the API and UI pick it up with no code changes.

## Stack

| Layer      | Choice                                                                           |
| ---------- | -------------------------------------------------------------------------------- |
| Frontend   | React 18, Vite, Material UI 6, TypeScript                                        |
| Backend    | Node.js, Express 4, TypeScript                                                   |
| Database   | MongoDB with Mongoose 8                                                          |
| Validation |  Zod guards request shapes on the API                                            |
| deployment |  Vercel (monorepo), MongoDB Atlas                                                |

## Running locally

You need Node 18+ and MongoDB running on `localhost:27017`.

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run seed        # creates the config + 3 sample submissions
npm run dev         # API on http://localhost:4000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev         # app on http://localhost:5173
```

Open **http://localhost:5173**. Vite proxies `/api/*` to the backend in dev, so no
CORS to deal with. Sanity check: `curl http://localhost:4000/api/health` should
return `{"ok":true}`.

## How it's shaped

The config is the contract. A `FormConfig` in the database defines ordered steps,
each with fields, types, required flags, and validation rules. The backend validates
against it; the frontend renders from it and pre-validates with a mirror of the same
engine. Neither side hard-codes any fields.

Every submission snapshots the `configKey` and `configVersion` it was created under,
so editing the config next month can't corrupt a draft that's already in flight.

Validation lives in one pure module (`validation.ts`, no Express, no Mongo) with an
`enforceRequired` flag: drafts format-check provided values but tolerate missing
required fields; submit enforces everything. The frontend mirrors this for instant
feedback, but the backend always has the final say.

Progress is denormalized. `completedSteps` and `totalSteps` are stored on the
document and recomputed on every save/submit, so the list endpoint never loads
answers, never touches the config, and runs on compound indexes with `.lean()`.

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
└── design-mock/                # Design system: tokens, rules
```

## API

Base path: `/api`. All bodies are JSON.

| Method | Path                      | What it does                                           |
| ------ | ------------------------- | ------------------------------------------------------ |
| GET    | `/health`                 | Liveness check                                         |
| GET    | `/configs/:key`           | Active config for a key                                |
| GET    | `/submissions`            | List submissions (optional `?status=draft\|completed`) |
| POST   | `/submissions`            | Create a new empty draft                               |
| GET    | `/submissions/:id`        | Full submission with answers                           |
| PATCH  | `/submissions/:id`        | Save draft (merge answers, set step)                   |
| POST   | `/submissions/:id/submit` | Complete the form (422 with `fieldErrors` if invalid)  |
| DELETE | `/submissions/:id`        | Delete a submission                                    |

Errors come back in one shape: `{ "error": "message", "fieldErrors"?: { ... } }`.

## Edge cases handled

These are the ones the spec grades on, verified with `curl` and manual testing:

- Out-of-range `currentStep` -- clamped, never trusted from the client
- Malformed Mongo `:id` -- 400 (CastError mapped), not 500
- Unknown select/radio option -- 422, rejected before persisting
- Submitting with missing required fields -- 422 with `fieldErrors`, UI jumps to the first bad step
- Arbitrary answer keys from the client -- stripped by `sanitizeAnswers` before saving
- Broken regex pattern in a config -- try/catch so validation fails safe instead of crashing
- Multi-select with duplicates or unknown values -- rejected

## Unsaved-changes handling (bonus)

Editing a field marks the step dirty. Trying to close with unsaved edits opens a
dialog: Discard / Keep editing / Save draft. A `beforeunload` listener covers browser
refresh and tab close. Discarding a brand-new, never-saved draft deletes its empty row
so the list stays clean.

## Environment variables

**Backend (`backend/.env`)**

| Variable      | Default                                     | Notes                           |
| ------------- | ------------------------------------------- | ------------------------------- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/wellness-intake` | Connection string               |
| `PORT`        | `4000`                                      | API port                        |
| `CORS_ORIGIN` | `http://localhost:5173`                     | Comma-separated allowed origins |

**Frontend (`frontend/.env`)**

| Variable            | Default   | Notes                                                                   |
| ------------------- | --------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | *(empty)* | Empty uses `/api` via Vite proxy. In production, set to the API origin. |

## Scripts

| Location | Command             | What it does                  |
| -------- | ------------------- | ----------------------------- |
| backend  | `npm run dev`       | API with hot reload           |
| backend  | `npm run seed`      | Seed config + sample data     |
| backend  | `npm run build`     | Compile to `dist/`            |
| backend  | `npm start`         | Run compiled server           |
| backend  | `npm run typecheck` | Type-check without emitting   |
| frontend | `npm run dev`       | Vite dev server               |
| frontend | `npm run build`     | Type-check + production build |
| frontend | `npm run preview`   | Preview the production build  |
