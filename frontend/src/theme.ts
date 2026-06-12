import { createTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// ============================================================
// VC Intelligence — "institutional daylight" design system.
//
// One light theme for a due-diligence desk: cool-gray canvas,
// white tiles with hairline borders and soft diffuse shadows
// (Apple-style structure), one deep cobalt accent for actions
// and active state, and a disciplined green/amber/red data
// vocabulary reserved for verdicts and risk (Google-style color
// discipline). Typography: Hanken Grotesk for UI and display,
// JetBrains Mono for figures.
//
// Token values are verified for WCAG AA contrast (see theme.test.ts).
// ============================================================

export const SANS =
  "'Hanken Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', monospace";

// ── Design tokens ────────────────────────────────────────────
export const TOKENS = {
  // Deep cobalt — primary actions, active state, links, focus.
  brand: '#1D4ED8',
  brandHover: '#2563EB',
  brandPressed: '#1740B3',
  brandText: '#1D4ED8', // AA on white (6.4:1)
  onBrand: '#FFFFFF',
  brandSoft: 'rgba(29,78,216,0.08)', // tint for selected rows / soft chips
  brandSoftBorder: 'rgba(29,78,216,0.24)',

  // Cool neutral surfaces.
  canvas: '#F4F6F8', // app background
  canvasSubtle: '#EDF0F4',
  surface: '#FFFFFF', // tiles, cards
  surfaceAlt: '#F9FAFB', // second neutral layer: rail, toolbars
  surfaceHover: '#F1F4F7',
  border: '#E5E8ED', // hairline
  borderStrong: '#D3D9E0', // inputs, stronger dividers

  // Ink.
  textPrimary: '#161B22',
  textSecondary: '#57606C',
  textDisabled: '#8B95A1',

  // Semantic data vocabulary (verdicts, risk, status — not the brand).
  success: '#188038',
  warning: '#A05E00',
  error: '#C5221F',
  info: '#1D4ED8',

  radius: 14,
} as const;

// ── Recommendation chips: accessible bg + text pairs (>= 4.5:1) ──
export const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string }> = {
  'STRONG BUY': { bg: '#0D5C36', text: '#FFFFFF' },
  BUY: { bg: '#188038', text: '#FFFFFF' },
  HOLD: { bg: '#B7791F', text: '#15191E' },
  PASS: { bg: '#C5221F', text: '#FFFFFF' },
  'STRONG PASS': { bg: '#8C1D18', text: '#FFFFFF' },
};

// ── Financial scenario chart series ──────────────────────────
export const CHART_COLORS = {
  bear: '#C5221F', // red
  base: '#1D4ED8', // cobalt — ties to the brand, distinct from bear/bull
  bull: '#188038', // green
  grid: 'rgba(22,27,34,0.08)',
  axis: '#8B95A1',
  band: 'rgba(29,78,216,0.08)', // cobalt-tinted confidence band
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
  Critical: '#8C1D18',
};

// ============================================================
// Theme factory — one theme.
// ============================================================
export function createAppTheme(): Theme {
  const C = TOKENS;

  // Apple-style soft shadows: low-spread, layered, cool-ink tint.
  const s1 = '0 1px 2px rgba(22,27,34,0.04), 0 1px 3px rgba(22,27,34,0.05)';
  const s2 = '0 2px 6px rgba(22,27,34,0.05), 0 6px 16px rgba(22,27,34,0.06)';
  const s3 = '0 10px 30px rgba(22,27,34,0.08), 0 2px 8px rgba(22,27,34,0.05)';
  const s4 = '0 20px 56px rgba(22,27,34,0.14), 0 6px 16px rgba(22,27,34,0.07)';
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
      warning: { main: C.warning, contrastText: '#FFFFFF' },
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
      fontWeightBold: 700,
      h1: { fontSize: '1.875rem', fontWeight: 750, letterSpacing: '-0.022em', lineHeight: 1.12, color: C.textPrimary },
      h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.18, color: C.textPrimary },
      h3: { fontSize: '1.25rem', fontWeight: 680, letterSpacing: '-0.015em', lineHeight: 1.22 },
      h4: { fontSize: '1.0625rem', fontWeight: 660, letterSpacing: '-0.01em' },
      h5: { fontSize: '0.9375rem', fontWeight: 620 },
      h6: { fontSize: '0.8125rem', fontWeight: 620, letterSpacing: '0.02em', color: C.textSecondary },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.55, color: C.textSecondary },
      caption: { fontSize: '0.75rem', color: C.textSecondary, letterSpacing: '0.005em' },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 650,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: C.textSecondary,
      },
      button: { fontWeight: 620, letterSpacing: '0.005em', textTransform: 'none' },
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
          '*::-webkit-scrollbar-thumb:hover': { background: '#BCC5CF' },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 18px',
            fontSize: '0.875rem',
            fontWeight: 620,
            transition: 'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
          },
          containedPrimary: {
            backgroundColor: C.brand,
            color: C.onBrand,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: C.brandHover,
              boxShadow: '0 6px 18px rgba(29,78,216,0.28)',
              transform: 'translateY(-1px)',
            },
            '&:active': { backgroundColor: C.brandPressed, transform: 'translateY(0)' },
          },
          containedSuccess: {
            '&:hover': { boxShadow: '0 6px 18px rgba(24,128,56,0.28)', transform: 'translateY(-1px)' },
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
            borderRadius: 16,
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
            borderRadius: 10,
            '& fieldset': { borderColor: C.borderStrong },
            '&:hover fieldset': { borderColor: '#AEB8C4' },
            '&.Mui-focused fieldset': { borderColor: C.brand, borderWidth: 1.5 },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 620, fontSize: '0.72rem', letterSpacing: '0.01em', borderRadius: 8 },
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
            backgroundColor: alpha(C.surface, 0.85),
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
            fontWeight: 620,
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
            borderRadius: 10,
            margin: '2px 8px',
            padding: '9px 12px',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            '&.Mui-selected': {
              backgroundColor: C.brandSoft,
              color: C.brandText,
              fontWeight: 620,
              '&:hover': { backgroundColor: 'rgba(29,78,216,0.14)' },
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
          standardError: { borderColor: alpha(C.error, 0.3), backgroundColor: alpha(C.error, 0.06), color: '#7E1714' },
          standardSuccess: { borderColor: alpha(C.success, 0.3), backgroundColor: alpha(C.success, 0.07), color: '#0D5C36' },
          standardWarning: { borderColor: alpha(C.warning, 0.3), backgroundColor: alpha(C.warning, 0.08), color: '#6E4100' },
          standardInfo: { borderColor: alpha(C.info, 0.3), backgroundColor: alpha(C.info, 0.07), color: C.brandPressed },
        },
      },

      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderColor: C.borderStrong,
            color: C.textSecondary,
            fontWeight: 620,
            fontSize: '0.75rem',
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: C.brandSoft,
              color: C.brandText,
              borderColor: C.brandSoftBorder,
              '&:hover': { backgroundColor: 'rgba(29,78,216,0.14)' },
            },
            '&:hover': { backgroundColor: alpha(C.textPrimary, 0.04) },
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            boxShadow: s4,
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
