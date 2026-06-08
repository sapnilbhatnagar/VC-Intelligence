import { createTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// ============================================================
// VC Intelligence — single light theme.
//
// One theme only. Warm "amber/honey" graphite-neutral surfaces,
// a single signature orange accent (#FA7000), Apple-style tiles
// (white surface, hairline border, soft shadow, generous radius).
// Color stays restrained: the accent marks action + active state,
// and the BUY / HOLD / PASS data vocabulary lives in its own scale.
//
// All token values are verified for WCAG AA contrast (see theme.test.ts).
// ============================================================

// ── Type families ────────────────────────────────────────────
// Geist is the signature face; it degrades gracefully to Inter and
// the system stack if the webfont has not loaded. Mono is for figures.
export const SANS =
  "'Geist', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO = "'Geist Mono', 'JetBrains Mono', ui-monospace, 'SF Mono', monospace";

// ── Design tokens ────────────────────────────────────────────
export const TOKENS = {
  // Signature orange — fills, active state, focus, brand mark, key accents.
  brand: '#FA7000',
  brandHover: '#FF8A2E', // lighter lift on hover (ink text contrast only improves)
  brandPressed: '#E26500',
  brandText: '#B5530E', // AA-safe orange for links / inline emphasis on light
  onBrand: '#1C1A17', // ink that sits on a brand fill (≥6:1)
  brandSoft: 'rgba(250,112,0,0.10)', // tint for selected rows, soft chips
  brandSoftBorder: 'rgba(250,112,0,0.28)',

  // Warm neutral surfaces (the "paper" of the product).
  canvas: '#F7F6F2', // app background
  canvasSubtle: '#F1EFE9', // alternating sections / wells
  surface: '#FFFFFF', // tiles, cards
  surfaceAlt: '#FBFAF7', // second neutral layer: sidebars, toolbars
  surfaceHover: '#F3F1EB',
  border: '#EBE7DF', // hairline
  borderStrong: '#DBD5C9', // inputs, stronger dividers

  // Graphite ink.
  textPrimary: '#1C1A17',
  textSecondary: '#6B645B',
  textDisabled: '#A39B90',

  // Semantic data vocabulary (recommendation, risk, status).
  success: '#2E7D5B',
  warning: '#B7791F',
  error: '#C0413E',
  info: '#566270', // neutral slate (deliberately not blue)

  radius: 12,
} as const;

// ── Recommendation chips: accessible bg + text pairs (≥4.5:1) ──
export const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string }> = {
  'STRONG BUY': { bg: '#1F6B4A', text: '#FFFFFF' },
  BUY: { bg: '#2E7D5B', text: '#FFFFFF' },
  HOLD: { bg: '#B7791F', text: '#1C1A17' },
  PASS: { bg: '#C0413E', text: '#FFFFFF' },
  'STRONG PASS': { bg: '#8C2F2C', text: '#FFFFFF' },
};

// ── Financial scenario chart series (no electric blue) ────────
export const CHART_COLORS = {
  bear: '#C0413E', // red
  base: '#B5530E', // deep brand orange — ties to identity, distinct from bear/bull
  bull: '#2E7D5B', // green
  grid: 'rgba(28,26,23,0.08)', // light-theme gridlines
  axis: '#A39B90',
  band: 'rgba(250,112,0,0.08)', // brand-tinted confidence band
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

// Severity word (Low/Medium/High/Critical) → color, for parsed LLM output.
export const SEVERITY_COLORS: Record<string, string> = {
  Low: TOKENS.success,
  Medium: TOKENS.warning,
  High: TOKENS.error,
  Critical: '#8C2F2C',
};

// ============================================================
// Theme factory — kept as a function for call-site compatibility,
// but there is only one theme.
// ============================================================
export function createAppTheme(): Theme {
  const C = TOKENS;

  // Apple-style soft shadows: low-spread, layered, warm-black tint.
  const s1 = '0 1px 2px rgba(28,26,23,0.04), 0 1px 3px rgba(28,26,23,0.05)';
  const s2 = '0 2px 4px rgba(28,26,23,0.04), 0 4px 12px rgba(28,26,23,0.06)';
  const s3 = '0 8px 24px rgba(28,26,23,0.08), 0 2px 6px rgba(28,26,23,0.05)';
  const s4 = '0 16px 48px rgba(28,26,23,0.12), 0 4px 12px rgba(28,26,23,0.06)';
  const shadows = [
    'none', s1, s1, s2, s2, s2, s3, s3, s3, s3,
    s3, s3, s4, s4, s4, s4, s4, s4, s4, s4,
    s4, s4, s4, s4, s4,
  ] as Theme['shadows'];

  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: C.brand, dark: C.brandPressed, light: C.brandHover, contrastText: C.onBrand },
      secondary: { main: C.brandText, contrastText: '#FFFFFF' },
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
      // Fixed rem scale (product register), tight grotesk tracking on headings.
      h1: { fontSize: '1.875rem', fontWeight: 680, letterSpacing: '-0.02em', lineHeight: 1.15, color: C.textPrimary },
      h2: { fontSize: '1.5rem', fontWeight: 660, letterSpacing: '-0.018em', lineHeight: 1.2, color: C.textPrimary },
      h3: { fontSize: '1.25rem', fontWeight: 640, letterSpacing: '-0.014em', lineHeight: 1.25 },
      h4: { fontSize: '1.0625rem', fontWeight: 620, letterSpacing: '-0.01em' },
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
          '*::-webkit-scrollbar-thumb:hover': { background: '#C9C2B5' },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 16px',
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
              boxShadow: '0 4px 14px rgba(250,112,0,0.30)',
              transform: 'translateY(-1px)',
            },
            '&:active': { backgroundColor: C.brandPressed, transform: 'translateY(0)' },
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
            borderRadius: 14,
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
            '&:hover fieldset': { borderColor: '#C9C2B5' },
            '&.Mui-focused fieldset': { borderColor: C.brand, borderWidth: 1.5 },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.01em', borderRadius: 7 },
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
            backdropFilter: 'blur(12px)',
            boxShadow: 'none',
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4, backgroundColor: C.border, height: 6 },
          bar: { borderRadius: 4, backgroundColor: C.brand },
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
            borderRadius: 9,
            margin: '1px 8px',
            padding: '7px 10px',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            '&.Mui-selected': {
              backgroundColor: C.brandSoft,
              color: C.brandText,
              fontWeight: 600,
              '&:hover': { backgroundColor: 'rgba(250,112,0,0.16)' },
              '& .MuiListItemIcon-root': { color: C.brandText },
            },
            '&:hover': { backgroundColor: alpha(C.textPrimary, 0.035) },
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
            borderRadius: 8,
            padding: '6px 10px',
            boxShadow: s2,
          },
          arrow: { color: C.textPrimary },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10, border: '1px solid', fontSize: '0.8125rem' },
          standardError: { borderColor: alpha(C.error, 0.3), backgroundColor: alpha(C.error, 0.07), color: '#7C2A28' },
          standardSuccess: { borderColor: alpha(C.success, 0.3), backgroundColor: alpha(C.success, 0.07), color: '#1C5740' },
          standardWarning: { borderColor: alpha(C.warning, 0.3), backgroundColor: alpha(C.warning, 0.08), color: '#7A5210' },
          standardInfo: { borderColor: alpha(C.info, 0.3), backgroundColor: alpha(C.info, 0.08), color: '#3C4651' },
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
              '&:hover': { backgroundColor: 'rgba(250,112,0,0.16)' },
            },
            '&:hover': { backgroundColor: alpha(C.textPrimary, 0.035) },
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
