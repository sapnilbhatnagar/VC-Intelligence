import { createTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// ============================================================
// VC Intelligence — single light theme.
//
// Mint canvas, white rounded Apple-style tiles, a deep navy
// (#0E0E52) primary for actions + futuristic dark feature cards,
// and green (#1C7C54) for completed / positive data. Color stays
// purposeful: navy marks action + active state; the BUY / HOLD /
// PASS verdicts keep their own data scale.
//
// Token values are verified for WCAG AA contrast (see theme.test.ts).
// ============================================================

export const SANS =
  "'Geist', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO = "'Geist Mono', 'JetBrains Mono', ui-monospace, 'SF Mono', monospace";

// ── Design tokens ────────────────────────────────────────────
export const TOKENS = {
  // Deep navy — primary actions, active state, brand mark, dark feature cards.
  brand: '#0E0E52',
  brandHover: '#1B1B73',
  brandPressed: '#090936',
  brandText: '#0E0E52', // navy reads near-black on light: very high contrast
  onBrand: '#FFFFFF', // white text on a navy fill
  brandSoft: 'rgba(14,14,82,0.08)', // tint for selected rows / soft chips
  brandSoftBorder: 'rgba(14,14,82,0.22)',

  // Mint-tinted neutral surfaces.
  canvas: '#E8F7EE', // app background (mint)
  canvasSubtle: '#DEF1E6',
  surface: '#FFFFFF', // tiles, cards
  surfaceAlt: '#F2FBF6', // second neutral layer: sidebars, toolbars
  surfaceHover: '#EAF6EF',
  border: '#D2E9DB', // mint-tinted hairline
  borderStrong: '#BBDCC8',

  // Ink.
  textPrimary: '#13211B', // near-black, faint green
  textSecondary: '#566B60',
  textDisabled: '#8AA197',

  // Semantic data vocabulary.
  success: '#1C7C54', // green (completed / positive)
  warning: '#B7791F',
  error: '#C0413E',
  info: '#0E0E52', // navy (neutral/brand data)

  radius: 14,
} as const;

// ── Recommendation chips: accessible bg + text pairs (≥4.5:1) ──
export const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string }> = {
  'STRONG BUY': { bg: '#13603F', text: '#FFFFFF' },
  BUY: { bg: '#1C7C54', text: '#FFFFFF' },
  HOLD: { bg: '#B7791F', text: '#1C1A17' },
  PASS: { bg: '#C0413E', text: '#FFFFFF' },
  'STRONG PASS': { bg: '#8C2F2C', text: '#FFFFFF' },
};

// ── Financial scenario chart series ──────────────────────────
export const CHART_COLORS = {
  bear: '#C0413E', // red
  base: '#0E0E52', // navy — ties to the brand, distinct from bear/bull
  bull: '#1C7C54', // green
  grid: 'rgba(19,33,27,0.08)', // light-theme gridlines
  axis: '#8AA197',
  band: 'rgba(14,14,82,0.08)', // navy-tinted confidence band
} as const;

// ── Risk score (1–10) → semantic color + label ───────────────
export function riskColor(score: number): string {
  if (score <= 3.5) return TOKENS.success;
  if (score <= 6.5) return TOKENS.warning;
  return TOKENS.error;
}

export function riskLabel(score: number): string {
  if (score <= 3.5) return 'Low';
  if (score <= 6.5) return 'Medium';
  return 'High';
}

export const SEVERITY_COLORS: Record<string, string> = {
  Low: TOKENS.success,
  Medium: TOKENS.warning,
  High: TOKENS.error,
  Critical: '#8C2F2C',
};

// ============================================================
// Theme factory — one theme.
// ============================================================
export function createAppTheme(): Theme {
  const C = TOKENS;

  // Apple-style soft shadows: low-spread, layered, cool-ink tint.
  const s1 = '0 1px 2px rgba(19,33,27,0.04), 0 1px 3px rgba(19,33,27,0.05)';
  const s2 = '0 2px 6px rgba(19,33,27,0.05), 0 6px 16px rgba(19,33,27,0.06)';
  const s3 = '0 10px 30px rgba(19,33,27,0.08), 0 2px 8px rgba(19,33,27,0.05)';
  const s4 = '0 20px 56px rgba(14,14,52,0.14), 0 6px 16px rgba(19,33,27,0.07)';
  const shadows = [
    'none', s1, s1, s2, s2, s2, s3, s3, s3, s3,
    s3, s3, s4, s4, s4, s4, s4, s4, s4, s4,
    s4, s4, s4, s4, s4,
  ] as Theme['shadows'];

  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: C.brand, dark: C.brandPressed, light: C.brandHover, contrastText: C.onBrand },
      secondary: { main: C.success, contrastText: '#FFFFFF' },
      info: { main: C.info, contrastText: '#FFFFFF' },
      success: { main: C.success, contrastText: '#FFFFFF' },
      warning: { main: C.warning, contrastText: '#1C1A17' },
      error: { main: C.error, contrastText: '#FFFFFF' },
      background: { default: C.canvas, paper: C.surface },
      text: { primary: C.textPrimary, secondary: C.textSecondary, disabled: C.textDisabled },
      divider: C.border,
    },

    typography: {
      fontFamily: SANS,
      fontWeightLight: 400,
      fontWeightRegular: 450,
      fontWeightMedium: 550,
      fontWeightBold: 650,
      h1: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.022em', lineHeight: 1.12, color: C.textPrimary },
      h2: { fontSize: '1.5rem', fontWeight: 680, letterSpacing: '-0.02em', lineHeight: 1.18, color: C.textPrimary },
      h3: { fontSize: '1.25rem', fontWeight: 660, letterSpacing: '-0.015em', lineHeight: 1.22 },
      h4: { fontSize: '1.0625rem', fontWeight: 640, letterSpacing: '-0.01em' },
      h5: { fontSize: '0.9375rem', fontWeight: 600 },
      h6: { fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.02em', color: C.textSecondary },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.55, color: C.textSecondary },
      caption: { fontSize: '0.75rem', color: C.textSecondary, letterSpacing: '0.005em' },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: C.textSecondary,
      },
      button: { fontWeight: 600, letterSpacing: '0.005em', textTransform: 'none' },
    },

    shape: { borderRadius: C.radius },
    shadows,

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: C.canvas, color: C.textPrimary },
          '*': { scrollbarWidth: 'thin', scrollbarColor: `${C.borderStrong} transparent` },
          '*::-webkit-scrollbar': { width: '10px', height: '10px' },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: C.borderStrong,
            borderRadius: '6px',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          },
          '*::-webkit-scrollbar-thumb:hover': { background: '#A8CFB8' },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 11,
            padding: '8px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
          },
          containedPrimary: {
            backgroundColor: C.brand,
            color: C.onBrand,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: C.brandHover,
              boxShadow: '0 6px 18px rgba(14,14,82,0.28)',
              transform: 'translateY(-1px)',
            },
            '&:active': { backgroundColor: C.brandPressed, transform: 'translateY(0)' },
          },
          containedSuccess: {
            '&:hover': { boxShadow: '0 6px 18px rgba(28,124,84,0.28)', transform: 'translateY(-1px)' },
          },
          outlined: {
            borderColor: C.borderStrong,
            color: C.textPrimary,
            '&:hover': { borderColor: C.brand, backgroundColor: C.brandSoft },
          },
          text: { '&:hover': { backgroundColor: alpha(C.textPrimary, 0.04) } },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: C.surface,
            backgroundImage: 'none',
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            boxShadow: s1,
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: C.border },
        },
      },

      MuiTextField: { defaultProps: { variant: 'outlined' } },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: C.surface,
            borderRadius: 11,
            '& fieldset': { borderColor: C.borderStrong },
            '&:hover fieldset': { borderColor: '#A8CFB8' },
            '&.Mui-focused fieldset': { borderColor: C.brand, borderWidth: 1.5 },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.01em', borderRadius: 8 },
          outlined: { borderColor: C.borderStrong },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: C.surfaceAlt, borderColor: C.border, backgroundImage: 'none' },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: {
            backgroundColor: alpha(C.surface, 0.82),
            backgroundImage: 'none',
            color: C.textPrimary,
            borderBottom: `1px solid ${C.border}`,
            backdropFilter: 'blur(14px)',
            boxShadow: 'none',
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 5, backgroundColor: C.border, height: 7 },
          bar: { borderRadius: 5, backgroundColor: C.brand },
        },
      },

      MuiCircularProgress: { styleOverrides: { root: { color: C.brand } } },

      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.005em',
            textTransform: 'none',
            minHeight: 44,
            color: C.textSecondary,
            '&.Mui-selected': { color: C.textPrimary },
          },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: C.brand, height: 2, borderRadius: 2 } } },

      MuiDivider: { styleOverrides: { root: { borderColor: C.border } } },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 11,
            margin: '2px 8px',
            padding: '9px 12px',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            '&.Mui-selected': {
              backgroundColor: C.brandSoft,
              color: C.brandText,
              fontWeight: 600,
              '&:hover': { backgroundColor: 'rgba(14,14,82,0.14)' },
              '& .MuiListItemIcon-root': { color: C.brandText },
            },
            '&:hover': { backgroundColor: alpha(C.textPrimary, 0.04) },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 34, color: C.textSecondary } } },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: C.textPrimary,
            color: '#FFFFFF',
            fontSize: '0.72rem',
            fontWeight: 500,
            borderRadius: 9,
            padding: '6px 10px',
            boxShadow: s2,
          },
          arrow: { color: C.textPrimary },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, border: '1px solid', fontSize: '0.8125rem' },
          standardError: { borderColor: alpha(C.error, 0.3), backgroundColor: alpha(C.error, 0.07), color: '#7C2A28' },
          standardSuccess: { borderColor: alpha(C.success, 0.3), backgroundColor: alpha(C.success, 0.08), color: '#13543A' },
          standardWarning: { borderColor: alpha(C.warning, 0.3), backgroundColor: alpha(C.warning, 0.08), color: '#7A5210' },
          standardInfo: { borderColor: alpha(C.info, 0.3), backgroundColor: alpha(C.info, 0.08), color: C.brand },
        },
      },

      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderColor: C.borderStrong,
            color: C.textSecondary,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: C.brandSoft,
              color: C.brandText,
              borderColor: C.brandSoftBorder,
              '&:hover': { backgroundColor: 'rgba(14,14,82,0.14)' },
            },
            '&:hover': { backgroundColor: alpha(C.textPrimary, 0.04) },
          },
        },
      },
    },
  });
}

// ============================================================
// Single exported theme.
// ============================================================
export const theme = createAppTheme();
export default theme;
