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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import GridViewIcon from '@mui/icons-material/GridView';
import HistoryIcon from '@mui/icons-material/History';
import TuneIcon from '@mui/icons-material/Tune';
import BoltIcon from '@mui/icons-material/Bolt';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { checkHealth } from '../../api/client';
import { useJobStore } from '../../store/jobStore';
import { useAuthStore } from '../../store/authStore';
import { MONO } from '../../theme';
import Sidebar from './Sidebar';

// ============================================================
// Constants
// ============================================================
const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <GridViewIcon fontSize="small" />, path: '/' },
  { label: 'History', icon: <HistoryIcon fontSize="small" />, path: '/history' },
];

// ============================================================
// Component
// ============================================================
interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const { sidebarOpen, setSidebarOpen, toggleSidebar, apiHealthy, setApiHealthy, currentJobId, clearCurrentJob } =
    useJobStore();

  // Auth state
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isLoggedIn = token !== null;
  const isAdmin = user?.role === 'admin';

  const [settingsOpen, setSettingsOpen] = useState(false);

  // On mobile, collapse sidebar by default
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, setSidebarOpen]);

  // Initial health check on mount
  useEffect(() => {
    checkHealth().then(setApiHealthy);
  }, [setApiHealthy]);

  const handleNavClick = (path: string) => {
    if (path === '/') {
      // "New Analysis" always starts fresh — clear any persisted job context
      clearCurrentJob();
      navigate('/');
    } else {
      navigate(path);
    }
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/auth', { replace: true });
  };

  // Display name priority: name > username > email prefix
  const emailPrefix = user?.name?.trim() || user?.username?.trim() || user?.email?.split('@')[0] || '';

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top App Bar ─────────────────────────────────────── */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: '100%',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: '56px !important' }}>
          {/* Sidebar toggle */}
          <IconButton
            edge="start"
            onClick={toggleSidebar}
            aria-label="Toggle navigation sidebar"
            size="small"
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* Logo / Brand */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => navigate(currentJobId ? `/job/${currentJobId}` : '/')}
          >
            {/* Brand mark — filled orange tile, ink glyph (AA contrast) */}
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(14,14,82,0.35)',
              }}
              aria-hidden="true"
            >
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'primary.contrastText', fontFamily: MONO, letterSpacing: '-0.02em' }}>
                VC
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1, color: 'text.primary' }}
              >
                VC Intelligence
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.08em' }}
              >
                DUE DILIGENCE PLATFORM
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* ── Upcoming features (MVP+2, disabled) ────────────── */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.75, mr: 1 }}>
            <Tooltip
              title="Coming in MVP+2 — AI-powered product & technology diligence"
              arrow
              placement="bottom"
            >
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled
                  sx={{
                    fontSize: '0.72rem',
                    color: 'text.disabled',
                    borderColor: 'divider',
                    cursor: 'not-allowed',
                    '&.Mui-disabled': {
                      color: 'text.disabled',
                      borderColor: 'divider',
                      opacity: 0.55,
                    },
                  }}
                >
                  Product Diligence
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title="Coming in MVP+2 — discover trending startups and funding rounds"
              arrow
              placement="bottom"
            >
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled
                  sx={{
                    fontSize: '0.72rem',
                    color: 'text.disabled',
                    borderColor: 'divider',
                    cursor: 'not-allowed',
                    '&.Mui-disabled': {
                      color: 'text.disabled',
                      borderColor: 'divider',
                      opacity: 0.55,
                    },
                  }}
                >
                  Trending Companies
                </Button>
              </span>
            </Tooltip>
          </Box>

          {/* API Health indicator */}
          <Tooltip
            title={
              apiHealthy === null
                ? 'Checking API...'
                : apiHealthy
                ? 'API Online'
                : 'API Offline'
            }
            arrow
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'default' }}
              aria-label={`API status: ${apiHealthy === null ? 'checking' : apiHealthy ? 'online' : 'offline'}`}
            >
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
                  animation:
                    apiHealthy === true ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {apiHealthy === null ? 'CHECKING' : apiHealthy ? 'ONLINE' : 'OFFLINE'}
              </Typography>
            </Box>
          </Tooltip>

          {/* ── Auth section ───────────────────────────────── */}
          {isLoggedIn ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {/* Credit balance chip — hidden for admin (unlimited) */}
              {!isAdmin && (
                <Tooltip title="Manage credits & API key" arrow>
                  <Chip
                    icon={<BoltIcon sx={{ fontSize: '0.875rem !important' }} />}
                    label={`${user?.credits ?? 0} credits`}
                    size="small"
                    onClick={() => navigate('/profile')}
                    sx={{
                      height: 26,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: 'primary.main',
                      backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                      border: '1px solid',
                      borderColor: (t) => alpha(t.palette.primary.main, 0.25),
                      '& .MuiChip-icon': { color: 'primary.main' },
                      '&:hover': {
                        backgroundColor: (t) => alpha(t.palette.primary.main, 0.2),
                      },
                    }}
                    aria-label={`Credit balance: ${user?.credits ?? 0} credits`}
                  />
                </Tooltip>
              )}

              {/* User email + optional admin badge */}
              <Tooltip title="View profile" arrow>
                <Box
                  onClick={() => navigate('/profile')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: (t) => alpha(t.palette.text.primary, 0.06),
                    },
                  }}
                  role="button"
                  aria-label="View profile"
                >
                  <PersonIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '0.9rem' }} />
                  <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.75rem' }}>
                    {emailPrefix}
                  </Typography>
                  {isAdmin && (
                    <Chip
                      label="ADMIN"
                      size="small"
                      icon={<AdminPanelSettingsIcon sx={{ fontSize: '0.65rem !important' }} />}
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        backgroundColor: (t) => alpha(t.palette.info.main, 0.15),
                        color: 'info.main',
                        '& .MuiChip-icon': { color: 'info.main' },
                        border: '1px solid',
                        borderColor: (t) => alpha(t.palette.info.main, 0.3),
                      }}
                    />
                  )}
                </Box>
              </Tooltip>

              {/* Logout */}
              <Tooltip title="Sign out" arrow>
                <IconButton
                  size="small"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/auth')}
              sx={{ fontSize: '0.8125rem', py: 0.5 }}
            >
              Sign In
            </Button>
          )}

          {/* Settings / Accessibility toggle */}
          <Tooltip title="Accessibility & Settings" arrow>
            <IconButton
              size="small"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open accessibility settings"
              sx={{
                color: settingsOpen ? 'primary.main' : 'text.secondary',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* ── Left Navigation Drawer ───────────────────────────── */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            pt: '56px', // offset for AppBar height
          },
        }}
        aria-label="Navigation sidebar"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 1 }}>
          {/* Primary action — start a new analysis */}
          <Box sx={{ px: 1.5, pt: 1, pb: 1.5 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddCircleOutlineIcon fontSize="small" />}
              onClick={() => handleNavClick('/')}
              sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 600 }}
            >
              New analysis
            </Button>
          </Box>

          {/* Nav items */}
          <List dense disablePadding>
            <ListItem disablePadding sx={{ px: 0 }}>
              <Typography
                variant="overline"
                sx={{ px: 2, pt: 0.5, pb: 0.5, display: 'block', color: 'text.disabled' }}
              >
                Navigation
              </Typography>
            </ListItem>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => handleNavClick(item.path)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <ListItemIcon
                      sx={{ color: isActive ? 'primary.main' : 'text.secondary' }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}

            {/* Authenticated-only: Profile (credits + API key live inside it) */}
            {isLoggedIn && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={location.pathname === '/profile'}
                  onClick={() => handleNavClick('/profile')}
                  aria-current={location.pathname === '/profile' ? 'page' : undefined}
                >
                  <ListItemIcon
                    sx={{ color: location.pathname === '/profile' ? 'primary.main' : 'text.secondary' }}
                  >
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Profile"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === '/profile' ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}

            {/* Admin-only nav item */}
            {isAdmin && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={location.pathname === '/admin'}
                  onClick={() => handleNavClick('/admin')}
                  aria-current={location.pathname === '/admin' ? 'page' : undefined}
                >
                  <ListItemIcon
                    sx={{ color: location.pathname === '/admin' ? 'primary.main' : 'text.secondary' }}
                  >
                    <AdminPanelSettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Admin"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === '/admin' ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>

      {/* ── Main Content Area ───────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pt: '56px', // offset for AppBar
          transition: 'margin-left 0.2s ease',
        }}
        role="main"
        aria-label="Main content"
      >
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Box>
      </Box>

      {/* ── Settings / Accessibility Drawer ─────────────────── */}
      <Sidebar open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}
