import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogContent,
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
  Collapse,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import KeyIcon from '@mui/icons-material/Key';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { loginApi, register } from '../../api/client';
import { MONO } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import BrandMark from '../brand/BrandMark';
import type { AuthUser } from '../../types';

export type AuthMode = 'signin' | 'register';

// ============================================================
// AuthDialog — the sign-in window that opens over the landing
// page. Handles sign-in (email or username), registration, the
// admin sign-in mode, and Google OAuth. On success it stores the
// session and navigates to the dashboard.
// ============================================================
interface AuthDialogProps {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
}

export default function AuthDialog({ open, mode, onClose }: AuthDialogProps) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [tab, setTab] = useState<0 | 1>(mode === 'register' ? 1 : 0);
  const isRegister = tab === 1;

  // Keep the tab in sync when the dialog is reopened with a different intent.
  useEffect(() => {
    if (open) setTab(mode === 'register' ? 1 : 0);
  }, [open, mode]);

  // Sign-in fields
  const [identifier, setIdentifier] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  // Registration fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regApiKey, setRegApiKey] = useState('');

  // Shared
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

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

  // Prevents onBlur from setting touched=true while the tab is being
  // switched, avoiding a flash of validation errors on tab click.
  const switchingTabRef = useRef(false);

  const identifierError = touched && !isRegister && identifier.trim().length === 0;
  const emailError = touched && isRegister && !/\S+@\S+\.\S+/.test(regEmail);
  const passwordError = touched && password.length < 6;

  const handleBlur = useCallback(() => {
    if (!switchingTabRef.current) setTouched(true);
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, v: 0 | 1) => {
    switchingTabRef.current = true;
    setTab(v);
    setError(null);
    setTouched(false);
    setAdminMode(false);
    requestAnimationFrame(() => { switchingTabRef.current = false; });
  };

  const activateAdminMode = () => {
    setAdminMode(true);
    setTab(0);
    setIdentifier('Admin');
    setError(null);
    setTouched(false);
    setTimeout(() => passwordRef.current?.focus(), 60);
  };

  const deactivateAdminMode = () => {
    setAdminMode(false);
    setIdentifier('');
    setError(null);
    setTouched(false);
  };

  const finishAuth = (res: Awaited<ReturnType<typeof loginApi>>) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (isRegister) {
      if (emailError || passwordError || !regEmail || !password) return;
    } else {
      if (identifierError || passwordError || !identifier.trim() || !password) return;
    }

    setLoading(true);
    setError(null);

    try {
      // bcrypt enforces a 72-byte limit; normalize here for consistency
      const pwd = password.slice(0, 72);
      const res = isRegister
        ? await register(
            regEmail,
            pwd,
            regUsername.trim() || undefined,
            regName.trim() || undefined,
            regApiKey.trim() || undefined,
          )
        : await loginApi(identifier.trim(), pwd);
      finishAuth(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullScreen={fullScreen}
      maxWidth="xs"
      fullWidth
      aria-labelledby="auth-dialog-title"
    >
      <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <BrandMark size={34} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="auth-dialog-title" sx={{ fontWeight: 750, fontSize: '1.05rem', lineHeight: 1.2 }}>
              {isRegister ? 'Create your account' : 'Sign in to VC Intelligence'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {isRegister ? '5 free credits included. No card required.' : 'Your deal desk is waiting.'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={loading} aria-label="Close sign-in window">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Admin mode banner */}
        <Collapse in={adminMode}>
          <Box
            sx={{
              mb: 2,
              px: 2,
              py: 1.25,
              borderRadius: 2,
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
                Administrator sign-in
              </Typography>
            </Box>
            <Button size="small" onClick={deactivateAdminMode} sx={{ fontSize: '0.7rem', color: 'text.secondary', minWidth: 'auto', py: 0.25 }}>
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
            sx={{ mb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab label="Sign in" id="auth-tab-0" aria-controls="auth-panel-0" />
            <Tab label="Create account" id="auth-tab-1" aria-controls="auth-panel-1" />
          </Tabs>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
                disabled={adminMode}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {adminMode
                        ? <AdminPanelSettingsIcon fontSize="small" sx={{ color: 'warning.main' }} />
                        : <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
                    </InputAdornment>
                  ),
                }}
                inputProps={{ 'aria-label': adminMode ? 'Admin username' : 'Email or username' }}
              />
            )}

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
                  helperText="A unique display name for easier sign-in"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ 'aria-label': 'Username (optional)' }}
                />
                <TextField
                  label="Claude API key (optional)"
                  type="text"
                  value={regApiKey}
                  onChange={(e) => setRegApiKey(e.target.value)}
                  fullWidth
                  placeholder="sk-ant-..."
                  autoComplete="off"
                  helperText="Your key makes every analysis unlimited, self-billed, and is stored encrypted. Skip this and add it later from the side navigation."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ 'aria-label': 'Claude API key (optional)', style: { fontFamily: MONO, fontSize: '0.85rem' } }}
                />
              </>
            )}

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
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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
              sx={{ py: 1.4, fontSize: '0.9375rem', mt: 0.5 }}
            >
              {loading
                ? isRegister
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegister
                ? 'Create account'
                : adminMode
                ? 'Sign in as administrator'
                : 'Sign in'}
            </Button>

            {slowHint && loading && (
              <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }} role="status">
                Waking the server. The first sign-in after a period of inactivity can take up to a minute.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Admin access toggle */}
        {!adminMode && !isRegister && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
            <Chip
              icon={<AdminPanelSettingsIcon sx={{ fontSize: '0.875rem !important' }} />}
              label="Admin sign-in"
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
              aria-label="Switch to admin sign-in mode"
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
