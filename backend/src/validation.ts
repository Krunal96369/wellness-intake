/**
 * Config-driven validation engine.
 *
 * This is the authoritative validation used by the API. It is intentionally
 * pure (no DB, no Express) so it is easy to test and so the *same logic* can be
 * mirrored on the frontend for instant feedback. The backend never trusts the
 * client: every draft save and every submit runs through here.
 */
import type {
  Answers,
  FieldConfig,
  FieldErrors,
  FormConfigShape,
  StepConfig,
} from './types';

/** Treats undefined, null, '' and [] as "empty". */
export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Required-field message tuned to the control type (mirrors the mocks). */
function requiredMessage(field: FieldConfig): string {
  if (field.type === 'radio') return 'Please choose one';
  if (field.type === 'select') return 'Please select an option';
  return 'Required';
}

/**
 * Validate a single field's value against its config.
 *
 * @param enforceRequired when false (draft mode) an empty value is accepted,
 *   but any *provided* value is still format-checked. When true (submit mode)
 *   required empties are reported.
 * @returns an error message, or null if the value is valid.
 */
export function validateField(
  field: FieldConfig,
  value: unknown,
  enforceRequired: boolean,
): string | null {
  const empty = isEmpty(value);

  if (empty) {
    if (enforceRequired && field.required) return requiredMessage(field);
    return null; // empty + optional (or draft) is fine
  }

  const rules = field.validation ?? {};

  switch (field.type) {
    case 'text': {
      if (typeof value !== 'string') return 'Invalid value';
      const trimmed = value.trim();

      if (rules.minLength != null && trimmed.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters`;
      }
      if (rules.maxLength != null && trimmed.length > rules.maxLength) {
        return `Must be at most ${rules.maxLength} characters`;
      }
      if (rules.pattern) {
        let re: RegExp;
        try {
          re = new RegExp(rules.pattern);
        } catch {
          // A broken pattern in config should not crash validation.
          return null;
        }
        if (!re.test(trimmed)) return rules.patternMessage ?? 'Invalid format';
      }
      if (rules.numeric || rules.integer || rules.min != null || rules.max != null) {
        const num = Number(trimmed);
        if (!Number.isFinite(num)) return 'Must be a number';
        if (rules.integer && !Number.isInteger(num)) return 'Must be a whole number';
        if (rules.min != null && num < rules.min) return `Must be at least ${rules.min}`;
        if (rules.max != null && num > rules.max) return `Must be at most ${rules.max}`;
      }
      return null;
    }

    case 'radio': {
      if (typeof value !== 'string') return 'Invalid selection';
      const allowed = (field.options ?? []).map((o) => o.value);
      if (!allowed.includes(value)) return 'Invalid selection';
      return null;
    }

    case 'select': {
      const allowed = (field.options ?? []).map((o) => o.value);
      if (field.multiple) {
        if (!Array.isArray(value)) return 'Invalid selection';
        for (const v of value) {
          if (typeof v !== 'string' || !allowed.includes(v)) return 'Invalid selection';
        }
        // Reject duplicates defensively.
        if (new Set(value).size !== value.length) return 'Invalid selection';
        return null;
      }
      if (typeof value !== 'string') return 'Invalid selection';
      if (!allowed.includes(value)) return 'Invalid selection';
      return null;
    }

    default:
      // Unknown field type in config — fail safe rather than throw.
      return null;
  }
}

/** Validate every field in a step. Returns a (possibly empty) error map. */
export function validateStep(
  step: StepConfig,
  answers: Answers,
  enforceRequired: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of step.fields) {
    const message = validateField(field, answers[field.id], enforceRequired);
    if (message) errors[field.id] = message;
  }
  return errors;
}

/** Validate every field in every step. */
export function validateForm(
  config: FormConfigShape,
  answers: Answers,
  enforceRequired: boolean,
): FieldErrors {
  let errors: FieldErrors = {};
  for (const step of config.steps) {
    errors = { ...errors, ...validateStep(step, answers, enforceRequired) };
  }
  return errors;
}

/**
 * A step is "complete" when all of its fields pass full validation
 * (required satisfied + every provided value valid).
 */
export function isStepComplete(step: StepConfig, answers: Answers): boolean {
  return Object.keys(validateStep(step, answers, true)).length === 0;
}

/** Count of complete steps, used to drive the progress indicator. */
export function countCompletedSteps(config: FormConfigShape, answers: Answers): number {
  return config.steps.reduce((n, step) => n + (isStepComplete(step, answers) ? 1 : 0), 0);
}

/**
 * Structural sanity-check of a config. Catches "broken form configuration"
 * before it ever reaches a user: duplicate ids, select/radio without options,
 * unparseable validation patterns, etc. Returns a list of problems (empty = ok).
 */
export function checkConfigIntegrity(config: FormConfigShape): string[] {
  const problems: string[] = [];
  if (!config.steps || config.steps.length === 0) {
    problems.push('Config has no steps');
  }

  const seenFieldIds = new Set<string>();
  const seenStepIds = new Set<string>();

  for (const step of config.steps ?? []) {
    if (!step.id) problems.push('A step is missing an id');
    else if (seenStepIds.has(step.id)) problems.push(`Duplicate step id: ${step.id}`);
    else seenStepIds.add(step.id);

    if (!step.fields || step.fields.length === 0) {
      problems.push(`Step "${step.id}" has no fields`);
    }

    for (const field of step.fields ?? []) {
      if (!field.id) problems.push(`A field in step "${step.id}" is missing an id`);
      else if (seenFieldIds.has(field.id)) problems.push(`Duplicate field id: ${field.id}`);
      else seenFieldIds.add(field.id);

      if (!['text', 'select', 'radio'].includes(field.type)) {
        problems.push(`Field "${field.id}" has unknown type "${field.type}"`);
      }
      if ((field.type === 'select' || field.type === 'radio')) {
        if (!field.options || field.options.length === 0) {
          problems.push(`Field "${field.id}" (${field.type}) has no options`);
        } else {
          const values = field.options.map((o) => o.value);
          if (new Set(values).size !== values.length) {
            problems.push(`Field "${field.id}" has duplicate option values`);
          }
        }
      }
      if (field.validation?.pattern) {
        try {
          new RegExp(field.validation.pattern);
        } catch {
          problems.push(`Field "${field.id}" has an invalid regex pattern`);
        }
      }
    }
  }
  return problems;
}

/**
 * Strip any answer keys that are not declared fields in the config. Protects the
 * DB from arbitrary client-supplied keys and keeps stored answers clean.
 */
export function sanitizeAnswers(config: FormConfigShape, answers: Answers): Answers {
  const known = new Set<string>();
  for (const step of config.steps) for (const f of step.fields) known.add(f.id);

  const clean: Answers = {};
  for (const [key, value] of Object.entries(answers ?? {})) {
    if (known.has(key)) clean[key] = value;
  }
  return clean;
}
