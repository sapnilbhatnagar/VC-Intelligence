import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MenuItem from '@mui/material/MenuItem';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  alpha,
  Checkbox,
  FormControlLabel,
  Chip,
  CircularProgress,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BusinessIcon from '@mui/icons-material/Business';
import BoltIcon from '@mui/icons-material/Bolt';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import LockIcon from '@mui/icons-material/Lock';
import { startAnalysis, listApiKeys } from '../../api/client';
import { useJobStore } from '../../store/jobStore';
import { useAuthStore } from '../../store/authStore';
import { creditLabel, toggleStage } from '../../lib/credits';
import { RESEARCH_PRESETS, STAGE_INFO, providerLabel } from '../../types';
import type { ResearchMode } from '../../types';

// ============================================================
// Research mode tile — segmented Apple-style selector
// ============================================================
interface ModeCardProps {
  mode: ResearchMode;
  selected: boolean;
  onClick: () => void;
}

const MODE_ICONS: Record<ResearchMode, React.ReactNode> = {
  full: <RocketLaunchIcon sx={{ fontSize: 20 }} />,
  quick: <SpeedIcon sx={{ fontSize: 20 }} />,
  custom: <TuneIcon sx={{ fontSize: 20 }} />,
};

function ModeCard({ mode, selected, onClick }: ModeCardProps) {
  const preset = RESEARCH_PRESETS[mode];

  return (
    <Box
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      aria-label={preset.label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      sx={{
        flex: '1 1 0',
        minWidth: 150,
        minHeight: 128,
        cursor: 'pointer',
        p: 2,
        borderRadius: '18px',
        border: selected ? '1.5px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        backgroundColor: selected ? (t) => alpha(t.palette.primary.main, 0.05) : 'background.paper',
        boxShadow: selected ? '0 8px 22px rgba(29,78,216,0.16)' : '0 1px 2px rgba(22,27,34,0.05)',
        transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        '&:hover': {
          borderColor: selected ? 'primary.main' : (t) => alpha(t.palette.text.primary, 0.22),
          transform: 'translateY(-2px)',
        },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? (t) => alpha(t.palette.primary.main, 0.12) : (t) => alpha(t.palette.text.primary, 0.05),
            color: selected ? 'primary.main' : 'text.secondary',
          }}
        >
          {MODE_ICONS[mode]}
        </Box>
        <Chip
          label={preset.costEstimate}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.68rem',
            fontWeight: 600,
            fontFamily: 'monospace',
            color: selected ? 'primary.main' : 'text.secondary',
            backgroundColor: selected
              ? (t) => alpha(t.palette.primary.main, 0.1)
              : (t) => alpha(t.palette.text.primary, 0.05),
          }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 650, color: selected ? 'primary.main' : 'text.primary', fontSize: '0.875rem', mt: 0.5 }}
      >
        {preset.label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          lineHeight: 1.35,
          fontSize: '0.72rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        {preset.description}
      </Typography>
    </Box>
  );
}

// ============================================================
// Main Form
// ============================================================
export default function AnalysisForm() {
  const navigate = useNavigate();
  const { setCurrentJobId, preferredApiKeyId, setPreferredApiKeyId } = useJobStore();

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.token !== null);
  const isAdmin = user?.role === 'admin';

  // The user's stored keys: the run executes on the one they pick here.
  // The choice persists across the session (preferredApiKeyId).
  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
    enabled: isLoggedIn && !isAdmin,
    staleTime: 30_000,
  });
  const selectedKey = useMemo(() => {
    if (apiKeys.length === 0) return null;
    return (
      apiKeys.find((k) => k.id === preferredApiKeyId) ??
      apiKeys.find((k) => k.is_active) ??
      apiKeys[0]
    );
  }, [apiKeys, preferredApiKeyId]);

  // Platform-key (passphrase) runs still bill credits; a real own key or an
  // admin account runs unlimited. Based on the key selected for THIS run.
  const unlimited = isAdmin || (!!selectedKey && !selectedKey.uses_platform_key);

  // Form state
  const [company, setCompany] = useState('');
  const [researchMode, setResearchMode] = useState<ResearchMode>('full');
  const [customStages, setCustomStages] = useState<Set<number>>(new Set([1]));

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const companyError = touched && company.trim().length === 0;

  // Derive selected stages (null = all)
  const getSelectedStages = (): number[] | null => {
    if (researchMode === 'full') return null;
    if (researchMode === 'quick') return RESEARCH_PRESETS.quick.stages;
    return Array.from(customStages).sort((a, b) => a - b);
  };

  const selectedStages = getSelectedStages();
  const stageCount = selectedStages === null ? 8 : selectedStages.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!company.trim()) return;
    if (researchMode === 'custom' && customStages.size < 2) return;

    setLoading(true);
    setError(null);
    try {
      const result = await startAnalysis({
        company: company.trim(),
        selected_stages: getSelectedStages(),
        api_key_id: selectedKey?.id ?? null,
      });
      setCurrentJobId(result.job_id);
      navigate(`/job/${result.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        {/* Header — left-aligned, task-focused */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <RocketLaunchIcon sx={{ color: 'primary.contrastText', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontSize: '1.0625rem', lineHeight: 1.2 }}>
              New due diligence
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Enter a company, choose how deep to research, and run the pipeline.
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            {/* Company Name */}
            <TextField
              label="Company name or website"
              placeholder="e.g. Agno AI, https://openai.com"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={() => setTouched(true)}
              error={companyError}
              helperText={companyError ? 'Company name is required' : undefined}
              required
              fullWidth
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              inputProps={{ 'aria-label': 'Company name or website' }}
            />

            {/* Research Mode Selector */}
            <Box>
              <Typography
                variant="overline"
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Research scope
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }} role="radiogroup" aria-label="Research scope">
                {(['full', 'quick', 'custom'] as ResearchMode[]).map((mode) => (
                  <ModeCard
                    key={mode}
                    mode={mode}
                    selected={researchMode === mode}
                    onClick={() => setResearchMode(mode)}
                  />
                ))}
              </Box>

              {/* Pipeline tips (moved here from the sidebar) */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mt: 1.5 }}>
                {[
                  'Quick Screen costs 1 credit',
                  'Stop anytime, progress is saved',
                  'Custom runs only selected stages',
                ].map((tip) => (
                  <Box key={tip} sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'primary.main', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                      {tip}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Custom Stage Checkboxes */}
            {researchMode === 'custom' && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: (t) => alpha(t.palette.text.primary, 0.015),
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.25, display: 'block' }}>
                  Select research modules (Company Research is always included)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {STAGE_INFO.map((stage) => {
                    const isRequired = stage.number === 1;
                    const checked = customStages.has(stage.number);
                    const hasDep = stage.requires && stage.requires.length > 0;
                    return (
                      <Box
                        key={stage.number}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          '&:hover': { backgroundColor: (t) => alpha(t.palette.text.primary, 0.03) },
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={checked}
                              disabled={isRequired}
                              onChange={() => setCustomStages((prev) => toggleStage(prev, stage.number))}
                              sx={{ py: 0.5 }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                {stage.number}. {stage.name}
                              </Typography>
                              {isRequired && <LockIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                              {hasDep && (
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                                  (requires Memo)
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{ flex: 1, m: 0 }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}
                        >
                          {stage.costHint}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                {customStages.size < 2 && (
                  <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                    Select at least one additional research module
                  </Typography>
                )}
              </Box>
            )}

            {/* Run on which key (shown when the account holds several) */}
            {isLoggedIn && !isAdmin && apiKeys.length > 1 && (
              <TextField
                select
                size="small"
                label="Run on"
                value={selectedKey?.id ?? ''}
                onChange={(e) => setPreferredApiKeyId(e.target.value)}
                helperText="Which of your stored API keys executes this analysis"
                inputProps={{ 'aria-label': 'Run on API key' }}
              >
                {apiKeys.map((k) => (
                  <MenuItem key={k.id} value={k.id}>
                    {k.label || providerLabel(k.llm_provider)}
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1, fontFamily: 'monospace' }}>
                      {k.uses_platform_key ? 'platform · credits' : `····${k.api_key_last4} · unlimited`}
                    </Typography>
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Cost + stage summary */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2,
                backgroundColor: (t) => alpha(t.palette.primary.main, 0.05),
                border: '1px solid',
                borderColor: (t) => alpha(t.palette.primary.main, 0.15),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Estimated cost
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {unlimited ? 'billed to your own API key' : `${stageCount} stage${stageCount !== 1 ? 's' : ''} will run`}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace', fontSize: '1rem' }}>
                {unlimited ? 'Unlimited' : creditLabel(selectedStages)}
              </Typography>
            </Box>

            {/* Start Analysis button */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || (researchMode === 'custom' && customStages.size < 2)}
              startIcon={loading ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <PlayArrowIcon />}
              sx={{ py: 1.5, fontSize: '0.9375rem' }}
            >
              {loading ? 'Starting analysis…' : 'Start analysis'}
            </Button>

            {/* Credit info row */}
            {isLoggedIn && unlimited ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <BoltIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {isAdmin
                    ? 'Admin · unlimited analysis'
                    : `Running on your ${providerLabel(selectedKey?.llm_provider)} key · unlimited`}
                </Typography>
              </Box>
            ) : isLoggedIn ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <BoltIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Balance{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {user?.credits ?? 0} credits
                  </Box>
                  {' · this run costs '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {creditLabel(selectedStages)}
                  </Box>
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center', display: 'block' }}>
                Sign in for credit tracking and analysis history
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
