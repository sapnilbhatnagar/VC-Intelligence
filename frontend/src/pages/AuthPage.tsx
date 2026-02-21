import { useRef, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
import { loginApi, register, googleAuth } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '../types';

// ============================================================
// AuthPage — standalone full-page layout (no AppLayout wrapper)
// Handles login and registration. Login accepts email OR username.
// Register accepts optional username. Admin can sign in using
// username "Admin" (or email "Admin") via the regular login form.
// ============================================================
export default function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Tab: 0 = Login, 1 = Register
  const [tab, setTab] = useState<0 | 1>(0);
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

  // Validation
  const identifierError = touched && !isRegister && identifier.trim().length === 0;
  const emailError = touched && isRegister && !/\S+@\S+\.\S+/.test(regEmail);
  const passwordError = touched && password.length < 6;

  // Reset form state when switching tabs
  const handleTabChange = (_: React.SyntheticEvent, v: 0 | 1) => {
    setTab(v);
    setError(null);
    setTouched(false);
    setAdminMode(false);
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
      const res = isRegister
        ? await register(regEmail, password, regUsername.trim() || undefined, regName.trim() || undefined)
        : await loginApi(identifier.trim(), password);

      const user: AuthUser = {
        id: res.user_id,
        email: res.email,
        username: res.username,
        name: res.name,
        role: res.role,
        credits: res.credits,
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        // Subtle radial glow from top
        backgroundImage: (t) =>
          `radial-gradient(ellipse 80% 60% at 50% 0%, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 70%)`,
        px: 2,
      }}
    >
      {/* Brand header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
            mb: 1.5,
            boxShadow: (t) => `0 8px 28px ${alpha(t.palette.primary.main, 0.4)}`,
          }}
          aria-hidden="true"
        >
          <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '1rem', letterSpacing: '-0.03em' }}>
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
          boxShadow: (t) =>
            `0 0 0 1px ${alpha(t.palette.primary.main, 0.25)}, 0 24px 48px ${alpha('#000', 0.45)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -1,
            borderRadius: 'inherit',
            padding: 1,
            background: adminMode
              ? 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)'
              : 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, transparent 100%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            opacity: adminMode ? 0.8 : 0.6,
            pointerEvents: 'none',
            transition: 'all 0.3s ease',
          },
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
                  onBlur={() => setTouched(true)}
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
                    onBlur={() => setTouched(true)}
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
                onBlur={() => setTouched(true)}
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
                  theme="filled_blue"
                  useOneTap={false}
                  context={isRegister ? 'signup' : 'signin'}
                />
              </Box>
            </>
          )}

          <Divider sx={{ my: 2.5 }} />

          {/* Footer links */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            {/* Anonymous mode */}
            <Typography
              component={RouterLink}
              to="/"
              variant="body2"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
                transition: 'color 0.15s ease',
              }}
            >
              Continue without account →
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
              Anonymous mode — no credit tracking or history
            </Typography>

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
  );
}
