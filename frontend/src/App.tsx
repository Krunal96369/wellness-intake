import ChecklistIcon from '@mui/icons-material/Checklist';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api/client';
import { FilterMenu } from './components/FilterMenu';
import { FormDialog } from './components/FormDialog';
import { SubmissionRow } from './components/SubmissionRow';
import {
  applyFilters,
  DATE_OPTIONS,
  DEFAULT_FILTERS,
  hasActiveFilters,
  PROGRESS_OPTIONS,
  SORT_OPTIONS,
  type FilterState,
} from './lib/filters';
import { tokens } from './theme';
import type { FormConfig, Submission, SubmissionListItem } from './types';

const CONFIG_KEY = 'wellness-intake';

/** The submission currently open in the dialog. */
interface OpenState {
  submission: Submission;
  isNew: boolean;
}

/** A transient snackbar message. */
interface Toast {
  message: string;
  severity: 'success' | 'error';
}

export default function App() {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [rows, setRows] = useState<SubmissionListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [open, setOpen] = useState<OpenState | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  // Open is tracked separately from content so the snackbar can play its exit
  // animation with the message/severity still mounted — clearing `toast` on
  // close would otherwise flip the alert to its empty default mid-fade.
  const [toastOpen, setToastOpen] = useState(false);
  // The row awaiting delete confirmation; the warning dialog is open while set.
  const [confirmDelete, setConfirmDelete] = useState<SubmissionListItem | null>(null);
  // Ids whose delete is in flight — filtered out of any list refresh so the row
  // doesn't momentarily reappear from the server before the DELETE resolves.
  const pendingDeleteIds = useRef<Set<string>>(new Set());

  // Filtering and sorting are derived client-side from the full list, so the
  // list is fetched once and never refetched when a filter changes.
  const visible = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const isErrorToast = toast?.severity === 'error';

  const showToast = (t: Toast) => {
    setToast(t);
    setToastOpen(true);
  };

  const loadConfig = useCallback(async () => {
    try {
      setConfig(await api.getConfig(CONFIG_KEY));
      setConfigError(null);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to load form configuration');
    }
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const list = await api.listSubmissions();
      setRows(list.filter((r) => !pendingDeleteIds.current.has(r.id)));
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load submissions');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadConfig(), refreshList()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewIntake = async () => {
    if (!config) return;
    setBusyAction(true);
    try {
      const created = await api.createSubmission(CONFIG_KEY);
      setOpen({ submission: created, isNew: true });
      await refreshList();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not start a new intake');
    } finally {
      setBusyAction(false);
    }
  };

  const handleOpenRow = async (id: string) => {
    setOpeningId(id);
    try {
      const full = await api.getSubmission(id);
      setOpen({ submission: full, isNew: false });
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not open this submission');
    } finally {
      setOpeningId(null);
    }
  };

  // Delete is confirmed up front (warning dialog), then committed immediately:
  // the row vanishes optimistically and the API call fires right away. On
  // failure the row is restored. (The DELETE endpoint is permanent.)
  const handleDelete = async (item: SubmissionListItem) => {
    pendingDeleteIds.current.add(item.id);
    setRows((rs) => rs.filter((r) => r.id !== item.id));
    try {
      await api.deleteSubmission(item.id);
      showToast({ message: 'Submission deleted', severity: 'error' });
    } catch (err) {
      setRows((rs) => (rs.some((r) => r.id === item.id) ? rs : [...rs, item]));
      setListError(err instanceof Error ? err.message : 'Could not delete this submission');
    } finally {
      pendingDeleteIds.current.delete(item.id);
    }
  };

  // --- Render guards ---
  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (configError) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', p: '64px 24px' }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadConfig()}>
              Retry
            </Button>
          }
        >
          {configError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: tokens.gray050 }}>
      {/* App bar */}
      <Box sx={{ borderBottom: `1px solid ${tokens.gray200}`, bgcolor: tokens.white }}>
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
            p: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '9px',
              bgcolor: tokens.teal600,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              font: "700 15px/1 'Roboto',sans-serif",
            }}
          >
            W
          </Box>
          <Typography sx={{ font: "500 16px/22px 'Roboto',sans-serif", color: tokens.gray700 }}>
            Wellness Intake
          </Typography>
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ maxWidth: 760, mx: 'auto', p: '32px 24px 64px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
          <Box>
            <Typography sx={{ font: "700 22px/28px 'Roboto',sans-serif", letterSpacing: '-.01em' }}>
              Your submissions
            </Typography>
            <Typography sx={{ font: "400 13px/18px 'Roboto',sans-serif", color: tokens.gray600, mt: '3px' }}>
              Pick up a draft or start a new intake — your progress is saved.
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Button variant="contained" onClick={handleNewIntake} disabled={busyAction}>
              New intake
            </Button>
          </Box>
        </Box>

        {/* Filter / sort toolbar — all derived client-side from the fetched list */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <FilterMenu
            ariaLabel="Sort order"
            icon={<SwapVertIcon sx={{ fontSize: 18 }} />}
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => setFilters((f) => ({ ...f, sort }))}
          />
          <FilterMenu
            ariaLabel="Date range"
            icon={<EventOutlinedIcon sx={{ fontSize: 18 }} />}
            value={filters.dateRange}
            options={DATE_OPTIONS}
            onChange={(dateRange) => setFilters((f) => ({ ...f, dateRange }))}
          />
          <FilterMenu
            ariaLabel="Progress"
            icon={<ChecklistIcon sx={{ fontSize: 18 }} />}
            value={filters.progress}
            options={PROGRESS_OPTIONS}
            onChange={(progress) => setFilters((f) => ({ ...f, progress }))}
          />
          {hasActiveFilters(filters) && (
            <Button
              variant="text"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              sx={{
                minWidth: 0,
                px: 1,
                color: tokens.teal600,
                font: "500 13px/18px 'Roboto',sans-serif",
              }}
            >
              Clear
            </Button>
          )}
          <Typography
            sx={{ ml: 'auto', font: "400 13px/18px 'Roboto',sans-serif", color: tokens.gray600 }}
          >
            {visible.length} of {rows.length}
          </Typography>
        </Box>

        {listError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => void refreshList()}>
                Retry
              </Button>
            }
          >
            {listError}
          </Alert>
        )}

        {visible.length > 0 ? (
          <Box
            component="ul"
            sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
          >
            {visible.map((r) => (
              <SubmissionRow
                key={r.id}
                item={r}
                onOpen={handleOpenRow}
                onDelete={setConfirmDelete}
                opening={openingId === r.id}
              />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              border: `1px dashed ${tokens.gray300}`,
              borderRadius: `${tokens.radiusCard}px`,
              p: '40px 24px',
              textAlign: 'center',
              font: "400 14px/21px 'Roboto',sans-serif",
              color: tokens.gray600,
            }}
          >
            {rows.length === 0
              ? 'No submissions yet. Start a new intake to begin.'
              : 'No submissions match these filters.'}
          </Box>
        )}
      </Box>

      {open && config && (
        <FormDialog
          config={config}
          submission={open.submission}
          isNew={open.isNew}
          onPersisted={() => void refreshList()}
          onToast={(message) => showToast({ message, severity: 'success' })}
          onClose={() => {
            setOpen(null);
            void refreshList();
          }}
        />
      )}

      {/* Destructive-action guard. Deleting is permanent, so confirm first. */}
      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title" sx={{ font: "600 18px/24px 'Roboto',sans-serif" }}>
          Delete submission?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: tokens.gray600, font: "400 14px/21px 'Roboto',sans-serif" }}>
            “{confirmDelete?.title}” will be permanently deleted. This can’t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDelete) void handleDelete(confirmDelete);
              setConfirmDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        // Clear the content only after the exit animation finishes, so the alert
        // keeps its message and color while fading out.
        TransitionProps={{ onExited: () => setToast(null) }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          variant="standard"
          onClose={() => setToastOpen(false)}
          sx={{
            width: '100%',
            alignItems: 'center',
            borderRadius: `${tokens.radiusInput}px`,
            boxShadow: tokens.shadowPop,
            color: isErrorToast ? tokens.danger700 : tokens.teal700,
            bgcolor: isErrorToast ? tokens.danger100 : tokens.teal100,
            '& .MuiAlert-icon': {
              py: 0,
              alignItems: 'center',
              color: isErrorToast ? tokens.danger600 : tokens.teal600,
            },
            '& .MuiAlert-message': { py: 0 },
            '& .MuiAlert-action': { ml: 'auto', mr: 0, pt: 0, alignItems: 'center' },
          }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
