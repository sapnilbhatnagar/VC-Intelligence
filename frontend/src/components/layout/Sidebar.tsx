import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Switch,
  Slider,
  Divider,
  Button,
  Tooltip,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContrastIcon from '@mui/icons-material/Contrast';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { checkHealth } from '../../api/client';
import { useJobStore } from '../../store/jobStore';
import type { ThemeMode } from '../../types';

// ============================================================
// Constants
// ============================================================
const SIDEBAR_WIDTH = 300;

// ============================================================
// Section header helper
// ============================================================
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{ color: 'text.disabled', display: 'block', mb: 1.5, fontSize: '0.65rem' }}
    >
      {children}
    </Typography>
  );
}

// ============================================================
// Component
// ============================================================
interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { accessibilitySettings, updateAccessibility, apiHealthy, setApiHealthy, themeMode, setThemeMode } =
    useJobStore();

  const [healthChecking, setHealthChecking] = useState(false);

  const handleHealthCheck = async () => {
    setHealthChecking(true);
    const ok = await checkHealth();
    setApiHealthy(ok);
    setHealthChecking(false);
  };

  const fontLabel = (val: number) => `${val}%`;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          borderLeft: '1px solid',
          borderColor: 'divider',
        },
      }}
      aria-label="Accessibility and settings panel"
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessibilityNewIcon fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Settings
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close settings panel">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* ── Display ────────────────────────────────────────── */}
        <Box>
          <SectionLabel>Display</SectionLabel>

          {/* Three-way theme selector */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
              Theme
            </Typography>
            {/*
              ToggleButtonGroup with exclusive mode acts like a radio group.
              Each button represents one ThemeMode value.
            */}
            <ToggleButtonGroup
              exclusive
              value={themeMode}
              onChange={(_e, val: ThemeMode | null) => {
                // val is null when the user clicks the already-selected option — ignore
                if (val !== null) setThemeMode(val);
              }}
              size="small"
              fullWidth
              aria-label="Select theme"
            >
              <ToggleButton value="dark" aria-label="Dark theme">
                <DarkModeIcon fontSize="small" sx={{ mr: 0.5 }} />
                Dark
              </ToggleButton>
              <ToggleButton value="light" aria-label="Light theme">
                <LightModeIcon fontSize="small" sx={{ mr: 0.5 }} />
                Light
              </ToggleButton>
              <ToggleButton value="advanced" aria-label="Advanced theme">
                <AutoAwesomeIcon fontSize="small" sx={{ mr: 0.5 }} />
                Advanced
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* High contrast */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ContrastIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2">High Contrast</Typography>
            </Box>
            <Switch
              checked={accessibilitySettings.highContrast}
              onChange={(e) => updateAccessibility({ highContrast: e.target.checked })}
              size="small"
              inputProps={{ 'aria-label': 'Toggle high contrast mode' }}
            />
          </Box>
        </Box>

        <Divider />

        {/* ── Typography ─────────────────────────────────────── */}
        <Box>
          <SectionLabel>Typography</SectionLabel>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TextFieldsIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2">Font Scale</Typography>
            <Typography
              variant="caption"
              sx={{
                ml: 'auto',
                color: 'primary.main',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {fontLabel(accessibilitySettings.fontSize)}
            </Typography>
          </Box>
          <Slider
            value={accessibilitySettings.fontSize}
            min={80}
            max={140}
            step={10}
            marks={[
              { value: 80, label: '80%' },
              { value: 100, label: '100%' },
              { value: 140, label: '140%' },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={fontLabel}
            onChange={(_, val) => updateAccessibility({ fontSize: val as number })}
            aria-label="Font scale slider"
            sx={{
              color: 'primary.main',
              '& .MuiSlider-markLabel': { fontSize: '0.65rem', color: 'text.disabled' },
            }}
          />
        </Box>

        <Divider />

        {/* ── Motion ─────────────────────────────────────────── */}
        <Box>
          <SectionLabel>Motion</SectionLabel>
          <FormControlLabel
            control={
              <Switch
                checked={accessibilitySettings.reducedMotion}
                onChange={(e) => updateAccessibility({ reducedMotion: e.target.checked })}
                size="small"
                inputProps={{ 'aria-label': 'Toggle reduced motion' }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                Reduced Motion
              </Typography>
            }
            labelPlacement="start"
            sx={{ ml: 0, justifyContent: 'space-between', width: '100%' }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
            Disables animations for accessibility
          </Typography>
        </Box>

        <Divider />

        {/* ── API Status ─────────────────────────────────────── */}
        <Box>
          <SectionLabel>API Connection</SectionLabel>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: (t) =>
                apiHealthy
                  ? alpha(t.palette.success.main, 0.06)
                  : apiHealthy === false
                  ? alpha(t.palette.error.main, 0.06)
                  : alpha(t.palette.text.primary, 0.03),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Status dot */}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor:
                    apiHealthy === null
                      ? 'text.disabled'
                      : apiHealthy
                      ? 'success.main'
                      : 'error.main',
                  animation: apiHealthy === true ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                }}
                aria-hidden="true"
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {apiHealthy === null ? 'Unknown' : apiHealthy ? 'Connected' : 'Disconnected'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {import.meta.env.VITE_API_URL
                    ? new URL(import.meta.env.VITE_API_URL).host
                    : 'same origin'}
                </Typography>
              </Box>
            </Box>

            <Tooltip title="Refresh health check" arrow>
              <IconButton
                size="small"
                onClick={handleHealthCheck}
                disabled={healthChecking}
                aria-label="Refresh API health check"
              >
                <RefreshIcon
                  fontSize="small"
                  sx={{
                    animation: healthChecking ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>

          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={handleHealthCheck}
            disabled={healthChecking}
            startIcon={<RefreshIcon />}
            sx={{ mt: 1.5 }}
          >
            {healthChecking ? 'Checking...' : 'Check API Health'}
          </Button>
        </Box>

        <Divider />

        {/* ── Platform info ───────────────────────────────────── */}
        <Box>
          <SectionLabel>Platform</SectionLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>Version</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                1.0.0
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>Pipeline Stages</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                8
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>Full Analysis</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                5 credits
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
