import type { NextFunction, Request, Response } from 'express';
import type { FieldErrors } from './types';

/**
 * Operational error with an HTTP status. Thrown by route handlers and turned
 * into a JSON response by the central error middleware.
 */
export class ApiError extends Error {
  status: number;
  /** Optional per-field validation errors (for 422 responses). */
  fieldErrors?: FieldErrors;

  constructor(status: number, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Wrap an async route handler so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** Central error handler — last middleware. Shapes every error as JSON. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
    });
    return;
  }

  // Mongoose CastError (e.g. malformed ObjectId) -> 400 rather than 500.
  if (err && typeof err === 'object' && (err as { name?: string }).name === 'CastError') {
    res.status(400).json({ error: 'Invalid identifier' });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
