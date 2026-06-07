import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../theme';

/**
 * The mock's stepper: step labels over a thin 2px underline that doubles as the
 * progress indicator. Active = teal; reached = teal underline; upcoming = gray.
 * Only reached steps are interactive — each is a real (keyboard-focusable)
 * button, disabled until reached.
 *
 * On phones the per-step labels would cram and truncate, so we collapse to a
 * single segmented underline (one cell per step, teal up to the current one)
 * plus a "Step N of M · <title>" line. Navigation there is handled by the
 * footer's Back/Save-and-next buttons.
 */
export function Stepper({
  steps,
  current,
  maxReached,
  onJump,
}: {
  steps: string[];
  current: number;
  maxReached: number;
  onJump: (index: number) => void;
}) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

  if (compact) {
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {steps.map((label, i) => (
            <Box
              key={label}
              sx={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                bgcolor: i <= current ? tokens.teal600 : tokens.gray200,
                transition: 'background .2s',
              }}
            />
          ))}
        </Box>
        <Box
          aria-current="step"
          sx={{
            font: "500 14px/20px 'Roboto', sans-serif",
            color: tokens.teal600,
            mt: 1.25,
          }}
        >
          Step {current + 1} of {steps.length} · {steps[current]}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {steps.map((label, i) => {
        const active = i === current;
        const reached = i <= maxReached;
        const barColor = active || reached ? tokens.teal600 : tokens.gray200;
        const textColor = active ? tokens.teal600 : reached ? tokens.gray600 : tokens.gray500;
        return (
          <ButtonBase
            key={label}
            disabled={!reached}
            onClick={() => onJump(i)}
            aria-label={`Go to step: ${label}`}
            aria-current={active ? 'step' : undefined}
            sx={{
              flex: 1,
              display: 'block',
              textAlign: 'left',
              borderRadius: `${tokens.radiusInput}px`,
              '&.Mui-disabled': { cursor: 'default' },
              '&:focus-visible': { outline: `2px solid ${tokens.teal600}`, outlineOffset: 2 },
            }}
          >
            <Box
              sx={{
                height: 2,
                borderRadius: 2,
                bgcolor: barColor,
                mb: 1.25,
                transition: 'background .2s',
              }}
            />
            <Box
              sx={{
                font: "500 14px/20px 'Roboto', sans-serif",
                letterSpacing: '.01em',
                color: textColor,
                transition: 'color .2s',
              }}
            >
              {label}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
