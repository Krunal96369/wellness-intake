import Box from '@mui/material/Box';
import { tokens } from '../theme';

/** Thin teal progress bar on a light-gray track (4px, fully rounded). */
export function ProgressBar({ value, width = '100%' }: { value: number; width?: number | string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <Box sx={{ width, height: 4, borderRadius: 999, bgcolor: tokens.gray200, overflow: 'hidden' }}>
      <Box
        sx={{
          width: `${pct}%`,
          height: '100%',
          bgcolor: tokens.teal600,
          borderRadius: 999,
          transition: 'width .3s',
        }}
      />
    </Box>
  );
}
