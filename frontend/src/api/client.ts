/**
 * Thin API client. In dev, requests go to "/api" (Vite proxies to the backend);
 * in production set VITE_API_BASE_URL to the API origin.
 */
import type { FormConfig, Submission, SubmissionListItem, FieldErrors, Answers } from '../types';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Error carrying the HTTP status and any per-field validation errors. */
export class ApiError extends Error {
  status: number;
  fieldErrors?: FieldErrors;
  constructor(status: number, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Is the backend running?');
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; fieldErrors?: FieldErrors };
    throw new ApiError(res.status, b.error ?? `Request failed (${res.status})`, b.fieldErrors);
  }
  return body as T;
}

export const api = {
  getConfig: (key: string) => request<FormConfig>(`/configs/${key}`),

  listSubmissions: () => request<SubmissionListItem[]>('/submissions'),

  getSubmission: (id: string) => request<Submission>(`/submissions/${id}`),

  createSubmission: (configKey: string) =>
    request<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify({ configKey }),
    }),

  saveDraft: (id: string, data: { answers?: Answers; currentStep?: number }) =>
    request<Submission>(`/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  submit: (id: string, answers: Answers) =>
    request<Submission>(`/submissions/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  deleteSubmission: (id: string) =>
    request<void>(`/submissions/${id}`, { method: 'DELETE' }),
};
