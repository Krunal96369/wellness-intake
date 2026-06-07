/**
 * Client-side mirror of the backend validation engine.
 *
 * The backend is always authoritative — but mirroring the same config-driven
 * rules here lets us show per-field errors instantly and block "Save and next"/
 * "Submit" without a round trip. Kept deliberately in sync with
 * backend/src/validation.ts.
 */
import type { Answers, FieldConfig, FieldErrors, FormConfig, StepConfig } from './types';

export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function requiredMessage(field: FieldConfig): string {
  if (field.type === 'radio') return 'Please choose one';
  if (field.type === 'select') return 'Please select an option';
  return 'Required';
}

export function validateField(
  field: FieldConfig,
  value: unknown,
  enforceRequired: boolean,
): string | null {
  if (isEmpty(value)) {
    if (enforceRequired && field.required) return requiredMessage(field);
    return null;
  }

  const rules = field.validation ?? {};

  switch (field.type) {
    case 'text': {
      if (typeof value !== 'string') return 'Invalid value';
      const trimmed = value.trim();
      if (rules.minLength != null && trimmed.length < rules.minLength)
        return `Must be at least ${rules.minLength} characters`;
      if (rules.maxLength != null && trimmed.length > rules.maxLength)
        return `Must be at most ${rules.maxLength} characters`;
      if (rules.pattern) {
        try {
          if (!new RegExp(rules.pattern).test(trimmed))
            return rules.patternMessage ?? 'Invalid format';
        } catch {
          /* ignore broken pattern */
        }
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
      const allowed = (field.options ?? []).map((o) => o.value);
      if (typeof value !== 'string' || !allowed.includes(value)) return 'Invalid selection';
      return null;
    }
    case 'select': {
      const allowed = (field.options ?? []).map((o) => o.value);
      if (field.multiple) {
        if (!Array.isArray(value)) return 'Invalid selection';
        for (const v of value)
          if (typeof v !== 'string' || !allowed.includes(v)) return 'Invalid selection';
        return null;
      }
      if (typeof value !== 'string' || !allowed.includes(value)) return 'Invalid selection';
      return null;
    }
    default:
      return null;
  }
}

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

export function validateForm(
  config: FormConfig,
  answers: Answers,
  enforceRequired: boolean,
): FieldErrors {
  let errors: FieldErrors = {};
  for (const step of config.steps) {
    errors = { ...errors, ...validateStep(step, answers, enforceRequired) };
  }
  return errors;
}

export function isStepComplete(step: StepConfig, answers: Answers): boolean {
  return Object.keys(validateStep(step, answers, true)).length === 0;
}

export function countCompletedSteps(config: FormConfig, answers: Answers): number {
  return config.steps.reduce((n, s) => n + (isStepComplete(s, answers) ? 1 : 0), 0);
}
