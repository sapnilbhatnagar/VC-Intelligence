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
import { useQueryClient } from '@tanstack/react-query';
import {
  getMyAnalyses, updateProfile,
  listApiKeys, addApiKeyEntry, activateApiKey, deleteApiKeyEntry,
} from '../api/client';
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

  // Multi-key manager state
  const queryClient = useQueryClient();
  const [keyInput, setKeyInput] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [keyProvider, setKeyProvider] = useState(user?.llm_provider ?? 'anthropic');
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';
  const usesPlatformKey = !!user?.uses_platform_key;

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
    enabled: !isAdmin,
    staleTime: 15_000,
  });

  const syncActiveMeta = (keys: import('../types').UserApiKey[]) => {
    const active = keys.find((k) => k.is_active);
    updateUserStore({
      has_api_key: keys.length > 0,
      api_key_last4: active?.api_key_last4 ?? null,
      llm_provider: active?.llm_provider ?? user?.llm_provider,
      uses_platform_key: active?.uses_platform_key ?? false,
    });
  };

  const refreshKeys = async () => {
    await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    const keys = await listApiKeys();
    syncActiveMeta(keys);
  };

  const handleAddKey = async () => {
    setKeySaving(true);
    setKeyError(null);
    try {
      await addApiKeyEntry(keyInput.trim(), keyProvider, keyLabel.trim() || undefined);
      setKeyInput('');
      setKeyLabel('');
      await refreshKeys();
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not save the key.');
    } finally {
      setKeySaving(false);
    }
  };

  const handleActivateKey = async (keyId: string) => {
    setKeyError(null);
    try {
      await activateApiKey(keyId);
      await refreshKeys();
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not switch the key.');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    setKeyError(null);
    try {
      await deleteApiKeyEntry(keyId);
      await refreshKeys();
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not remove the key.');
    }
  };

  const handleEffortChange = async (effort: string) => {
    setKeyError(null);
    try {
      await updateProfile({ llm_effort: effort });
      updateUserStore({ llm_effort: effort as 'low' | 'medium' | 'high' | 'max' });
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not update the effort level.');
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
                    {/* Credits only matter on platform-key runs */}
                    {isAdmin || !usesPlatformKey ? (
                      <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Unlimited runs
                      </Box>
                    ) : (
                      <>
                        <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {user?.credits ?? 0}
                        </Box>
                        {' credits'}
                      </>
                    )}
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
              {/* Credits apply only to platform-key (passphrase) runs. */}
              {usesPlatformKey && (
              <Box
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: '18px',
                  border: '1.5px solid',
                  borderColor: 'primary.main',
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.04),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BoltIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  <Typography sx={{ fontWeight: 700 }}>Credits</Typography>
                  <Chip label="Platform key runs" size="small" color="primary" sx={{ ml: 'auto', height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
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
              )}

              {/* API keys manager */}
              <Box
                sx={{
                  flex: 2,
                  p: 2.5,
                  borderRadius: '18px',
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <VpnKeyOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  <Typography sx={{ fontWeight: 700 }}>Your API keys</Typography>
                  {apiKeys.length > 0 && (
                    <Chip label={apiKeys.length} size="small" sx={{ ml: 'auto', height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                  Stored encrypted, never shown again. Add one key per provider account and
                  pick which one runs each analysis.
                </Typography>

                {/* Stored keys */}
                {apiKeys.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    {apiKeys.map((k) => (
                      <Box
                        key={k.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1.25,
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: k.is_active ? 'primary.main' : 'divider',
                          backgroundColor: k.is_active ? (t) => alpha(t.palette.primary.main, 0.04) : 'transparent',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 140 }}>
                          <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            {k.label || providerLabel(k.llm_provider)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                            {k.uses_platform_key
                              ? `Platform key · ${providerLabel(k.llm_provider)} · credits apply`
                              : `${providerLabel(k.llm_provider)} ····${k.api_key_last4} · unlimited`}
                          </Typography>
                        </Box>
                        {k.is_active ? (
                          <Chip label="Default" size="small" color="primary" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }} />
                        ) : (
                          <Button size="small" variant="text" onClick={() => handleActivateKey(k.id)} sx={{ fontSize: '0.72rem', py: 0.25 }}>
                            Make default
                          </Button>
                        )}
                        <Button size="small" variant="text" color="error" onClick={() => handleDeleteKey(k.id)} sx={{ fontSize: '0.72rem', py: 0.25, minWidth: 0 }}>
                          Remove
                        </Button>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Effort level */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <TextField
                    select
                    size="small"
                    label="Analysis effort"
                    value={user?.llm_effort ?? 'medium'}
                    onChange={(e) => handleEffortChange(e.target.value)}
                    sx={{ minWidth: 150 }}
                    inputProps={{ 'aria-label': 'Analysis effort' }}
                  >
                    {EFFORT_LEVELS.map((lvl) => (
                      <MenuItem key={lvl.id} value={lvl.id}>{lvl.label}</MenuItem>
                    ))}
                  </TextField>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {EFFORT_LEVELS.find((lvl) => lvl.id === (user?.llm_effort ?? 'medium'))?.description}
                  </Typography>
                </Box>

                {/* Add a key */}
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
                      size="small"
                      label="Label (optional)"
                      placeholder="e.g. NVIDIA free tier"
                      value={keyLabel}
                      onChange={(e) => setKeyLabel(e.target.value)}
                      sx={{ flex: 1, minWidth: 150 }}
                      inputProps={{ 'aria-label': 'Key label' }}
                    />
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
                    <Button variant="contained" size="small" onClick={handleAddKey} disabled={keySaving || keyInput.trim().length < 8}>
                      Add key
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
