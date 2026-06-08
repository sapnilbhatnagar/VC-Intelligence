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
import PersonIcon from '@mui/icons-material/Person';
import BoltIcon from '@mui/icons-material/Bolt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { getMyAnalyses, updateProfile } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { HistoryItem } from '../types';
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

            {/* Buy credits CTA — not shown for admin (unlimited) */}
            {user?.role !== 'admin' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<BoltIcon />}
                onClick={() => navigate('/credits')}
                aria-label="Buy more credits"
              >
                Buy Credits
              </Button>
            )}
          </Box>
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
