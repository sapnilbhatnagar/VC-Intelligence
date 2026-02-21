import { useState } from 'react';
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
import { startAnalysis } from '../../api/client';
import { useJobStore } from '../../store/jobStore';
import { useAuthStore } from '../../store/authStore';
import { RESEARCH_PRESETS, STAGE_INFO } from '../../types';
import type { ResearchMode } from '../../types';

// ============================================================
// Research mode card
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
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      sx={{
        flex: '1 1 0',
        minWidth: 140,
        cursor: 'pointer',
        p: 2,
        borderRadius: 2,
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        backgroundColor: selected
          ? (t) => alpha(t.palette.primary.main, 0.08)
          : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: selected ? 'primary.main' : (t) => t.palette.text.disabled,
          backgroundColor: selected
            ? (t) => alpha(t.palette.primary.main, 0.1)
            : (t) => alpha(t.palette.text.primary, 0.03),
        },
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
      }}
    >
      <Box sx={{ color: selected ? 'primary.main' : 'text.secondary' }}>
        {MODE_ICONS[mode]}
      </Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, color: selected ? 'primary.main' : 'text.primary', fontSize: '0.8125rem' }}
      >
        {preset.label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3, fontSize: '0.7rem' }}>
        {preset.description}
      </Typography>
      <Chip
        label={preset.costEstimate}
        size="small"
        sx={{
          mt: 0.5,
          height: 22,
          fontSize: '0.7rem',
          fontWeight: 700,
          fontFamily: 'monospace',
          color: selected ? 'primary.main' : 'text.secondary',
          backgroundColor: selected
            ? (t) => alpha(t.palette.primary.main, 0.12)
            : (t) => alpha(t.palette.text.primary, 0.06),
          border: 'none',
        }}
      />
    </Box>
  );
}

// ============================================================
// Main Form
// ============================================================
// Credit cost per research mode
const CREDIT_COST: Record<ResearchMode, number> = {
  full: 5,
  quick: 1,
  custom: 0, // computed dynamically
};

export default function AnalysisForm() {
  const navigate = useNavigate();
  const { setCurrentJobId } = useJobStore();

  // Auth state for credit display
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.token !== null);

  // Form state
  const [company, setCompany] = useState('');
  const [researchMode, setResearchMode] = useState<ResearchMode>('full');
  const [customStages, setCustomStages] = useState<Set<number>>(new Set([1]));

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const companyError = touched && company.trim().length === 0;

  // Derive selected stages
  const getSelectedStages = (): number[] | null => {
    if (researchMode === 'full') return null; // null = all
    if (researchMode === 'quick') return RESEARCH_PRESETS.quick.stages;
    return Array.from(customStages).sort((a, b) => a - b);
  };

  const selectedStages = getSelectedStages();
  const stageCount = selectedStages === null ? 8 : selectedStages.length;

  // Custom stage toggle with dependency enforcement
  const toggleCustomStage = (stageNum: number) => {
    if (stageNum === 1) return; // Stage 1 always required
    const next = new Set(customStages);
    if (next.has(stageNum)) {
      next.delete(stageNum);
      // If removing stage 6, also remove 7 and 8 (they depend on it)
      if (stageNum === 6) {
        next.delete(7);
        next.delete(8);
      }
    } else {
      next.add(stageNum);
      // If adding stage 7 or 8, also add stage 6 (dependency)
      if ((stageNum === 7 || stageNum === 8) && !next.has(6)) {
        next.add(6);
      }
    }
    setCustomStages(next);
  };

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
      });
      setCurrentJobId(result.job_id);
      navigate(`/job/${result.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Card
          sx={{
            position: 'relative',
            overflow: 'visible',
            boxShadow: (t) =>
              `0 0 0 1px ${alpha(t.palette.primary.main, 0.25)}, 0 20px 40px ${alpha('#000', 0.4)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: -1,
              borderRadius: 'inherit',
              padding: 1,
              background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, transparent 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              opacity: 0.6,
              pointerEvents: 'none',
            },
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            {/* Title */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                  mb: 2,
                  boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.35)}`,
                }}
                aria-hidden="true"
              >
                <RocketLaunchIcon sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Typography variant="h2" sx={{ mb: 0.5, fontSize: '1.375rem' }}>
                New Due Diligence Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                AI-powered research pipeline
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Company Name */}
                <TextField
                  label="Company Name or URL"
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
                  inputProps={{ 'aria-label': 'Company name or URL' }}
                />

                {/* Research Mode Selector */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary', fontSize: '0.8125rem' }}>
                    Research Scope
                  </Typography>
                  <Box
                    sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}
                    role="radiogroup"
                    aria-label="Research scope"
                  >
                    {(['full', 'quick', 'custom'] as ResearchMode[]).map((mode) => (
                      <ModeCard
                        key={mode}
                        mode={mode}
                        selected={researchMode === mode}
                        onClick={() => setResearchMode(mode)}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Custom Stage Checkboxes */}
                {researchMode === 'custom' && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: (t) => alpha(t.palette.text.primary, 0.02),
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                      Select research modules (Stage 1 is always included)
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
                              '&:hover': {
                                backgroundColor: (t) => alpha(t.palette.text.primary, 0.03),
                              },
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  size="small"
                                  checked={checked}
                                  disabled={isRequired}
                                  onChange={() => toggleCustomStage(stage.number)}
                                  sx={{ py: 0.5 }}
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                    {stage.number}. {stage.name}
                                  </Typography>
                                  {isRequired && (
                                    <LockIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                  )}
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

                {/* Cost + stage summary */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 1,
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.06),
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.15),
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Credit cost
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                      {stageCount} stage{stageCount !== 1 ? 's' : ''} selected
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace', fontSize: '0.875rem' }}
                  >
                    {researchMode === 'full'
                      ? '5 credits'
                      : researchMode === 'quick'
                      ? '1 credit'
                      : `${Math.max(1, Math.ceil(customStages.size * 0.5))} credit${Math.max(1, Math.ceil(customStages.size * 0.5)) !== 1 ? 's' : ''}`}
                  </Typography>
                </Box>

                {/* Start Analysis button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || (researchMode === 'custom' && customStages.size < 2)}
                  startIcon={
                    loading
                      ? <CircularProgress size={18} sx={{ color: 'inherit' }} />
                      : <PlayArrowIcon />
                  }
                  sx={{ py: 1.5, fontSize: '0.9375rem', mt: 0.5 }}
                >
                  {loading ? 'Starting Analysis...' : 'Start Analysis'}
                </Button>

                {/* Credit info row */}
                {isLoggedIn ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      mt: 0.25,
                    }}
                  >
                    <BoltIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Your balance:{' '}
                      <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {user?.credits ?? 0} credits
                      </Box>
                      {' · '}This analysis costs{' '}
                      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {researchMode === 'custom'
                          ? `${Math.max(1, Math.ceil(customStages.size * 0.5))} credit${Math.max(1, Math.ceil(customStages.size * 0.5)) !== 1 ? 's' : ''}`
                          : `${CREDIT_COST[researchMode]} credit${CREDIT_COST[researchMode] !== 1 ? 's' : ''}`}
                      </Box>
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', textAlign: 'center', display: 'block', mt: 0.25 }}
                  >
                    Sign in for credit tracking &amp; analysis history
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
    </Box>
  );
}
