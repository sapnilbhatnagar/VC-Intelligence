import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Button,
  Chip,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import GridViewIcon from '@mui/icons-material/GridView';
import HistoryIcon from '@mui/icons-material/History';
import TuneIcon from '@mui/icons-material/Tune';
import BoltIcon from '@mui/icons-material/Bolt';
import KeyIcon from '@mui/icons-material/Key';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { checkHealth } from '../../api/client';
import { useJobStore } from '../../store/jobStore';
import { useAuthStore } from '../../store/authStore';
import { providerLabel } from '../../types';
import { MONO, TOKENS } from '../../theme';
import BrandMark from '../brand/BrandMark';
import Sidebar from './Sidebar';

// ============================================================
// AppLayout — the product shell: a fixed left rail carrying the
// brand, primary navigation, credit balance, connection state,
// and the user block. Content renders on the cool-gray canvas.
// On mobile the rail becomes a temporary drawer under a slim bar.
// ============================================================

const RAIL_WIDTH = 244;

interface NavEntry {
  label: string;
  icon: React.ReactElement;
  path: string;
}

const NAV_ITEMS: NavEntry[] = [
  { label: 'Deal desk', icon: <GridViewIcon fontSize="small" />, path: '/' },
  { label: 'History', icon: <HistoryIcon fontSize="small" />, path: '/history' },
  { label: 'Profile', icon: <PersonIcon fontSize="small" />, path: '/profile' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const { sidebarOpen, setSidebarOpen, toggleSidebar, apiHealthy, setApiHealthy, clearCurrentJob } = useJobStore();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isLoggedIn = token !== null;
  const isAdmin = user?.role === 'admin';

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initial health check on mount.
  useEffect(() => {
    checkHealth().then(setApiHealthy);
  }, [setApiHealthy]);

  const handleNavClick = (path: string) => {
    if (path === '/') {
      // The desk always starts fresh — clear any persisted job context.
      clearCurrentJob();
    }
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/', { replace: true });
  };

  const displayName = user?.name?.trim() || user?.username?.trim() || user?.email?.split('@')[0] || '';
  const initial = (displayName || 'U').charAt(0).toUpperCase();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // ── Rail content (shared between permanent rail and mobile drawer) ──
  const rail = (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 2, pb: 1.5 }}
    >
      {/* Brand */}
      <Box
        onClick={() => handleNavClick('/')}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.25, pb: 2, cursor: 'pointer', userSelect: 'none' }}
        role="button"
        aria-label="Go to deal desk"
      >
        <BrandMark size={30} />
        <Box>
          <Typography sx={{ fontWeight: 750, fontSize: '0.9rem', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            VC Intelligence
          </Typography>
          <Typography sx={{ fontFamily: MONO, color: 'text.disabled', fontSize: '0.58rem', letterSpacing: '0.1em' }}>
            DUE DILIGENCE
          </Typography>
        </Box>
      </Box>

      {/* Primary action */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => handleNavClick('/')}
          sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 650 }}
        >
          New analysis
        </Button>
      </Box>

      {/* Navigation */}
      <List dense disablePadding sx={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavClick(item.path)}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive(item.path) ? 650 : 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        {isAdmin && (
          <ListItem disablePadding>
            <ListItemButton
              selected={isActive('/admin')}
              onClick={() => handleNavClick('/admin')}
              aria-current={isActive('/admin') ? 'page' : undefined}
            >
              <ListItemIcon sx={{ color: isActive('/admin') ? 'primary.main' : 'text.secondary' }}>
                <AdminPanelSettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Admin"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive('/admin') ? 650 : 500 }}
              />
            </ListItemButton>
          </ListItem>
        )}
      </List>

      {/* Bottom block: credits, connection, user */}
      <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {/* Credits (admins run unlimited) */}
        {isLoggedIn && !isAdmin && (
          <Box
            onClick={() => handleNavClick('/profile')}
            role="button"
            aria-label={`Credit balance: ${user?.credits ?? 0} credits. Manage in profile.`}
            sx={{
              p: 1.5,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              cursor: 'pointer',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
              '&:hover': { borderColor: TOKENS.brandSoftBorder, boxShadow: '0 4px 14px rgba(22,27,34,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <BoltIcon sx={{ fontSize: 13, color: 'primary.main' }} />
              <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.1em', color: 'text.secondary' }}>
                CREDITS
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.25rem', lineHeight: 1 }}>
                {user?.credits ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                {(user?.credits ?? 0) === 1 ? 'credit' : 'credits'} left
              </Typography>
            </Box>
          </Box>
        )}

        {/* API key state: own key (unlimited), platform key via passphrase
            (credits apply), or a prompt to add one. */}
        {isLoggedIn && !isAdmin && (
          user?.has_api_key ? (
            <Box
              onClick={() => handleNavClick('/profile')}
              role="button"
              aria-label={
                user.uses_platform_key
                  ? 'Running on the platform key; credits apply. Manage in profile.'
                  : `Own ${providerLabel(user.llm_provider)} key ending ${user.api_key_last4 ?? ''} active. Manage in profile.`
              }
              sx={{
                p: 1.5,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: user.uses_platform_key ? TOKENS.brandSoftBorder : alpha(TOKENS.success, 0.3),
                backgroundColor: user.uses_platform_key ? TOKENS.brandSoft : alpha(TOKENS.success, 0.05),
                cursor: 'pointer',
                transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                '&:hover': {
                  borderColor: user.uses_platform_key ? 'primary.main' : alpha(TOKENS.success, 0.5),
                  boxShadow: '0 4px 14px rgba(22,27,34,0.08)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <KeyIcon sx={{ fontSize: 13, color: user.uses_platform_key ? 'primary.main' : 'success.main' }} />
                <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.1em', color: 'text.secondary' }}>
                  {user.uses_platform_key ? 'PLATFORM KEY' : 'OWN API KEY'}
                </Typography>
                {!user.uses_platform_key && (
                  <Typography sx={{ fontFamily: MONO, fontSize: '0.66rem', color: 'text.primary', ml: 'auto' }}>
                    &middot;&middot;&middot;&middot;{user.api_key_last4}
                  </Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: user.uses_platform_key ? 'primary.main' : 'success.main',
                  fontWeight: 650,
                  fontSize: '0.7rem',
                }}
              >
                {user.uses_platform_key
                  ? `${providerLabel(user.llm_provider)} runs, credits apply`
                  : `Unlimited runs on ${providerLabel(user.llm_provider)}`}
              </Typography>
            </Box>
          ) : (
            <Box
              onClick={() => handleNavClick('/profile')}
              role="button"
              aria-label="Add your Claude API key to run unlimited analyses"
              sx={{
                p: 1.5,
                borderRadius: '12px',
                border: '1px dashed',
                borderColor: TOKENS.borderStrong,
                cursor: 'pointer',
                transition: 'border-color 0.18s ease, background-color 0.18s ease',
                '&:hover': { borderColor: 'primary.main', backgroundColor: TOKENS.brandSoft },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <KeyIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                <Typography variant="caption" sx={{ fontWeight: 650, color: 'primary.main', fontSize: '0.74rem' }}>
                  Add your API key
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.66rem', lineHeight: 1.4, display: 'block' }}>
                Analyses need a key from Claude, OpenAI, DeepSeek, GLM, or NVIDIA.
              </Typography>
            </Box>
          )
        )}

        {/* Connection state */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }} aria-label={`API status: ${apiHealthy === null ? 'checking' : apiHealthy ? 'online' : 'offline'}`}>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: apiHealthy === null ? 'text.disabled' : apiHealthy ? 'success.main' : 'error.main',
              ...(apiHealthy && {
                '@media (prefers-reduced-motion: no-preference)': {
                  animation: 'railHealthPulse 2.4s ease-in-out infinite',
                  '@keyframes railHealthPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                },
              }),
            }}
            aria-hidden="true"
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.66rem', fontFamily: MONO, letterSpacing: '0.06em' }}>
            {apiHealthy === null ? 'CHECKING' : apiHealthy ? 'CONNECTED' : 'OFFLINE'}
          </Typography>
          <Tooltip title="Display & accessibility settings" arrow>
            <IconButton
              size="small"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open display and accessibility settings"
              sx={{ ml: 'auto', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <TuneIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* User block */}
        {isLoggedIn && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pt: 1.25,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              onClick={() => handleNavClick('/profile')}
              role="button"
              aria-label="View profile"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, cursor: 'pointer', borderRadius: '10px', p: 0.5, '&:hover': { backgroundColor: alpha(TOKENS.textPrimary, 0.04) } }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: TOKENS.brandSoft,
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                {initial}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 650, color: 'text.primary', display: 'block', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </Typography>
                {isAdmin && (
                  <Typography sx={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.1em', color: 'warning.main' }}>
                    ADMIN
                  </Typography>
                )}
              </Box>
            </Box>
            <Tooltip title="Sign out" arrow>
              <IconButton size="small" onClick={handleLogout} aria-label="Sign out" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <LogoutIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Mobile top bar ─────────────────────────────────── */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
          <Toolbar sx={{ gap: 1, minHeight: '54px !important' }}>
            <IconButton edge="start" onClick={toggleSidebar} aria-label="Toggle navigation" size="small" sx={{ color: 'text.secondary' }}>
              <MenuIcon fontSize="small" />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => handleNavClick('/')}>
              <BrandMark size={26} />
              <Typography sx={{ fontWeight: 750, fontSize: '0.9rem' }}>VC Intelligence</Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            {isLoggedIn && !isAdmin && (
              <Chip
                icon={<BoltIcon sx={{ fontSize: '0.8rem !important' }} />}
                label={user?.credits ?? 0}
                size="small"
                onClick={() => handleNavClick('/profile')}
                sx={{
                  height: 24,
                  fontFamily: MONO,
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  color: 'primary.main',
                  backgroundColor: TOKENS.brandSoft,
                  '& .MuiChip-icon': { color: 'primary.main' },
                }}
                aria-label={`Credit balance: ${user?.credits ?? 0}`}
              />
            )}
          </Toolbar>
        </AppBar>
      )}

      {/* ── Rail ───────────────────────────────────────────── */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: RAIL_WIDTH, boxSizing: 'border-box', pt: '54px' } }}
          aria-label="Navigation"
        >
          {rail}
        </Drawer>
      ) : (
        <Box
          sx={{
            width: RAIL_WIDTH,
            flexShrink: 0,
            height: '100%',
            backgroundColor: TOKENS.surfaceAlt,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
          }}
        >
          {rail}
        </Box>
      )}

      {/* ── Main content ───────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pt: isMobile ? '54px' : 0,
        }}
        role="main"
        aria-label="Main content"
      >
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3, lg: 3.5 } }}>
          {children}
        </Box>
      </Box>

      {/* ── Settings / accessibility drawer ────────────────── */}
      <Sidebar open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}
