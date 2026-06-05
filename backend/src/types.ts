/**
 * Shared domain types for the Stepper Form.
 *
 * The form is *config-driven*: the backend owns the configuration (steps +
 * fields), and both validation and rendering are derived from it. These types
 * describe that configuration and the shape of a submission's answers.
 */

/** The three field types the form supports. */
export type FieldType = 'text' | 'select' | 'radio';

/** An option for a `select` or `radio` field. */
export interface FieldOption {
  label: string;
  value: string;
}

/**
 * Declarative, per-field validation rules. Everything here is optional and is
 * interpreted by the shared validation engine (see `validation.ts`) so the same
 * rules drive both the API and the UI.
 */
export interface FieldValidation {
  /** Minimum length for text values (applied to the trimmed string). */
  minLength?: number;
  /** Maximum length for text values. */
  maxLength?: number;
  /** Regex source string the text value must match. */
  pattern?: string;
  /** Friendly message shown when `pattern` fails. */
  patternMessage?: string;
  /** Value must parse as a number. */
  numeric?: boolean;
  /** Value must be an integer (implies numeric). */
  integer?: boolean;
  /** Inclusive lower bound for numeric values. */
  min?: number;
  /** Inclusive upper bound for numeric values. */
  max?: number;
}

/** A single field within a step. */
export interface FieldConfig {
  /** Stable identifier; also the key under which the answer is stored. */
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  /** Rendering hint for `text` fields: render a multi-line textarea. */
  multiline?: boolean;
  /**
   * Only meaningful for `select`. When true the field accepts multiple values
   * (rendered as the multi-select "chips" control) and its answer is a string[].
   */
  multiple?: boolean;
  /** Required for `select` and `radio`; ignored for `text`. */
  options?: FieldOption[];
  validation?: FieldValidation;
}

/** A single step: a titled group of fields. */
export interface StepConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
}

/** A complete form configuration. */
export interface FormConfigShape {
  key: string;
  title: string;
  subtitle?: string;
  version: number;
  steps: StepConfig[];
}

/** A map of fieldId -> answer value. */
export type Answers = Record<string, unknown>;

/** A map of fieldId -> human-readable error message. */
export type FieldErrors = Record<string, string>;

export type SubmissionStatus = 'draft' | 'completed';
