import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import BoltIcon from '@mui/icons-material/Bolt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalculateIcon from '@mui/icons-material/Calculate';
import ShieldIcon from '@mui/icons-material/Shield';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import { startAnalysis } from '../api/client';
import { useJobStore } from '../store/jobStore';
import { useAuthStore } from '../store/authStore';
import { STAGE_INFO } from '../types';

// ============================================================
// Stage icon map
// ============================================================
const STAGE_ICONS: Record<number, React.ReactNode> = {
  1: <SearchIcon />,
  2: <TrendingUpIcon />,
  3: <CalculateIcon />,
  4: <ShieldIcon />,
  5: <CompareArrowsIcon />,
  6: <DescriptionIcon />,
  7: <CodeIcon />,
  8: <ImageIcon />,
};

// ============================================================
// Preview stage card
// ============================================================
interface PreviewStageCardProps {
  number: number;
  name: string;
  costHint: string;
  willRun: boolean;
}

function PreviewStageCard({ number, name, costHint, willRun }: PreviewStageCardProps) {
  return (
    <Box
      role="listitem"
      aria-label={`Stage ${number}: ${name} — ${willRun ? 'queued' : 'skipped'}`}
      sx={{
        flex: '0 0 auto',
        width: { xs: 108, sm: 122, md: 132 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: willRun ? 'divider' : (t) => alpha(t.palette.divider, 0.4),
        backgroundColor: willRun
          ? (t) => alpha(t.palette.text.primary, 0.03)
          : 'transparent',
        opacity: willRun ? 1 : 0.35,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Number badge */}
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: willRun ? 'divider' : 'transparent',
          border: willRun ? 'none' : '1px dashed',
          borderColor: 'divider',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: willRun ? 'text.primary' : 'text.disabled', lineHeight: 1 }}>
          {number}
        </Typography>
      </Box>

      {/* Icon */}
      <Box
        sx={{
          color: willRun ? 'text.secondary' : 'text.disabled',
          display: 'flex',
          alignItems: 'center',
          '& svg': { fontSize: '1.25rem' },
        }}
        aria-hidden="true"
      >
        {STAGE_ICONS[number]}
      </Box>

      {/* Stage name */}
      <Typography
        variant="caption"
        sx={{
          textAlign: 'center',
          lineHeight: 1.3,
          fontSize: '0.65rem',
          color: willRun ? 'text.secondary' : 'text.disabled',
          fontWeight: 500,
          textDecoration: willRun ? 'none' : 'line-through',
        }}
      >
        {name}
      </Typography>

      {/* Status badge */}
      <Chip
        label={willRun ? 'Queued' : 'Skip'}
        size="small"
        sx={{
          height: 18,
          fontSize: '0.6rem',
          fontWeight: 700,
          backgroundColor: willRun
            ? (t) => alpha(t.palette.text.primary, 0.07)
            : 'transparent',
          color: willRun ? 'text.disabled' : 'text.disabled',
          border: willRun ? 'none' : '1px dashed',
          borderColor: 'divider',
        }}
      />

      {/* Cost hint */}
      {willRun && (
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.6rem', mt: -0.5 }}
        >
          {costHint}
        </Typography>
      )}
    </Box>
  );
}

// ============================================================
// Page
// ============================================================
export default function AnalysisPreviewPage() {
  const navigate = useNavigate();
  const { pendingAnalysis, setPendingAnalysis, setCurrentJobId, accessibilitySettings } = useJobStore();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.token !== null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no pending analysis
  if (!pendingAnalysis) {
    navigate('/', { replace: true });
    return null;
  }

  const { company, selectedStages } = pendingAnalysis;

  // Determine which stages will run
  const stagesToRun = selectedStages === null
    ? STAGE_INFO.map((s) => s.number)
    : selectedStages;

  const stageCount = stagesToRun.length;

  // Estimate credit cost
  const estimatedCredits = selectedStages === null
    ? 5
    : selectedStages.length <= 3
    ? 1
    : Math.max(1, Math.ceil(selectedStages.length * 0.5));

  const hasEnoughCredits = !isLoggedIn || (user !== null && user.credits >= estimatedCredits);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startAnalysis({
        company,
        selected_stages: selectedStages,
      });
      setCurrentJobId(result.job_id);
      setPendingAnalysis(null);
      navigate(`/job/${result.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis. Is the backend running?');
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 6 }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Tooltip title="Back to form" arrow>
          <IconButton
            size="small"
            onClick={handleBack}
            aria-label="Back to analysis form"
            sx={{ color: 'text.secondary' }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.375rem', mb: 0.25 }}>
            Ready to Analyse
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Review the pipeline before starting
          </Typography>
        </Box>
      </Box>

      {/* ── Company highlight ──────────────────────────────── */}
      <Card
        sx={{
          mb: 3,
          position: 'relative',
          overflow: 'visible',
          boxShadow: (t) =>
            `0 0 0 1px ${alpha(t.palette.primary.main, 0.2)}, 0 8px 32px ${alpha('#000', 0.3)}`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5, letterSpacing: '0.1em' }}>
            ANALYSING COMPANY
          </Typography>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, color: 'text.primary', fontWeight: 700 }}
          >
            {company}
          </Typography>
        </CardContent>
      </Card>

      {/* ── Pipeline Preview ───────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Pipeline Preview
        </Typography>

        <Box
          role="list"
          aria-label="Pipeline stages preview"
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: { xs: 'auto', lg: 'visible' },
            flexWrap: { xs: 'nowrap', lg: 'wrap' },
            justifyContent: { xs: 'flex-start', lg: 'center' },
            pb: { xs: 1, lg: 0 },
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {STAGE_INFO.map((stage) => (
            <PreviewStageCard
              key={stage.number}
              number={stage.number}
              name={stage.name}
              costHint={stage.costHint}
              willRun={stagesToRun.includes(stage.number)}
            />
          ))}
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── Summary ────────────────────────────────────────── */}
      <Box
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: (t) => alpha(t.palette.primary.main, 0.04),
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
            Stages to run
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stageCount}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
            Est. cost
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main' }}
          >
            {selectedStages === null
              ? '$0.50–$2.00'
              : stagesToRun.length <= 3
              ? '$0.15–$0.50'
              : `~$${(stagesToRun.length * 0.1).toFixed(2)}`}
          </Typography>
        </Box>

        {isLoggedIn && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                Credits required
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BoltIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {estimatedCredits}
                </Typography>
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem />

            <Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                Your balance
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BoltIcon
                  sx={{
                    fontSize: 16,
                    color: hasEnoughCredits ? 'success.main' : 'error.main',
                  }}
                />
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: hasEnoughCredits ? 'success.main' : 'error.main' }}
                >
                  {user?.credits ?? 0}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* ── Informational notes ────────────────────────────── */}
      {!isLoggedIn && (
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon fontSize="small" />}
          sx={{ mb: 2.5 }}
        >
          You are running in <strong>anonymous mode</strong> — sign in to track history and earn credits.
        </Alert>
      )}

      {isLoggedIn && !hasEnoughCredits && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          Insufficient credits. This analysis requires <strong>{estimatedCredits} credits</strong> but your balance is only <strong>{user?.credits ?? 0}</strong>.{' '}
          <Box
            component="span"
            onClick={() => navigate('/credits')}
            sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
          >
            Buy more credits
          </Box>
          .
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Action buttons ─────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={handleStart}
          disabled={loading || (isLoggedIn && !hasEnoughCredits)}
          startIcon={
            loading ? (
              <CircularProgress size={18} sx={{ color: 'inherit' }} />
            ) : (
              <PlayArrowIcon />
            )
          }
          sx={{
            py: 1.5,
            px: 4,
            fontSize: '0.9375rem',
            flex: { xs: 1, sm: 'none' },
            minWidth: 200,
          }}
          aria-label="Start the analysis"
        >
          {loading ? 'Starting Analysis...' : 'Start Analysis'}
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={handleBack}
          disabled={loading}
          startIcon={<SettingsIcon />}
          sx={{
            py: 1.5,
            px: 3,
            fontSize: '0.875rem',
            flex: { xs: 1, sm: 'none' },
          }}
          aria-label="Change analysis settings"
        >
          Change Settings
        </Button>
      </Box>

      {/* Reduced motion hint for screen readers */}
      {accessibilitySettings.reducedMotion && (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 2 }}>
          Reduced motion mode is active.
        </Typography>
      )}
    </Box>
  );
}
