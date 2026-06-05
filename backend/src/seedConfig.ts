import type { FormConfigShape } from './types';

/** Build {label, value} options where the value mirrors the label. */
const opts = (labels: string[]) => labels.map((l) => ({ label: l, value: l }));

/**
 * The seeded Wellness Intake configuration — three steps, exercising all three
 * field types plus required fields and field-level validation. This is the
 * single source of truth the seed script writes to the database.
 */
export const WELLNESS_INTAKE_CONFIG: FormConfigShape = {
  key: 'wellness-intake',
  title: 'Wellness Intake',
  subtitle: 'Wellness Intake',
  version: 1,
  steps: [
    {
      id: 'personal-details',
      title: 'Personal Details',
      fields: [
        {
          id: 'fullName',
          label: 'Full Name',
          type: 'text',
          required: true,
          validation: { minLength: 2, maxLength: 80 },
        },
        {
          id: 'age',
          label: 'Age',
          type: 'text',
          required: true,
          placeholder: 'e.g. 29',
          // Basic field-level validation: a whole number in a sane range.
          validation: { integer: true, min: 13, max: 120 },
        },
        {
          id: 'gender',
          label: 'Gender',
          type: 'select',
          required: true,
          options: opts(['Female', 'Male', 'Non-binary', 'Prefer not to say']),
        },
      ],
    },
    {
      id: 'wellness-preferences',
      title: 'Wellness Preferences',
      fields: [
        {
          id: 'goals',
          label: 'Primary Goals',
          type: 'select',
          multiple: true,
          options: opts([
            'Sleep better',
            'Improve focus',
            'Reduce stress',
            'Build routine',
            'Feel connected',
          ]),
        },
        {
          id: 'support',
          label: 'Preferred Support Type',
          type: 'radio',
          required: true,
          options: opts(['Self-Guided', 'Coach Support', 'Not Sure']),
        },
        {
          id: 'notes',
          label: 'Notes',
          type: 'text',
          multiline: true,
          placeholder: 'Notes',
          validation: { maxLength: 500 },
        },
      ],
    },
    {
      id: 'availability',
      title: 'Availability',
      fields: [
        {
          id: 'time',
          label: 'Preferred Time',
          type: 'select',
          options: opts(['Mornings', 'Afternoons', 'Evenings', 'Weekends']),
        },
        {
          id: 'contact',
          label: 'Preferred Contact Method',
          type: 'radio',
          required: true,
          options: opts(['Email', 'Phone', 'SMS']),
        },
        {
          id: 'details',
          label: 'Additional Details',
          type: 'text',
          multiline: true,
          placeholder: 'Available mostly after 6 PM.',
          validation: { maxLength: 500 },
        },
      ],
    },
  ],
};
