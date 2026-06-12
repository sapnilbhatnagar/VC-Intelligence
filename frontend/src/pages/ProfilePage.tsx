import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  alpha,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import PersonIcon from '@mui/icons-material/Person';
import BoltIcon from '@mui/icons-material/Bolt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import { getMyAnalyses, updateProfile, saveApiKey, deleteApiKey } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { HistoryItem } from '../types';
import { LLM_PROVIDERS, EFFORT_LEVELS, providerLabel } from '../types';
import { RECOMMENDATION_COLORS } from '../theme';

// ============================================================
// Analysis row (clickable)
// ============================================================
function AnalysisRow({ item }: { item: HistoryItem }) {
  const navigate = useNavigate();
  const recoColor = item.recommendation ? RECOMMENDATION_COLORS[item.recommendation] : null;

  return (
    <TableRow
      hover
      onClick={() => navigate(`/job/${item.job_id}`)}
      sx={{ cursor: 'pointer' }}
      aria-label={`View analysis for ${item.company_input}`}
    >
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
          {item.company_input}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={item.status}
          size="small"
          color={
            item.status === 'completed'
              ? 'success'
              : item.status === 'failed'
              ? 'error'
              : 'primary'
          }
          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
        />
      </TableCell>
      <TableCell>
        {item.recommendation && recoColor ? (
          <Chip
            label={item.recommendation}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 700,
              backgroundColor: recoColor.bg,
              color: recoColor.text,
            }}
          />
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            —
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <OpenInNewIcon sx={{ fontSize: '0.875rem', color: 'text.disabled' }} />
      </TableCell>
    </TableRow>
  );
}

// ============================================================
// Page
// ============================================================
export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUserStore = useAuthStore((s) => s.updateUser);

  // API key + provider + effort state
  const [keyInput, setKeyInput] = useState('');
  const [keyProvider, setKeyProvider] = useState(user?.llm_provider ?? 'anthropic');
  const [keyEffort, setKeyEffort] = useState(user?.llm_effort ?? 'medium');
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';
  const hasOwnKey = !!user?.has_api_key;
  const usesPlatformKey = !!user?.uses_platform_key;

  const handleSaveKey = async () => {
    setKeySaving(true);
    setKeyError(null);
    try {
      const res = await saveApiKey(keyInput.trim(), keyProvider, keyEffort);
      updateUserStore({
        has_api_key: res.has_api_key,
        api_key_last4: res.api_key_last4,
        llm_provider: res.llm_provider,
        llm_effort: res.llm_effort,
        uses_platform_key: res.uses_platform_key,
      });
      setKeyInput('');
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not save the key.');
    } finally {
      setKeySaving(false);
    }
  };

  const handleRemoveKey = async () => {
    setKeySaving(true);
    setKeyError(null);
    try {
      const res = await deleteApiKey();
      updateUserStore({
        has_api_key: res.has_api_key,
        api_key_last4: res.api_key_last4,
        uses_platform_key: res.uses_platform_key,
      });
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not remove the key.');
    } finally {
      setKeySaving(false);
    }
  };

  // Name edit state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const { data: analyses = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ['my-analyses'],
    queryFn: getMyAnalyses,
    staleTime: 30_000,
  });

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const handleSaveName = async () => {
    setNameSaving(true);
    setNameError(null);
    try {
      const updated = await updateProfile({ name: nameValue.trim() });
      updateUserStore({ name: updated.name });
      setEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save name.');
    } finally {
      setNameSaving(false);
    }
  };

  const displayName = user?.name?.trim() || user?.username?.trim() || user?.email?.split('@')[0] || '';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ mb: 0.5 }}>
          My Profile
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Account details and analysis history.
        </Typography>
      </Box>

      {nameSaved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Display name updated — your greeting and navbar will now show your name.
        </Alert>
      )}

      {/* ── Profile card ──────────────────────────────────────── */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Typography sx={{ color: 'primary.contrastText', fontWeight: 700, fontSize: '1.25rem' }}>
                {displayName.charAt(0).toUpperCase()}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Name row — editable */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                {editingName ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <TextField
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      size="small"
                      placeholder="Your full name"
                      autoFocus
                      error={!!nameError}
                      helperText={nameError ?? undefined}
                      sx={{ maxWidth: 280 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <IconButton size="small" color="primary" onClick={handleSaveName} disabled={nameSaving} aria-label="Save name">
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setEditingName(false); setNameValue(user?.name ?? ''); setNameError(null); }} aria-label="Cancel">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {user?.name ? user.name : (
                        <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontWeight: 400, fontSize: '1rem' }}>
                          No name set
                        </Box>
                      )}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => { setEditingName(true); setNameValue(user?.name ?? ''); }}
                      aria-label="Edit display name"
                      sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
                    >
                      <EditIcon sx={{ fontSize: '0.875rem' }} />
                    </IconButton>
                    <Chip
                      label={user?.role?.toUpperCase() ?? 'USER'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        backgroundColor: (t) =>
                          user?.role === 'admin'
                            ? alpha(t.palette.info.main, 0.15)
                            : alpha(t.palette.text.primary, 0.08),
                        color: user?.role === 'admin' ? 'info.main' : 'text.secondary',
                      }}
                    />
                  </>
                )}
              </Box>

              {/* Email */}
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {user?.email}
              </Typography>

              {/* Meta row */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BoltIcon sx={{ fontSize: '0.875rem', color: 'primary.main' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {user?.role === 'admin' ? 'Unlimited' : (user?.credits ?? 0)}
                    </Box>
                    {user?.role === 'admin' ? ' credits (admin)' : ' credits'}
                  </Typography>
                </Box>
                {joinDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Joined {joinDate}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

          </Box>
        </CardContent>
      </Card>

      {/* ── Plan & billing (credits or your own API key) ──────── */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ textTransform: 'none', letterSpacing: 0 }}>
            Plan &amp; billing
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Analyses run on your own provider key (Claude, OpenAI, DeepSeek, GLM, or NVIDIA).
            Switch the provider, key, or analysis effort at any time.
          </Typography>
          <Divider sx={{ my: 2 }} />

          {isAdmin ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AllInclusiveIcon sx={{ color: 'primary.main' }} />
              <Typography variant="body2">Admin accounts have unlimited analysis.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              {/* Credits tile */}
              <Box
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: '18px',
                  border: hasOwnKey ? '1px solid' : '1.5px solid',
                  borderColor: hasOwnKey ? 'divider' : 'primary.main',
                  backgroundColor: hasOwnKey ? 'background.paper' : (t) => alpha(t.palette.primary.main, 0.04),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BoltIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  <Typography sx={{ fontWeight: 700 }}>Credits</Typography>
                  {!hasOwnKey && (
                    <Chip label="Active" size="small" color="primary" sx={{ ml: 'auto', height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                  )}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                  {user?.credits ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                  credits remaining · Full 5 / Quick 1 per run
                </Typography>
                <Button variant="outlined" size="small" startIcon={<BoltIcon />} onClick={() => navigate('/credits')}>
                  Buy credits
                </Button>
              </Box>

              {/* Own API key tile */}
              <Box
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: '18px',
                  border: hasOwnKey ? '1.5px solid' : '1px solid',
                  borderColor: hasOwnKey ? 'primary.main' : 'divider',
                  backgroundColor: hasOwnKey ? (t) => alpha(t.palette.primary.main, 0.04) : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <VpnKeyOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  <Typography sx={{ fontWeight: 700 }}>Your API key</Typography>
                  {hasOwnKey && (
                    <Chip
                      label={usesPlatformKey ? 'Platform key · credits apply' : 'Active · Unlimited'}
                      size="small"
                      color="primary"
                      sx={{ ml: 'auto', height: 20, fontSize: '0.6rem', fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                  Stored encrypted and never shown again. Runs are billed to your provider account.
                </Typography>
                {hasOwnKey && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    <Chip
                      icon={<CheckIcon sx={{ fontSize: '0.8rem !important' }} />}
                      label={
                        usesPlatformKey
                          ? `Platform key · ${providerLabel(user?.llm_provider)}`
                          : `${providerLabel(user?.llm_provider)} ···· ${user?.api_key_last4 ?? ''}`
                      }
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={`Effort: ${user?.llm_effort ?? 'medium'}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                    />
                    <Button variant="text" size="small" color="error" onClick={handleRemoveKey} disabled={keySaving}>
                      Remove
                    </Button>
                  </Box>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <TextField
                      select
                      size="small"
                      label="Provider"
                      value={keyProvider}
                      onChange={(e) => setKeyProvider(e.target.value as typeof keyProvider)}
                      sx={{ minWidth: 168 }}
                      inputProps={{ 'aria-label': 'API provider' }}
                    >
                      {LLM_PROVIDERS.map((prov) => (
                        <MenuItem key={prov.id} value={prov.id}>{prov.label}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      label="Effort"
                      value={keyEffort}
                      onChange={(e) => setKeyEffort(e.target.value as typeof keyEffort)}
                      sx={{ minWidth: 110 }}
                      inputProps={{ 'aria-label': 'Analysis effort' }}
                    >
                      {EFFORT_LEVELS.map((lvl) => (
                        <MenuItem key={lvl.id} value={lvl.id}>{lvl.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <TextField
                      type="password"
                      size="small"
                      placeholder={LLM_PROVIDERS.find((prov) => prov.id === keyProvider)?.keyHint}
                      value={keyInput}
                      onChange={(e) => { setKeyInput(e.target.value); setKeyError(null); }}
                      sx={{ flex: 1, minWidth: 180 }}
                      inputProps={{ 'aria-label': 'API key' }}
                    />
                    <Button variant="contained" size="small" onClick={handleSaveKey} disabled={keySaving || keyInput.trim().length < 8}>
                      {hasOwnKey ? 'Update' : 'Save'}
                    </Button>
                  </Box>
                </Box>
                {keyError && (
                  <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 1 }}>
                    {keyError}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Analysis history ──────────────────────────────────── */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ textTransform: 'none', letterSpacing: 0 }}>
              My Analyses
            </Typography>
            {!isLoading && (
              <Chip
                label={analyses.length}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}
          </Box>
          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={52} />
              ))}
            </Box>
          ) : analyses.length === 0 ? (
            <Box
              sx={{
                py: 6,
                textAlign: 'center',
                color: 'text.disabled',
              }}
            >
              <Typography variant="body2">No analyses yet.</Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => navigate('/')}
              >
                Start your first analysis
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="My analyses">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Recommendation</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyses.map((item) => (
                    <AnalysisRow key={item.job_id} item={item} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
