import { Router } from 'express';
import { FormConfig } from '../models/FormConfig';
import { ApiError, asyncHandler } from '../http';
import { checkConfigIntegrity } from '../validation';
import type { FormConfigShape } from '../types';

export const configsRouter = Router();

/**
 * GET /api/configs
 * List active configs (lightweight: key, title, step count) for any picker UI.
 */
configsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const configs = await FormConfig.find({ isActive: true })
      .select('key title subtitle version steps')
      .lean();

    res.json(
      configs.map((c) => ({
        key: c.key,
        title: c.title,
        subtitle: c.subtitle,
        version: c.version,
        totalSteps: c.steps.length,
      })),
    );
  }),
);

/**
 * GET /api/configs/:key
 * Return the active config for a key so the frontend can render the form.
 * Defensively verifies integrity so a broken config surfaces as a clear 500
 * rather than a confusing render failure on the client.
 */
configsRouter.get(
  '/:key',
  asyncHandler(async (req, res) => {
    const config = await FormConfig.findOne({ key: req.params.key, isActive: true }).lean();
    if (!config) throw new ApiError(404, 'Form configuration not found');

    const problems = checkConfigIntegrity(config as unknown as FormConfigShape);
    if (problems.length) {
      throw new ApiError(500, `Form configuration is invalid: ${problems.join('; ')}`);
    }

    res.json(config);
  }),
);
