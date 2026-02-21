import { createTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// ============================================================
// Theme mode type (also exported from types/index.ts — keep in sync)
// ============================================================
export type ThemeMode = 'dark' | 'light' | 'advanced';

// ============================================================
// Design token sets per theme
// ============================================================
interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderHover: string;
  accent: string;
  accentDim: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  fontFamily: string;
  borderRadius: number;
  muiMode: 'dark' | 'light';
}

const TOKENS: Record<ThemeMode, ThemeTokens> = {
  dark: {
    bg: '#0A0E1A',
    surface: '#111827',
    surfaceHover: '#1A2235',
    border: '#1F2937',
    borderHover: '#374151',
    accent: '#3B82F6',
    accentDim: '#1D4ED8',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textDisabled: '#4B5563',
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: 8,
    muiMode: 'dark',
  },
  light: {
    bg: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceHover: '#F3F4F6',
    border: '#E5E7EB',
    borderHover: '#D1D5DB',
    accent: '#2563EB',
    accentDim: '#1D4ED8',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textDisabled: '#9CA3AF',
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: 8,
    muiMode: 'light',
  },
  advanced: {
    bg: '#0D0D14',
    surface: '#16162A',
    surfaceHover: '#1E1E35',
    border: '#2D2D52',
    borderHover: '#3D3D72',
    accent: '#A78BFA',
    accentDim: '#7C3AED',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    textPrimary: '#EDE9FE',
    textSecondary: '#A78BFA',
    textDisabled: '#4B4B7A',
    fontFamily: '"Inter", system-ui, sans-serif',
    borderRadius: 14,
    muiMode: 'dark',
  },
};

// Export tokens so components can reference them directly when needed
export const THEME_TOKENS = TOKENS;

// ============================================================
// Theme factory
// ============================================================
export function createAppTheme(mode: ThemeMode): Theme {
  const C = TOKENS[mode];
  const isAdvanced = mode === 'advanced';
  const isDark = mode === 'dark';

  // Shadows: advanced uses glass-like card shadows; dark uses deep shadows; light is in between
  const buildShadows = (): Theme['shadows'] => {
    if (isAdvanced) {
      const subtle = `0 1px 3px ${alpha('#000', 0.4)}, 0 0 1px ${alpha(C.accent, 0.1)}`;
      const mid = `0 4px 16px ${alpha('#000', 0.5)}, 0 0 8px ${alpha(C.accent, 0.08)}`;
      const large = `0 8px 32px ${alpha('#000', 0.6)}, 0 0 16px ${alpha(C.accent, 0.12)}`;
      return [
        'none', subtle, subtle, mid, mid, large, large, large, large, large,
        large, large, large, large, large, large, large, large, large, large,
        large, large, large, large, large,
      ] as Theme['shadows'];
    }
    if (isDark) {
      return [
        'none',
        `0 1px 2px ${alpha(C.accent, 0.05)}`,
        `0 1px 3px ${alpha('#000', 0.3)}, 0 1px 2px ${alpha('#000', 0.2)}`,
        `0 4px 6px ${alpha('#000', 0.3)}, 0 2px 4px ${alpha('#000', 0.2)}`,
        `0 10px 15px ${alpha('#000', 0.35)}, 0 4px 6px ${alpha('#000', 0.2)}`,
        `0 20px 25px ${alpha('#000', 0.4)}, 0 10px 10px ${alpha('#000', 0.1)}`,
        ...Array(19).fill(`0 25px 50px ${alpha('#000', 0.5)}`),
      ] as Theme['shadows'];
    }
    // light
    return [
      'none',
      '0 1px 2px rgba(0,0,0,0.05)',
      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      '0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
      '0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)',
      '0 20px 25px rgba(0,0,0,0.08), 0 10px 10px rgba(0,0,0,0.04)',
      ...Array(19).fill('0 25px 50px rgba(0,0,0,0.12)'),
    ] as Theme['shadows'];
  };

  return createTheme({
    palette: {
      mode: C.muiMode,
      primary: {
        main: C.accent,
        dark: C.accentDim,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isAdvanced ? '#818CF8' : '#6366F1',
      },
      success: { main: C.success },
      warning: { main: C.warning },
      error: { main: C.error },
      background: {
        default: C.bg,
        paper: C.surface,
      },
      text: {
        primary: C.textPrimary,
        secondary: C.textSecondary,
        disabled: C.textDisabled,
      },
      divider: C.border,
    },

    typography: {
      fontFamily: C.fontFamily,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: {
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: isAdvanced ? '-0.03em' : '-0.02em',
        color: C.textPrimary,
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: isAdvanced ? '-0.02em' : '-0.01em',
      },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      h4: { fontSize: '1.125rem', fontWeight: 600 },
      h5: { fontSize: '1rem', fontWeight: 600 },
      h6: {
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: C.textSecondary,
      },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        color: C.textSecondary,
      },
      caption: {
        fontSize: '0.75rem',
        color: C.textSecondary,
        letterSpacing: '0.04em',
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.025em',
        textTransform: 'none',
      },
    },

    shape: { borderRadius: C.borderRadius },

    shadows: buildShadows(),

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${C.border} transparent`,
          },
          '*::-webkit-scrollbar': { width: '6px', height: '6px' },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: C.border,
            borderRadius: '3px',
          },
          '*::-webkit-scrollbar-thumb:hover': { background: C.borderHover },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: C.borderRadius,
            padding: '8px 20px',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          },
          contained: isAdvanced
            ? {
                // Advanced: violet gradient + subtle glow
                background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`,
                color: '#FFFFFF',
                boxShadow: `0 2px 12px ${alpha(C.accent, 0.35)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`,
                  boxShadow: `0 4px 20px ${alpha(C.accent, 0.55)}, 0 0 0 1px ${alpha(C.accent, 0.3)}`,
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'translateY(0)' },
              }
            : {
                // Dark / Light: gradient button with glow
                background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`,
                boxShadow: `0 2px 8px ${alpha(C.accent, 0.3)}`,
                '&:hover': {
                  boxShadow: `0 4px 16px ${alpha(C.accent, 0.5)}`,
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'translateY(0)' },
              },
          outlined: {
            borderColor: C.border,
            '&:hover': {
              borderColor: C.accent,
              backgroundColor: alpha(C.accent, 0.06),
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: isAdvanced
            ? {
                // Advanced: glass-morphism with violet border glow on hover
                backgroundColor: C.surface,
                backgroundImage: 'none',
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                boxShadow: `0 2px 8px ${alpha('#000', 0.4)}, inset 0 1px 0 ${alpha(C.accent, 0.05)}`,
                backdropFilter: 'blur(12px)',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                '&:hover': {
                  borderColor: alpha(C.accent, 0.4),
                  boxShadow: `0 4px 24px ${alpha('#000', 0.5)}, 0 0 0 1px ${alpha(C.accent, 0.2)}, inset 0 1px 0 ${alpha(C.accent, 0.08)}`,
                },
              }
            : {
                backgroundColor: C.surface,
                backgroundImage: 'none',
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                boxShadow: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(C.textPrimary, 0.03),
              borderRadius: C.borderRadius,
              '& fieldset': { borderColor: C.border },
              '&:hover fieldset': { borderColor: C.borderHover },
              '&.Mui-focused fieldset': {
                borderColor: C.accent,
                boxShadow: `0 0 0 3px ${alpha(C.accent, 0.15)}`,
              },
            },
          },
        },
      },

      MuiSelect: {
        styleOverrides: {
          outlined: { backgroundColor: alpha(C.textPrimary, 0.03) },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.03em',
            borderRadius: isAdvanced ? 10 : 4,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: isAdvanced
            ? {
                backgroundColor: C.surface,
                borderColor: C.border,
                backgroundImage: 'none',
                backdropFilter: 'blur(16px)',
              }
            : {
                backgroundColor: C.surface,
                borderColor: C.border,
                backgroundImage: 'none',
              },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: isAdvanced
            ? {
                // Advanced: deep indigo with blur
                backgroundColor: alpha('#0D0D20', 0.92),
                backgroundImage: 'none',
                borderBottom: `1px solid ${C.border}`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 1px 0 ${alpha(C.accent, 0.1)}`,
              }
            : {
                backgroundColor: alpha(C.surface, 0.95),
                backgroundImage: 'none',
                borderBottom: `1px solid ${C.border}`,
                backdropFilter: 'blur(12px)',
                boxShadow: 'none',
              },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: C.border,
          },
          bar: {
            borderRadius: 4,
            background: `linear-gradient(90deg, ${C.accent} 0%, ${isAdvanced ? '#818CF8' : '#6366F1'} 100%)`,
          },
        },
      },

      MuiCircularProgress: {
        styleOverrides: {
          root: { color: C.accent },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.02em',
            textTransform: 'none',
            minHeight: 44,
            '&.Mui-selected': { color: C.accent },
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: C.accent, height: 2 },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: C.border },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: C.borderRadius,
            margin: '2px 8px',
            padding: '8px 12px',
            transition: 'all 0.15s ease',
            '&.Mui-selected': {
              backgroundColor: alpha(C.accent, 0.12),
              color: C.accent,
              '&:hover': { backgroundColor: alpha(C.accent, 0.18) },
              '& .MuiListItemIcon-root': { color: C.accent },
            },
            '&:hover': { backgroundColor: alpha(C.textPrimary, 0.04) },
          },
        },
      },

      MuiListItemIcon: {
        styleOverrides: {
          root: { minWidth: 36, color: C.textSecondary },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            color: C.textPrimary,
            fontSize: '0.75rem',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
          arrow: { color: C.surface },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: C.borderRadius,
            border: '1px solid',
          },
          standardError: {
            borderColor: alpha(C.error, 0.3),
            backgroundColor: alpha(C.error, 0.08),
          },
          standardSuccess: {
            borderColor: alpha(C.success, 0.3),
            backgroundColor: alpha(C.success, 0.08),
          },
          standardWarning: {
            borderColor: alpha(C.warning, 0.3),
            backgroundColor: alpha(C.warning, 0.08),
          },
          standardInfo: {
            borderColor: alpha(C.accent, 0.3),
            backgroundColor: alpha(C.accent, 0.08),
          },
        },
      },

      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderColor: C.border,
            color: C.textSecondary,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: alpha(C.accent, 0.12),
              color: C.accent,
              borderColor: alpha(C.accent, 0.4),
              '&:hover': { backgroundColor: alpha(C.accent, 0.18) },
            },
            '&:hover': { backgroundColor: alpha(C.textPrimary, 0.04) },
          },
        },
      },
    },
  });
}

// ============================================================
// Default export — dark theme for backward compatibility
// ============================================================
export const theme = createAppTheme('dark');
export default theme;

// Legacy named export so existing imports work
export { TOKENS as COLOR };
