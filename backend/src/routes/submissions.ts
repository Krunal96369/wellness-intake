import { Router } from "express";
import { z } from "zod";
import { ApiError, asyncHandler } from "../http";
import { FormConfig } from "../models/FormConfig";
import { Submission, type SubmissionDoc } from "../models/Submission";
import type { Answers, FormConfigShape } from "../types";
import {
  checkConfigIntegrity,
  countCompletedSteps,
  sanitizeAnswers,
  validateForm,
} from "../validation";

export const submissionsRouter = Router();

/** Single implicit user (no auth in this build). */
const USER_ID = "local-user";

/** A readable default title, e.g. "Jun 5, 2026, 3:42pm". */
function defaultTitle(date = new Date()): string {
  const d = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${d}, ${h}:${m}${ap}`;
}

/** Load the exact config a submission was created against (falls back to active). */
async function loadConfigForSubmission(
  sub: SubmissionDoc,
): Promise<FormConfigShape> {
  let config = await FormConfig.findOne({
    key: sub.configKey,
    version: sub.configVersion,
  }).lean();

  if (!config) {
    config = await FormConfig.findOne({
      key: sub.configKey,
      isActive: true,
    }).lean();
  }
  if (!config) {
    throw new ApiError(
      500,
      "Form configuration for this submission is missing",
    );
  }

  const shape = config as unknown as FormConfigShape;
  const problems = checkConfigIntegrity(shape);
  if (problems.length) {
    throw new ApiError(
      500,
      `Form configuration is invalid: ${problems.join("; ")}`,
    );
  }
  return shape;
}

/** Full submission DTO returned to the client. */
function toFullDTO(sub: SubmissionDoc) {
  return {
    id: String(sub._id),
    configKey: sub.configKey,
    configVersion: sub.configVersion,
    title: sub.title,
    status: sub.status,
    answers: sub.answers,
    currentStep: sub.currentStep,
    maxStepReached: sub.maxStepReached,
    progress: { completed: sub.completedSteps, total: sub.totalSteps },
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

const statusQuerySchema = z.enum(["draft", "completed"]).optional();

/**
 * GET /api/submissions
 * Optimized list: index-backed (userId, [status,] createdAt desc), projects out
 * the heavy `answers`/config, and uses lean() for plain objects. Returns just
 * what the list view renders: title, status, progress.
 */
submissionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = statusQuerySchema.safeParse(req.query.status);
    if (!parsed.success) throw new ApiError(400, "Invalid status filter");
    const status = parsed.data;

    const filter: Record<string, unknown> = { userId: USER_ID };
    if (status) filter.status = status;

    const rows = await Submission.find(filter)
      .select(
        "title status completedSteps totalSteps currentStep createdAt updatedAt answers.fullName",
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      rows.map((r) => ({
        id: String(r._id),
        title: r.answers?.fullName
          ? `${r.answers.fullName} - ${r.title}`
          : r.title,
        status: r.status,
        currentStep: r.currentStep,
        progress: { completed: r.completedSteps, total: r.totalSteps },
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    );
  }),
);

const createSchema = z.object({
  configKey: z.string().min(1).default("wellness-intake"),
  title: z.string().trim().min(1).max(120).optional(),
});

/**
 * POST /api/submissions
 * Create a new (empty) draft against the active config for a key.
 */
submissionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ApiError(400, "Invalid request body");
    const { configKey, title } = parsed.data;

    const config = await FormConfig.findOne({
      key: configKey,
      isActive: true,
    }).lean();
    if (!config)
      throw new ApiError(404, `No active configuration for "${configKey}"`);

    const sub = await Submission.create({
      userId: USER_ID,
      configKey: config.key,
      configVersion: config.version,
      title: title ?? defaultTitle(),
      status: "draft",
      answers: {},
      currentStep: 0,
      maxStepReached: 0,
      completedSteps: 0,
      totalSteps: config.steps.length,
    });

    res.status(201).json(toFullDTO(sub));
  }),
);

/**
 * GET /api/submissions/:id
 * Full submission for resuming/reviewing.
 */
submissionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sub = await Submission.findOne({
      _id: req.params.id,
      userId: USER_ID,
    });
    if (!sub) throw new ApiError(404, "Submission not found");
    res.json(toFullDTO(sub));
  }),
);

const saveSchema = z.object({
  answers: z.record(z.unknown()).optional(),
  currentStep: z.number().int().optional(),
});

/**
 * PATCH /api/submissions/:id
 * Save partial progress as a draft. Accepts unknown answers but strips them,
 * format-checks any provided values (without enforcing required), clamps the
 * step into range, and recomputes progress. A completed submission edited here
 * keeps its status but its progress is recomputed.
 */
submissionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = saveSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ApiError(400, "Invalid request body");

    const sub = await Submission.findOne({
      _id: req.params.id,
      userId: USER_ID,
    });
    if (!sub) throw new ApiError(404, "Submission not found");

    const config = await loadConfigForSubmission(sub);
    const lastStep = config.steps.length - 1;

    // Merge incoming answers over existing, then strip unknown keys.
    const merged: Answers = {
      ...(sub.answers as Answers),
      ...(parsed.data.answers ?? {}),
    };
    const answers = sanitizeAnswers(config, merged);

    // Draft mode: don't enforce required, but reject malformed provided values.
    const errors = validateForm(config, answers, false);
    if (Object.keys(errors).length) {
      throw new ApiError(422, "Some fields have invalid values", errors);
    }

    if (parsed.data.currentStep != null) {
      // Defensively clamp an out-of-range step instead of trusting the client.
      const step = Math.max(0, Math.min(parsed.data.currentStep, lastStep));
      sub.currentStep = step;
      sub.maxStepReached = Math.max(sub.maxStepReached, step);
    }

    sub.answers = answers;
    sub.completedSteps = countCompletedSteps(config, answers);
    sub.totalSteps = config.steps.length;
    sub.markModified("answers");
    await sub.save();

    res.json(toFullDTO(sub));
  }),
);

const submitSchema = z.object({
  answers: z.record(z.unknown()).optional(),
});

/**
 * POST /api/submissions/:id/submit
 * Complete the form. Runs full validation across every step; if anything is
 * missing or invalid the status is left untouched and a 422 with per-field
 * errors is returned. Only a fully valid form flips to "completed".
 */
submissionsRouter.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const parsed = submitSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ApiError(400, "Invalid request body");

    const sub = await Submission.findOne({
      _id: req.params.id,
      userId: USER_ID,
    });
    if (!sub) throw new ApiError(404, "Submission not found");

    const config = await loadConfigForSubmission(sub);

    const merged: Answers = {
      ...(sub.answers as Answers),
      ...(parsed.data.answers ?? {}),
    };
    const answers = sanitizeAnswers(config, merged);

    const errors = validateForm(config, answers, true);
    if (Object.keys(errors).length) {
      throw new ApiError(
        422,
        "Please fix the highlighted fields before submitting",
        errors,
      );
    }

    sub.answers = answers;
    sub.status = "completed";
    sub.currentStep = config.steps.length - 1;
    sub.maxStepReached = config.steps.length - 1;
    sub.completedSteps = config.steps.length;
    sub.totalSteps = config.steps.length;
    sub.markModified("answers");
    await sub.save();

    res.json(toFullDTO(sub));
  }),
);

/**
 * DELETE /api/submissions/:id
 * Remove a submission.
 */
submissionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await Submission.deleteOne({
      _id: req.params.id,
      userId: USER_ID,
    });
    if (result.deletedCount === 0)
      throw new ApiError(404, "Submission not found");
    res.status(204).end();
  }),
);
