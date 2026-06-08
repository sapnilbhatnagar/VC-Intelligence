import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Tab,
  Tabs,
  InputAdornment,
  IconButton,
  CircularProgress,
  alpha,
  Divider,
  Collapse,
  Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BoltIcon from '@mui/icons-material/Bolt';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { GoogleLogin } from '@react-oauth/google';
import { loginApi, register, googleAuth, warmBackend } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '../types';

// ── Tokens for the left brand panel — light, warm, orange accent (matches /) ──
const PANEL_BG = '#DDF0E5';
const PANEL_LINE = '#CBE6D5';
const TXT = '#13211B';
const TXT_DIM = '#566B60';
const ACCENT = '#0E0E52';
const AUTH_MONO = "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace";
const AUTH_POINTS: [string, string][] = [
  ['01', 'Company research, market sizing, and a five-year financial model'],
  ['02', 'A scored risk assessment and comparable-deal benchmarking'],
  ['03', 'An IC-ready memo and a one-page summary, generated in minutes'],
];

// ============================================================
// AuthPage — standalone full-page layout (no AppLayout wrapper)
// Handles login and registration. Login accepts email OR username.
// Register accepts optional username. Admin can sign in using
// username "Admin" (or email "Admin") via the regular login form.
// ============================================================
export default function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [searchParams] = useSearchParams();

  // Tab: 0 = Login, 1 = Register. ?mode=register opens on the register tab
  // (the landing page's "Start free" links here).
  const [tab, setTab] = useState<0 | 1>(searchParams.get('mode') === 'register' ? 1 : 0);
  const isRegister = tab === 1;

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');

  // Shared
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Admin mode — pre-fills identifier with "Admin"
  const [adminMode, setAdminMode] = useState(false);

  // Warm a possibly spun-down (free-tier) backend the moment the auth page
  // loads, so the cold start overlaps with the user typing rather than their
  // sign-in request. Fire-and-forget; never throws.
  useEffect(() => {
    warmBackend();
  }, []);

  // After a few seconds of a pending request, reassure the user that a slow
  // first sign-in is the server waking up, not a failure.
  const [slowHint, setSlowHint] = useState(false);
  useEffect(() => {
    if (!loading) {
      setSlowHint(false);
      return;
    }
    const id = window.setTimeout(() => setSlowHint(true), 4000);
    return () => window.clearTimeout(id);
  }, [loading]);

  // Prevents onBlur from setting touched=true while the tab is being switched,
  // avoiding a brief flash of validation errors on tab click.
  const switchingTabRef = useRef(false);

  // Validation
  const identifierError = touched && !isRegister && identifier.trim().length === 0;
  const emailError = touched && isRegister && !/\S+@\S+\.\S+/.test(regEmail);
  const passwordError = touched && password.length < 6;

  // Safe blur handler — ignored during tab switches
  const handleBlur = useCallback(() => {
    if (!switchingTabRef.current) setTouched(true);
  }, []);

  // Reset form state when switching tabs
  const handleTabChange = (_: React.SyntheticEvent, v: 0 | 1) => {
    switchingTabRef.current = true;
    setTab(v);
    setError(null);
    setTouched(false);
    setAdminMode(false);
    // Clear the flag after React has flushed all pending state updates
    requestAnimationFrame(() => { switchingTabRef.current = false; });
  };

  const activateAdminMode = () => {
    setAdminMode(true);
    setTab(0); // Ensure we're on login tab
    setIdentifier('Admin');
    setError(null);
    setTouched(false);
    // Focus password field after state update
    setTimeout(() => passwordRef.current?.focus(), 60);
  };

  const deactivateAdminMode = () => {
    setAdminMode(false);
    setIdentifier('');
    setError(null);
    setTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    // Validate
    if (isRegister) {
      if (emailError || passwordError || !regEmail || !password) return;
    } else {
      if (identifierError || passwordError || !identifier.trim() || !password) return;
    }

    setLoading(true);
    setError(null);

    try {
      // bcrypt enforces a 72-byte limit; normalize here for cross-platform consistency
      const pwd = password.slice(0, 72);
      const res = isRegister
        ? await register(regEmail, pwd, regUsername.trim() || undefined, regName.trim() || undefined)
        : await loginApi(identifier.trim(), pwd);

      const user: AuthUser = {
        id: res.user_id,
        email: res.email,
        username: res.username,
        name: res.name,
        role: res.role,
        credits: res.credits,
        has_api_key: res.has_api_key,
        api_key_last4: res.api_key_last4,
      };

      setAuth(res.access_token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed: no credential received.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await googleAuth(credentialResponse.credential);
      const user: AuthUser = {
        id: res.user_id,
        email: res.email,
        username: res.username,
        name: res.name,
        role: res.role,
        credits: res.credits,
        has_api_key: res.has_api_key,
        api_key_last4: res.api_key_last4,
      };
      setAuth(res.access_token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try another method.');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── Left brand panel (desktop) — reflects product capabilities ─── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '44%',
          maxWidth: 560,
          p: 6,
          color: TXT,
          backgroundColor: PANEL_BG,
          borderRight: `1px solid ${PANEL_LINE}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(50% 40% at 82% 6%, rgba(14,14,82,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* brand */}
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ACCENT,
              color: '#FFFFFF',
              fontFamily: AUTH_MONO,
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
            aria-hidden="true"
          >
            VC
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.98rem' }}>VC Intelligence</Typography>
        </Box>

        {/* headline + capability list */}
        <Box sx={{ position: 'relative' }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 'clamp(1.9rem, 3vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              mb: 3.5,
            }}
          >
            Institutional diligence, in minutes.
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {AUTH_POINTS.map(([n, label]) => (
              <Box component="li" key={n} sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
                <Typography sx={{ fontFamily: AUTH_MONO, fontSize: '0.78rem', fontWeight: 600, color: ACCENT, minWidth: 24 }}>
                  {n}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', color: TXT_DIM, lineHeight: 1.5 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Right column: the auth form ──────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 6,
        }}
      >
        {/* Mobile-only brand header (left panel is hidden below md) */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3, textAlign: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: '14px',
              border: '1.5px solid',
              borderColor: 'primary.main',
              mb: 1.5,
            }}
            aria-hidden="true"
          >
            <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1rem', fontFamily: '"JetBrains Mono", monospace' }}>
              VC
            </Typography>
          </Box>
          <Typography variant="h1" sx={{ fontSize: '1.5rem', mb: 0.25 }}>
            VC Intelligence
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: '0.1em' }}>
            DUE DILIGENCE PLATFORM
          </Typography>
        </Box>

        {/* Auth card */}
        <Card
        sx={{
          width: '100%',
          maxWidth: 460,
          position: 'relative',
          overflow: 'visible',
          boxShadow: '0 16px 48px rgba(28,26,23,0.12), 0 4px 12px rgba(28,26,23,0.06)',
          borderColor: adminMode ? (t) => alpha(t.palette.warning.main, 0.5) : 'divider',
          borderTop: adminMode ? (t) => `3px solid ${t.palette.warning.main}` : undefined,
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {/* Admin mode banner */}
          <Collapse in={adminMode}>
            <Box
              sx={{
                mb: 2.5,
                px: 2,
                py: 1.25,
                borderRadius: 1.5,
                backgroundColor: (t) => alpha(t.palette.warning.main, 0.08),
                border: '1px solid',
                borderColor: (t) => alpha(t.palette.warning.main, 0.3),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
              role="status"
              aria-live="polite"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettingsIcon fontSize="small" sx={{ color: 'warning.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  Administrator Sign-In
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={deactivateAdminMode}
                sx={{ fontSize: '0.7rem', color: 'text.secondary', minWidth: 'auto', py: 0.25 }}
              >
                Cancel
              </Button>
            </Box>
          </Collapse>

          {/* Tab switcher — hidden in admin mode */}
          {!adminMode && (
            <Tabs
              value={tab}
              onChange={handleTabChange}
              variant="fullWidth"
              aria-label="Authentication mode"
              sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Tab label="Sign In" id="auth-tab-0" aria-controls="auth-panel-0" />
              <Tab label="Create Account" id="auth-tab-1" aria-controls="auth-panel-1" />
            </Tabs>
          )}

          {/* Register credits note */}
          {isRegister && !adminMode && (
            <Box
              sx={{
                mb: 2.5,
                px: 2,
                py: 1.25,
                borderRadius: 1.5,
                backgroundColor: (t) => alpha(t.palette.primary.main, 0.08),
                border: '1px solid',
                borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <BoltIcon fontSize="small" sx={{ color: 'primary.main', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                <Box component="span" sx={{ fontWeight: 700 }}>5 free credits</Box> included on sign-up
              </Typography>
            </Box>
          )}

          {/* Error alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            id={`auth-panel-${tab}`}
            aria-labelledby={`auth-tab-${tab}`}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* ── Login fields ── */}
              {(!isRegister || adminMode) && (
                <TextField
                  label={adminMode ? 'Admin username' : 'Email or Username'}
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={handleBlur}
                  error={identifierError}
                  helperText={identifierError ? 'Please enter your email or username' : undefined}
                  required
                  fullWidth
                  autoComplete="username"
                  autoFocus={!adminMode}
                  disabled={adminMode} // Admin username is pre-filled and locked
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {adminMode
                          ? <AdminPanelSettingsIcon fontSize="small" sx={{ color: 'warning.main' }} />
                          : <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        }
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ 'aria-label': adminMode ? 'Admin username' : 'Email or username' }}
                />
              )}

              {/* ── Register fields ── */}
              {isRegister && !adminMode && (
                <>
                  <TextField
                    label="Full Name"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    fullWidth
                    autoFocus
                    autoComplete="name"
                    placeholder="e.g. Jane Smith"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ 'aria-label': 'Full name' }}
                  />
                  <TextField
                    label="Email address"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    onBlur={handleBlur}
                    error={emailError}
                    helperText={emailError ? 'Enter a valid email address' : undefined}
                    required
                    fullWidth
                    autoComplete="email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ 'aria-label': 'Email address' }}
                  />
                  <TextField
                    label="Username (optional)"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    fullWidth
                    autoComplete="username"
                    helperText="Choose a unique display name for easier sign-in"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ 'aria-label': 'Username (optional)' }}
                  />
                </>
              )}

              {/* Password — shared */}
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handleBlur}
                error={passwordError}
                helperText={
                  passwordError
                    ? 'Password must be at least 6 characters'
                    : isRegister
                    ? 'Minimum 6 characters'
                    : undefined
                }
                required
                fullWidth
                autoFocus={adminMode}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                inputRef={passwordRef}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" sx={{ color: adminMode ? 'warning.main' : 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        edge="end"
                      >
                        {showPassword
                          ? <VisibilityOffIcon fontSize="small" />
                          : <VisibilityIcon fontSize="small" />
                        }
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                inputProps={{ 'aria-label': 'Password' }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                color={adminMode ? 'warning' : 'primary'}
                startIcon={
                  loading
                    ? <CircularProgress size={18} sx={{ color: 'inherit' }} />
                    : adminMode
                    ? <AdminPanelSettingsIcon />
                    : undefined
                }
                sx={{ py: 1.5, fontSize: '0.9375rem', mt: 0.5 }}
              >
                {loading
                  ? isRegister
                    ? 'Creating account...'
                    : adminMode
                    ? 'Signing in as Admin...'
                    : 'Signing in...'
                  : isRegister
                  ? 'Create Account'
                  : adminMode
                  ? 'Sign in as Administrator'
                  : 'Sign In'}
              </Button>

              {slowHint && loading && (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}
                  role="status"
                >
                  Waking the server. The first sign-in after a period of inactivity can take up to a minute.
                </Typography>
              )}
            </Box>
          </Box>

          {/* OR divider + Google (only for non-admin login and register) */}
          {!adminMode && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2.5 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', flexShrink: 0, fontSize: '0.7rem', letterSpacing: '0.08em' }}
                >
                  OR
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              {/* Google Sign-In */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  '& > div': { width: '100%' },
                  '& iframe': { width: '100% !important' },
                }}
              >
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  width="100%"
                  text={isRegister ? 'signup_with' : 'signin_with'}
                  shape="rectangular"
                  theme="outline"
                  useOneTap={false}
                  context={isRegister ? 'signup' : 'signin'}
                />
              </Box>
            </>
          )}

          <Divider sx={{ my: 2.5 }} />

          {/* Footer links */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            {/* Admin access toggle */}
            {!adminMode && !isRegister && (
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  icon={<AdminPanelSettingsIcon sx={{ fontSize: '0.875rem !important' }} />}
                  label="Admin Login"
                  size="small"
                  onClick={activateAdminMode}
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'warning.main',
                      color: 'warning.main',
                      backgroundColor: (t) => alpha(t.palette.warning.main, 0.06),
                    },
                    transition: 'all 0.2s ease',
                  }}
                  aria-label="Switch to admin login mode"
                />
              </Box>
            )}

            {/* Back to user login from admin mode */}
            {adminMode && (
              <Button
                size="small"
                variant="text"
                onClick={deactivateAdminMode}
                sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
              >
                Back to User Login
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
      </Box>
    </Box>
  );
}
