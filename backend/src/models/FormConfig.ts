import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * Stored form configuration. The backend owns these documents; the frontend
 * reads the active one to render the dynamic stepper.
 *
 * Versioning: a config is identified by (key, version). Exactly one version per
 * key is marked `isActive`. Submissions snapshot the (key, version) they were
 * created against so old drafts keep rendering with the config they started on
 * even if a newer version is published.
 */

const FieldOptionSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const FieldValidationSchema = new Schema(
  {
    minLength: Number,
    maxLength: Number,
    pattern: String,
    patternMessage: String,
    numeric: Boolean,
    integer: Boolean,
    min: Number,
    max: Number,
  },
  { _id: false },
);

const FieldSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'select', 'radio'], required: true },
    required: { type: Boolean, default: false },
    placeholder: String,
    helperText: String,
    multiline: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    options: { type: [FieldOptionSchema], default: undefined },
    validation: { type: FieldValidationSchema, default: undefined },
  },
  { _id: false },
);

const StepSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    fields: { type: [FieldSchema], required: true },
  },
  { _id: false },
);

const FormConfigSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: String,
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
    steps: { type: [StepSchema], required: true },
  },
  { timestamps: true },
);

// One document per (key, version).
FormConfigSchema.index({ key: 1, version: 1 }, { unique: true });
// Fast lookup of the active config for a key (the common read path).
FormConfigSchema.index({ key: 1, isActive: 1 });

export type FormConfigDoc = HydratedDocument<InferSchemaType<typeof FormConfigSchema>>;

export const FormConfig = model('FormConfig', FormConfigSchema);
