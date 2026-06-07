import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { tokens } from '../theme';
import type { SubmissionListItem } from '../types';
import { ProgressBar } from './ProgressBar';
import { StatusPill } from './StatusPill';

/**
 * One row in the submissions list: title, progress, status. The whole card is a
 * single (keyboard-accessible) button that opens the submission; a delete action
 * sits on top of it. Accessibility note: the open button is stretched behind the
 * content via `position: absolute`, and the content has `pointerEvents: none` so
 * clicks fall through to it — except the delete button, which re-enables them
 * for itself. This keeps "click anywhere to open" without nesting buttons.
 */
export function SubmissionRow({
  item,
  onOpen,
  onDelete,
  opening = false,
}: {
  item: SubmissionListItem;
  onOpen: (id: string) => void;
  onDelete: (item: SubmissionListItem) => void;
  opening?: boolean;
}) {
  const { completed, total } = item.progress;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const subtitle =
    item.status === 'completed'
      ? 'Submitted'
      : `Saved · step ${Math.min(item.currentStep + 1, total)} of ${total}`;

  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: '16px 18px',
        bgcolor: tokens.white,
        borderRadius: `${tokens.radiusCard}px`,
        border: `1px solid ${tokens.gray200}`,
        boxShadow: tokens.shadowCard,
        transition: 'background .15s',
        '&:hover': { bgcolor: tokens.gray050 },
        // Delete is revealed on hover / keyboard focus; always shown where there
        // is no hover (touch). It keeps its layout slot so the chevron never shifts.
        '& .row-delete-btn': { opacity: 0, transition: 'opacity .15s ease' },
        '&:hover .row-delete-btn, &:focus-within .row-delete-btn': { opacity: 1 },
        '@media (hover: none)': { '& .row-delete-btn': { opacity: 1 } },
      }}
    >
      {/* Stretched, whole-card open button (keyboard-activatable, focus ring). */}
      <ButtonBase
        aria-label={`Open submission ${item.title}`}
        onClick={() => onOpen(item.id)}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          borderRadius: `${tokens.radiusCard}px`,
          '&:focus-visible': { outline: `2px solid ${tokens.teal600}`, outlineOffset: 2 },
        }}
      />

      {/* Title block — clicks fall through to the open button. */}
      <Box sx={{ minWidth: 0, position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        <Typography
          sx={{
            font: "500 15px/22px 'Roboto',sans-serif",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.title}
        </Typography>
        <Typography
          sx={{ font: "400 12px/16px 'Roboto',sans-serif", color: tokens.gray600, mt: '2px' }}
        >
          {subtitle}
        </Typography>
      </Box>

      {/* Right cluster — also falls through, except the delete button. Each item
          lives in a fixed-width column so bars, pills and icons line up across
          rows: progress right-aligned, pill left-aligned. */}
      <Box
        sx={{
          ml: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <Box sx={{ width: 150, display: { xs: 'none', sm: 'flex' }, justifyContent: 'flex-end' }}>
          <ProgressBar value={pct} width={110} />
        </Box>
        <Box sx={{ width: 104, display: 'flex', justifyContent: 'flex-start' }}>
          <StatusPill status={item.status} />
        </Box>
        <IconButton
          className="row-delete-btn"
          aria-label={`Delete submission ${item.title}`}
          onClick={() => onDelete(item)}
          size="small"
          sx={{
            pointerEvents: 'auto',
            borderRadius: `${tokens.radiusInput}px`,
            color: tokens.gray400,
            '&:hover': { color: tokens.danger600, bgcolor: tokens.danger100 },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
          {opening ? (
            <CircularProgress size={18} sx={{ color: tokens.gray400 }} />
          ) : (
            <ChevronRightIcon sx={{ fontSize: 22, color: tokens.gray400 }} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
