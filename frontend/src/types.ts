/** Mirrors the backend domain types (config) and API DTOs. */

export type FieldType = 'text' | 'select' | 'radio';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  numeric?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
}

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  multiple?: boolean;
  options?: FieldOption[];
  validation?: FieldValidation;
}

export interface StepConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
}

export interface FormConfig {
  key: string;
  title: string;
  subtitle?: string;
  version: number;
  steps: StepConfig[];
}

export type SubmissionStatus = 'draft' | 'completed';

export type Answers = Record<string, unknown>;

export type FieldErrors = Record<string, string>;

/** Row shape from GET /api/submissions (list view). */
export interface SubmissionListItem {
  id: string;
  title: string;
  status: SubmissionStatus;
  currentStep: number;
  progress: { completed: number; total: number };
  createdAt: string;
  updatedAt: string;
}

/** Full shape from GET /api/submissions/:id and create/save/submit. */
export interface Submission {
  id: string;
  configKey: string;
  configVersion: number;
  title: string;
  status: SubmissionStatus;
  answers: Answers;
  currentStep: number;
  maxStepReached: number;
  progress: { completed: number; total: number };
  createdAt: string;
  updatedAt: string;
}
