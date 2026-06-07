import { useEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import { Stepper } from './Stepper';
import { DynamicField } from './DynamicField';
import { tokens } from '../theme';
import { validateStep, validateForm } from '../validation';
import { api, ApiError } from '../api/client';
import type { Answers, FieldErrors, FormConfig, Submission } from '../types';

interface Props {
  config: FormConfig;
  submission: Submission;
  /** True when this is a freshly created, still-empty draft. */
  isNew: boolean;
  /** Called after a successful save/submit so the parent can refresh the list. */
  onPersisted: (updated: Submission) => void;
  /** Close the dialog. `deleted` is true when an empty new draft was discarded. */
  onClose: (opts?: { deleted?: boolean }) => void;
  /** Surface a transient success message (e.g. "Draft saved"). */
  onToast: (message: string) => void;
}

export function FormDialog({ config, submission, isNew, onPersisted, onClose, onToast }: Props) {
  const steps = config.steps;
  const lastStep = steps.length - 1;

  const [data, setData] = useState<Answers>(submission.answers ?? {});
  const [step, setStep] = useState<number>(Math.min(submission.currentStep, lastStep));
  const [maxReached, setMaxReached] = useState<number>(
    Math.min(submission.maxStepReached, lastStep),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  // Track whether anything was ever persisted, so we know if discarding a new,
  // untouched draft should delete it.
  const everSaved = useRef(!isNew);

  // Warn on browser-level navigation (refresh / close tab) with unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const setField = (id: string, value: unknown) => {
    setData((d) => ({ ...d, [id]: value }));
    setDirty(true);
    setServerError(null);
    setErrors((e) => {
      if (!e[id]) return e;
      const next = { ...e };
      delete next[id];
      return next;
    });
  };

    const goto = (i: number) => {
      setStep(i);
      setMaxReached((m) => Math.max(m, i));
      setErrors({});
    };

  /** Map a 422 from the server back onto the fields. */
  const applyServerError = (err: unknown) => {
    if (err instanceof ApiError && err.fieldErrors) {
      setErrors(err.fieldErrors);
      // Jump to the first step that has an error so the user can see it.
      const bad = Object.keys(err.fieldErrors);
      const firstBadStep = steps.findIndex((s) => s.fields.some((f) => bad.includes(f.id)));
      if (firstBadStep >= 0) setStep(firstBadStep);
    }
    setServerError(err instanceof Error ? err.message : 'Something went wrong');
  };

  /** Persist current answers as a draft. Returns true on success. */
  const persistDraft = async (nextStep: number): Promise<boolean> => {
    setBusy(true);
    setServerError(null);
    try {
      const updated = await api.saveDraft(submission.id, { answers: data, currentStep: nextStep });
      everSaved.current = true;
      setDirty(false);
      onPersisted(updated);
      return true;
    } catch (err) {
      applyServerError(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    // Draft save: don't enforce required, but block on malformed values.
    const formatErrors = validateForm(config, data, false);
    if (Object.keys(formatErrors).length) {
      setErrors(formatErrors);
      return;
    }
    if (await persistDraft(step)) {
      onToast('Draft saved');
      onClose();
    }
  };

  const handleNext = async () => {
    // Advancing requires this step's required fields to be valid.
    const stepErrors = validateStep(steps[step], data, true);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    const next = Math.min(step + 1, lastStep);
    if (await persistDraft(next)) goto(next);
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
  };

  const handleSubmit = async () => {
    // Full validation across every step before completing.
    const allErrors = validateForm(config, data, true);
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      const bad = Object.keys(allErrors);
      const firstBadStep = steps.findIndex((s) => s.fields.some((f) => bad.includes(f.id)));
      if (firstBadStep >= 0) setStep(firstBadStep);
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      const updated = await api.submit(submission.id, data);
      onPersisted(updated);
      onToast('Intake submitted');
      onClose();
    } catch (err) {
      applyServerError(err);
    } finally {
      setBusy(false);
    }
  };

  const requestClose = () => {
    if (dirty) {
      setConfirmClose(true);
    } else {
      void discardAndClose();
    }
  };

  /** Close; if a brand-new draft was never saved, remove the empty row. */
  const discardAndClose = async () => {
    if (!everSaved.current) {
      try {
        await api.deleteSubmission(submission.id);
        onClose({ deleted: true });
        return;
      } catch {
        /* fall through to plain close */
      }
    }
    onClose();
  };

  const saveDraftFromConfirm = async () => {
    const formatErrors = validateForm(config, data, false);
    if (Object.keys(formatErrors).length) {
      setConfirmClose(false);
      setErrors(formatErrors);
      return;
    }
    if (await persistDraft(step)) {
      onToast('Draft saved');
      onClose();
    }
  };

  return (
    <Dialog
      open
      onClose={requestClose}
      maxWidth={false}
      PaperProps={{
        sx: { width: 560, maxWidth: '100%', borderRadius: `${tokens.radiusCard}px`, m: 2 },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', p: '22px 24px 0' }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ font: "700 20px/28px 'Roboto',sans-serif", letterSpacing: '-.01em' }}>
            {submission.title}
          </Typography>
          <Typography sx={{ font: "400 13px/18px 'Roboto',sans-serif", color: tokens.gray600, mt: '2px' }}>
            {config.title}
          </Typography>
        </Box>
        <IconButton onClick={requestClose} size="small" sx={{ color: tokens.gray500 }}>
          <CloseIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>

      {/* Stepper */}
      <Box sx={{ p: '20px 24px 8px' }}>
        <Stepper
          steps={steps.map((s) => s.title)}
          current={step}
          maxReached={maxReached}
          onJump={goto}
        />
      </Box>

      {/* Body */}
      <Box sx={{ p: '12px 24px 4px', overflowY: 'auto', flex: 1, minHeight: 248 }}>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {steps[step].fields.map((field) => (
            <DynamicField
              key={field.id}
              field={field}
              value={data[field.id]}
              error={errors[field.id]}
              onChange={(v) => setField(field.id, v)}
            />
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: '12px 24px 22px' }}>
        {step > 0 && (
          <Button variant="outlined" onClick={handleBack} disabled={busy}>
            Back
          </Button>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="text" onClick={handleSave} disabled={busy}>
            Save
          </Button>
          {step < lastStep ? (
            <Button variant="contained" onClick={handleNext} disabled={busy}>
              Save and next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Submit
            </Button>
          )}
        </Box>
      </Box>

      {/* Unsaved-changes confirmation */}
      <Dialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        PaperProps={{ sx: { width: 380, maxWidth: '100%', borderRadius: `${tokens.radiusCard}px` } }}
      >
        <Box sx={{ p: '22px 24px' }}>
          <Typography sx={{ font: "700 17px/24px 'Roboto',sans-serif" }}>
            Leave without saving?
          </Typography>
          <Typography sx={{ font: "400 14px/21px 'Roboto',sans-serif", color: tokens.gray600, mt: 1 }}>
            Your changes haven’t been saved yet. You can save this as a draft and finish later.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button
              onClick={() => {
                setConfirmClose(false);
                void discardAndClose();
              }}
              sx={{ color: tokens.danger600 }}
              disabled={busy}
            >
              Discard
            </Button>
            <Button variant="outlined" onClick={() => setConfirmClose(false)} disabled={busy}>
              Keep editing
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setConfirmClose(false);
                void saveDraftFromConfirm();
              }}
              disabled={busy}
            >
              Save draft
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Dialog>
  );
}
