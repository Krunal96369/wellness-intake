/**
 * Seed script: writes the Wellness Intake config into MongoDB.
 *
 * Idempotent — re-running upserts the same (key, version) document and ensures
 * exactly one active version per key. Run with `npm run seed`.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectToDatabase } from './db';
import { FormConfig } from './models/FormConfig';
import { Submission } from './models/Submission';
import { WELLNESS_INTAKE_CONFIG } from './seedConfig';
import { checkConfigIntegrity, countCompletedSteps } from './validation';
import type { Answers } from './types';

/** A few realistic submissions so the list view isn't empty on first run. */
const SAMPLE_SUBMISSIONS: Array<{
  title: string;
  status: 'draft' | 'completed';
  currentStep: number;
  answers: Answers;
}> = [
  {
    title: 'May 25, 2026, 1:37pm',
    status: 'draft',
    currentStep: 1,
    answers: {
      fullName: 'Jordan Avery',
      age: '34',
      gender: 'Non-binary',
      goals: ['Sleep better', 'Improve focus'],
    },
  },
  {
    title: 'May 18, 2026, 9:02am',
    status: 'completed',
    currentStep: 2,
    answers: {
      fullName: 'Sam Rivera',
      age: '29',
      gender: 'Female',
      goals: ['Reduce stress'],
      support: 'Coach Support',
      time: 'Evenings',
      contact: 'Email',
      details: 'Available mostly after 6 PM.',
    },
  },
  {
    title: 'May 11, 2026, 4:15pm',
    status: 'draft',
    currentStep: 0,
    answers: { fullName: 'Priya Nair' },
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/wellness-intake';

  const problems = checkConfigIntegrity(WELLNESS_INTAKE_CONFIG);
  if (problems.length) {
    console.error('[seed] config integrity check failed:');
    for (const p of problems) console.error('  -', p);
    process.exit(1);
  }

  await connectToDatabase(uri);

  const { key, version } = WELLNESS_INTAKE_CONFIG;

  // Deactivate other versions of this key, then upsert + activate this one.
  await FormConfig.updateMany({ key }, { $set: { isActive: false } });
  await FormConfig.findOneAndUpdate(
    { key, version },
    { $set: { ...WELLNESS_INTAKE_CONFIG, isActive: true } },
    { upsert: true, new: true },
  );

  console.log(`[seed] upserted config "${key}" v${version} (active)`);

  // Only insert sample submissions when none exist, so re-seeding is safe.
  const existing = await Submission.countDocuments({ userId: 'local-user' });
  if (existing === 0) {
    const totalSteps = WELLNESS_INTAKE_CONFIG.steps.length;
    await Submission.insertMany(
      SAMPLE_SUBMISSIONS.map((s) => ({
        userId: 'local-user',
        configKey: key,
        configVersion: version,
        title: s.title,
        status: s.status,
        answers: s.answers,
        currentStep: s.currentStep,
        maxStepReached: s.currentStep,
        completedSteps:
          s.status === 'completed'
            ? totalSteps
            : countCompletedSteps(WELLNESS_INTAKE_CONFIG, s.answers),
        totalSteps,
      })),
    );
    console.log(`[seed] inserted ${SAMPLE_SUBMISSIONS.length} sample submissions`);
  } else {
    console.log(`[seed] ${existing} submission(s) already present — skipping samples`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
