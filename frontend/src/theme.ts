import { createTheme } from '@mui/material/styles';

/**
 * MUI theme encoding the Wellness Intake design tokens (see
 * design-mock/colors_and_type.css). Teal is the only accent; everything else is
 * neutral. Material UI defaults are softened: sentence-case buttons, gentle
 * radii, thin borders instead of heavy shadows.
 */

// --- Raw tokens (kept here so components can reference them too) ---
export const tokens = {
  teal700: '#0F6055',
  teal600: '#147D6F',
  teal500: '#1B8E7E',
  teal200: '#8FC4BC',
  teal100: '#D6E9E5',
  teal050: '#EAF4F2',
  ink900: '#1F2937',
  gray700: '#4B5563',
  gray600: '#6B7280',
  gray500: '#9098A1',
  gray400: '#B9BEC4',
  gray300: '#D7DBDE',
  gray200: '#E4E7E9',
  gray150: '#ECEEEF',
  gray100: '#F2F4F4',
  gray050: '#F7F8F8',
  white: '#FFFFFF',
  danger600: '#C2554A',
  danger700: '#A8463C',
  danger100: '#F6E4E1',
  radiusInput: 8,
  radiusCard: 12,
  shadowCard: '0 1px 2px rgba(31,41,55,.04), 0 1px 1px rgba(31,41,55,.03)',
  shadowPop: '0 4px 16px rgba(31,41,55,.10)',
} as const;

const fontFamily = "'Roboto', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: tokens.teal600,
      light: tokens.teal500,
      dark: tokens.teal700,
      contrastText: tokens.white,
    },
    error: { main: tokens.danger600, dark: tokens.danger700 },
    background: { default: tokens.gray050, paper: tokens.white },
    text: { primary: tokens.ink900, secondary: tokens.gray600, disabled: tokens.gray500 },
    divider: tokens.gray200,
  },
  shape: { borderRadius: tokens.radiusInput },
  typography: {
    fontFamily,
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '.01em' },
    h1: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: tokens.gray050 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: tokens.radiusInput, padding: '8px 18px' },
        containedPrimary: {
          boxShadow: '0 1px 1px rgba(15,96,85,.18)',
          '&:hover': { backgroundColor: tokens.teal500 },
          '&:active': { backgroundColor: tokens.teal700 },
        },
        textPrimary: { color: tokens.teal600, '&:hover': { color: tokens.teal700 } },
        outlined: {
          borderColor: tokens.gray300,
          color: tokens.ink900,
          '&:hover': { borderColor: tokens.gray400, backgroundColor: tokens.gray100 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radiusInput,
          backgroundColor: tokens.white,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.gray300 },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.gray400 },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.teal600,
            borderWidth: 2,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: tokens.gray600, '&.Mui-focused': { color: tokens.teal600 } },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: tokens.radiusCard } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: tokens.radiusInput },
        filled: { backgroundColor: tokens.gray150, color: tokens.gray700 },
      },
    },
  },
});
