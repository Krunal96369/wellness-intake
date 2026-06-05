import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * A user's form submission. Stores the answers, where they are in the flow, and
 * a denormalized progress count so the list view is a single, index-backed
 * collection scan with no joins.
 *
 * `userId` is kept (defaulted) so the model is multi-user ready even though this
 * build has no auth — every submission currently belongs to one implicit user.
 */
const SubmissionSchema = new Schema(
  {
    userId: { type: String, required: true, default: 'local-user', index: true },

    // Snapshot of the config this submission renders/validates against.
    configKey: { type: String, required: true },
    configVersion: { type: Number, required: true },

    title: { type: String, required: true },
    status: { type: String, enum: ['draft', 'completed'], required: true, default: 'draft' },

    // fieldId -> value. Mixed because the shape is config-driven.
    answers: { type: Schema.Types.Mixed, required: true, default: {} },

    // Last step the user was viewing (for resume) and the highest reached.
    currentStep: { type: Number, required: true, default: 0 },
    maxStepReached: { type: Number, required: true, default: 0 },

    // Denormalized progress so listing never has to load the config or answers.
    completedSteps: { type: Number, required: true, default: 0 },
    totalSteps: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

/**
 * Listing is the hottest query: "my submissions, newest first", optionally
 * filtered by status. This compound index serves both the filtered and the
 * unfiltered (sort-only) cases efficiently.
 */
SubmissionSchema.index({ userId: 1, status: 1, createdAt: -1 });
SubmissionSchema.index({ userId: 1, createdAt: -1 });

export type SubmissionDoc = HydratedDocument<InferSchemaType<typeof SubmissionSchema>>;

export const Submission = model('Submission', SubmissionSchema);
