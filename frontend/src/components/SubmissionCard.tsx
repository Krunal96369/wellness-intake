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
 * Grid-tile presentation of one submission — the vertical counterpart to
 * `SubmissionRow`. Same whole-card open affordance: a stretched, keyboard-
 * activatable `ButtonBase` sits behind the content (`pointerEvents: none`) so
 * clicking anywhere opens the submission, while the delete button re-enables
 * pointer events for itself. Title is clamped to two lines so tiles stay even.
 */
export function SubmissionCard({
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
        flexDirection: 'column',
        minHeight: 150,
        p: '16px 18px',
        bgcolor: tokens.white,
        borderRadius: `${tokens.radiusCard}px`,
        border: `1px solid ${tokens.gray200}`,
        boxShadow: tokens.shadowCard,
        transition: 'background .15s',
        '&:hover': { bgcolor: tokens.gray050 },
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

      {/* Title + subtitle — clicks fall through to the open button. */}
      <Box sx={{ position: 'relative', zIndex: 1, pointerEvents: 'none', minWidth: 0 }}>
        <Typography
          sx={{
            font: "500 15px/22px 'Roboto',sans-serif",
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.title}
        </Typography>
        <Typography
          sx={{ font: "400 12px/16px 'Roboto',sans-serif", color: tokens.gray600, mt: '3px' }}
        >
          {subtitle}
        </Typography>
      </Box>

      {/* Progress bar fills the space above the footer. */}
      <Box sx={{ position: 'relative', zIndex: 1, pointerEvents: 'none', mt: 'auto', pt: 2 }}>
        <ProgressBar value={pct} />
      </Box>

      {/* Footer: status pill + delete. Falls through except the delete button. */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: 1.5,
        }}
      >
        <StatusPill status={item.status} />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
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
    </Box>
  );
}
