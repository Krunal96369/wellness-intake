import Box from '@mui/material/Box';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/EditOutlined';
import { tokens } from '../theme';
import type { SubmissionStatus } from '../types';

/** Small rounded status pill: teal for Completed, neutral gray for Draft. */
export function StatusPill({ status }: { status: SubmissionStatus }) {
  const done = status === 'completed';
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        borderRadius: 999,
        padding: '4px 12px 4px 10px',
        font: "500 12px/16px 'Roboto', sans-serif",
        letterSpacing: '.02em',
        color: done ? tokens.teal600 : tokens.gray600,
        bgcolor: done ? tokens.teal100 : tokens.gray150,
      }}
    >
      {done ? (
        <CheckIcon sx={{ fontSize: 15 }} />
      ) : (
        <EditIcon sx={{ fontSize: 15 }} />
      )}
      {done ? 'Completed' : 'Draft'}
    </Box>
  );
}
