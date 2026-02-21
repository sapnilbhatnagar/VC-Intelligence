import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
  Button,
  CircularProgress,
  alpha,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalculateIcon from '@mui/icons-material/Calculate';
import ShieldIcon from '@mui/icons-material/Shield';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import BoltIcon from '@mui/icons-material/Bolt';
import { getJobStatus, getJobResults, stopJob, resumeJob, startAnalysis } from '../api/client';
import { useJobStore } from '../store/jobStore';
import { useAuthStore } from '../store/authStore';
import PipelineStepper from '../components/job/PipelineStepper';
import MetricsPanel from '../components/job/MetricsPanel';
import ExecutionLog from '../components/job/ExecutionLog';
import ResultsPanel from '../components/job/ResultsPanel';
import DownloadSection from '../components/job/DownloadSection';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import type { StatusResponse, ResultsResponse, StageInfoItem } from '../types';
import { STAGE_INFO } from '../types';

// ============================================================
// Stage icon map
// ============================================================
const STAGE_ICONS: Record<number, React.ReactElement> = {
  1: <SearchIcon sx={{ fontSize: 18 }} />,
  2: <TrendingUpIcon sx={{ fontSize: 18 }} />,
  3: <CalculateIcon sx={{ fontSize: 18 }} />,
  4: <ShieldIcon sx={{ fontSize: 18 }} />,
  5: <CompareArrowsIcon sx={{ fontSize: 18 }} />,
  6: <DescriptionIcon sx={{ fontSize: 18 }} />,
  7: <CodeIcon sx={{ fontSize: 18 }} />,
  8: <ImageIcon sx={{ fontSize: 18 }} />,
};

// ============================================================
// Credit cost helpers — mirrors backend logic
// ============================================================
function computeCreditCost(selectedStages: number[] | null): number {
  if (selectedStages === null) return 5;
  if (selectedStages.length <= 3) return 1;
  return Math.max(2, selectedStages.length - 2);
}

// Credit display helper — matches backend formula exactly (database.py:17-23)
function creditDisplayText(selectedStages: number[] | null, stageCount: number): string {
  if (selectedStages === null) return '5 credits';
  if (stageCount <= 3) return '1 credit';
  const cost = Math.max(2, stageCount - 2);
  return `${cost} credits`;
}

// ============================================================
// Preview state component (embedded in JobView when jobId==='new')
// ============================================================
interface PreviewStateProps {
  company: string;
  selectedStages: number[] | null;
  onStartNow: () => void;
  onChangeSettings: () => void;
  startLoading: boolean;
  startError: string | null;
}

function PreviewState({
  company,
  selectedStages,
  onStartNow,
  onChangeSettings,
  startLoading,
  startError,
}: PreviewStateProps) {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.token !== null);

  const stagesInPipeline: StageInfoItem[] =
    selectedStages === null
      ? STAGE_INFO
      : STAGE_INFO.filter((s) => selectedStages.includes(s.number));

  const stageCount = stagesInPipeline.length;
  const creditCost = computeCreditCost(selectedStages);
  const hasEnoughCredits =
    !isLoggedIn || !user || user.role === 'admin' || user.credits >= creditCost;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          mb: 4,
          flexWrap: 'wrap',
        }}
        role="banner"
        aria-label="New analysis preview header"
      >
        <Tooltip title="Change Settings" arrow>
          <IconButton
            size="small"
            onClick={onChangeSettings}
            aria-label="Go back to change analysis settings"
            sx={{ color: 'text.secondary', mt: 0.25 }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontSize: '0.65rem', letterSpacing: '0.12em', display: 'block' }}
          >
            New Analysis Preview
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: '1.375rem', md: '1.75rem' }, fontWeight: 700, mb: 0.5 }}
          >
            {company}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Review the pipeline before starting. {stageCount} stage{stageCount !== 1 ? 's' : ''} will run.
          </Typography>
        </Box>

        {/* Queued badge */}
        <Chip
          label="READY TO START"
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.7rem',
            height: 26,
            backgroundColor: (t) => alpha(t.palette.success.main, 0.15),
            color: 'success.main',
            border: '1px solid',
            borderColor: (t) => alpha(t.palette.success.main, 0.35),
          }}
        />
      </Box>

      {/* ── Pipeline stage cards ────────────────────────────── */}
      <Box
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: (t) => alpha(t.palette.text.primary, 0.015),
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', display: 'block', mb: 2, fontSize: '0.65rem', letterSpacing: '0.1em' }}
        >
          Analysis Pipeline — {stageCount} stage{stageCount !== 1 ? 's' : ''} queued
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1.25,
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-start' },
          }}
          role="list"
          aria-label="Pipeline stages"
        >
          {stagesInPipeline.map((stage, idx) => (
            <Box
              key={stage.number}
              role="listitem"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                p: 1.5,
                minWidth: 100,
                maxWidth: 120,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                backgroundColor: (t) => alpha(t.palette.primary.main, 0.04),
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Stage number badge */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 6,
                  left: 8,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>
                  {idx + 1}
                </Typography>
              </Box>

              <Box sx={{ color: 'primary.main', mt: 0.5 }} aria-hidden="true">
                {STAGE_ICONS[stage.number] ?? <SearchIcon sx={{ fontSize: 18 }} />}
              </Box>

              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: '0.7rem',
                  textAlign: 'center',
                  lineHeight: 1.25,
                }}
              >
                {stage.name}
              </Typography>

              <Chip
                label="Queued"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  backgroundColor: (t) => alpha(t.palette.text.disabled, 0.08),
                  color: 'text.disabled',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Cost summary ────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card
            variant="outlined"
            sx={{
              borderColor: (t) => alpha(t.palette.primary.main, 0.2),
              backgroundColor: (t) => alpha(t.palette.primary.main, 0.04),
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                Stages in pipeline
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1.5rem' }}>
                {stageCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            variant="outlined"
            sx={{
              borderColor: (t) => alpha(t.palette.success.main, 0.2),
              backgroundColor: (t) => alpha(t.palette.success.main, 0.04),
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                Credit cost
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: 'success.main', fontSize: '1.5rem', fontFamily: 'monospace' }}
              >
                {creditDisplayText(selectedStages, stageCount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            variant="outlined"
            sx={{
              borderColor: (t) =>
                isLoggedIn && !hasEnoughCredits
                  ? alpha(t.palette.error.main, 0.3)
                  : alpha(t.palette.warning.main, 0.2),
              backgroundColor: (t) =>
                isLoggedIn && !hasEnoughCredits
                  ? alpha(t.palette.error.main, 0.04)
                  : alpha(t.palette.warning.main, 0.04),
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                {isLoggedIn ? 'Credits required' : 'Credits (guest)'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BoltIcon sx={{ fontSize: 18, color: isLoggedIn && !hasEnoughCredits ? 'error.main' : 'warning.main' }} />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: isLoggedIn && !hasEnoughCredits ? 'error.main' : 'warning.main',
                    fontSize: '1.5rem',
                  }}
                >
                  {creditCost}
                </Typography>
                {isLoggedIn && user && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', ml: 0.5 }}>
                    / {user.credits} available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Insufficient credits warning ────────────────────── */}
      {isLoggedIn && !hasEnoughCredits && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.href = '/credits'}>
              Buy Credits
            </Button>
          }
        >
          You need {creditCost} credits but only have {user?.credits ?? 0}. Purchase more credits to continue.
        </Alert>
      )}

      {/* ── Start error ─────────────────────────────────────── */}
      {startError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {startError}
        </Alert>
      )}

      {/* ── Action buttons ──────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Start Now — prominent, pulsing when ready */}
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={
            startLoading
              ? <CircularProgress size={20} color="inherit" />
              : <PlayArrowIcon />
          }
          disabled={startLoading || (isLoggedIn && !hasEnoughCredits)}
          onClick={onStartNow}
          aria-label="Start analysis now"
          sx={{
            py: 1.5,
            px: 4,
            fontSize: '1rem',
            fontWeight: 700,
            minWidth: 180,
            backgroundColor: 'success.main',
            '&:not(:disabled)': {
              animation: 'previewPulse 2s ease-in-out infinite',
            },
            '@keyframes previewPulse': {
              '0%, 100%': {
                boxShadow: `0 0 0 0 ${alpha('#10B981', 0.5)}`,
              },
              '50%': {
                boxShadow: '0 0 0 8px rgba(16, 185, 129, 0)',
              },
            },
            '&:hover': {
              backgroundColor: 'success.dark',
              animation: 'none',
            },
          }}
        >
          {startLoading ? 'Starting...' : 'Start Now'}
        </Button>

        {/* Change Settings */}
        <Button
          variant="outlined"
          size="large"
          startIcon={<SettingsBackupRestoreIcon />}
          onClick={onChangeSettings}
          aria-label="Go back to change analysis settings"
          sx={{ py: 1.5, fontWeight: 600 }}
        >
          Change Settings
        </Button>
      </Box>

      {/* Subtle note */}
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', display: 'block', mt: 2, fontSize: '0.7rem' }}
      >
        Credits are deducted when the analysis starts. The pipeline runs asynchronously — you can close this page and return later.
      </Typography>
    </Box>
  );
}

// ============================================================
// Elapsed time hook
// ============================================================
function useElapsedTime(startIso: string | undefined, stopped: boolean) {
  const [elapsed, setElapsed] = useState('00:00');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startIso) return;
    const startMs = new Date(startIso).getTime();

    const update = () => {
      const diffMs = Date.now() - startMs;
      const totalSec = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const secs = (totalSec % 60).toString().padStart(2, '0');
      setElapsed(`${mins}:${secs}`);
    };

    update();
    if (!stopped) {
      intervalRef.current = setInterval(update, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startIso, stopped]);

  return elapsed;
}

// ============================================================
// Status chip helper
// ============================================================
function statusChipProps(status: string) {
  if (status === 'completed') return { color: 'success' as const, label: 'COMPLETED' };
  if (status === 'failed') return { color: 'error' as const, label: 'FAILED' };
  if (status === 'running') return { color: 'primary' as const, label: 'RUNNING' };
  if (status === 'paused') return { color: 'warning' as const, label: 'PAUSED' };
  return { color: 'default' as const, label: status.toUpperCase() };
}

// ============================================================
// Page component
// ============================================================
export default function JobView() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const {
    setCurrentJobStatus,
    setCurrentResults,
    accessibilitySettings,
    stopInProgress,
    resumeInProgress,
    setStopInProgress,
    setResumeInProgress,
    pendingAnalysis,
    setPendingAnalysis,
    setCurrentJobId,
  } = useJobStore();
  const queryClient = useQueryClient();

  // ── Preview state (jobId === 'new') ────────────────────────
  const isNewJob = jobId === 'new';
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // ── Tab state ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // If /job/new but no pending analysis, redirect home
  useEffect(() => {
    if (isNewJob && !pendingAnalysis) {
      navigate('/', { replace: true });
    }
  }, [isNewJob, pendingAnalysis, navigate]);

  const handleStartNow = async () => {
    if (!pendingAnalysis) return;
    setStartLoading(true);
    setStartError(null);
    try {
      const result = await startAnalysis({
        company: pendingAnalysis.company,
        selected_stages: pendingAnalysis.selectedStages,
      });
      setCurrentJobId(result.job_id);
      setPendingAnalysis(null);
      navigate(`/job/${result.job_id}`, { replace: true });
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start analysis. Please try again.');
      setStartLoading(false);
    }
  };

  const handleChangeSettings = () => {
    navigate('/');
  };

  // ── Status polling (only when real jobId) ─────────────────
  const {
    data: statusData,
    error: statusError,
    isLoading: statusLoading,
  } = useQuery<StatusResponse>({
    queryKey: ['status', jobId],
    queryFn: () => getJobStatus(jobId!),
    // Disable for 'new' virtual job or while pending redirect
    enabled: !!jobId && !isNewJob,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === 'completed' || s === 'failed' || s === 'paused') return false;
      return 3000; // 3 s for snappy updates
    },
  });

  // ── Derived states ─────────────────────────────────────────
  const isCompleted = statusData?.status === 'completed';
  const isFailed = statusData?.status === 'failed';
  const isPaused = statusData?.status === 'paused';
  const isRunning = statusData?.status === 'running';

  // ── Clear stop/resume flags when status actually changes ──
  useEffect(() => {
    if (isPaused || isFailed || isCompleted) {
      setStopInProgress(false);
    }
    if (isRunning) {
      setResumeInProgress(false);
    }
  }, [statusData?.status, isPaused, isFailed, isCompleted, isRunning, setStopInProgress, setResumeInProgress]);

  // ── Stop/Resume handlers ───────────────────────────────────
  const handleStop = async () => {
    if (!jobId) return;
    setStopInProgress(true);
    try {
      await stopJob(jobId);
      await queryClient.refetchQueries({ queryKey: ['status', jobId] });
    } catch (e) {
      console.error('Stop failed:', e);
      setStopInProgress(false);
    }
  };

  const handleResume = async () => {
    if (!jobId) return;
    setResumeInProgress(true);
    try {
      await resumeJob(jobId);
      await queryClient.refetchQueries({ queryKey: ['status', jobId] });
    } catch (e) {
      console.error('Resume failed:', e);
      setResumeInProgress(false);
    }
  };

  // ── Results fetch (completed, paused, OR running for progressive loading) ─
  const { data: resultsData } = useQuery<ResultsResponse>({
    queryKey: ['results', jobId],
    queryFn: () => getJobResults(jobId!),
    enabled: !!jobId && !isNewJob && (isCompleted || isPaused || isRunning),
    staleTime: isCompleted ? Infinity : 10000,
    refetchInterval: isRunning ? 10000 : false,
  });

  // Sync to Zustand
  useEffect(() => {
    if (statusData) setCurrentJobStatus(statusData);
  }, [statusData, setCurrentJobStatus]);

  useEffect(() => {
    if (resultsData) setCurrentResults(resultsData);
  }, [resultsData, setCurrentResults]);

  // Elapsed timer — use actual job creation time, not page load
  const elapsed = useElapsedTime(
    resultsData?.created_at ?? statusData?.created_at ?? undefined,
    isCompleted || isFailed || isPaused,
  );

  const getModeName = (): string => {
    const s = statusData?.selected_stages;
    const t = statusData?.total_stages ?? 8;
    if (!s) return 'Full Analysis · 8 stages';
    if (s.length === 3 && s.includes(1) && s.includes(2) && s.includes(6)) return 'Quick Screen · 3 stages';
    return `Custom · ${t} stage${t !== 1 ? 's' : ''}`;
  };

  const chipProps = statusChipProps(statusData?.status ?? 'pending');

  // ── Render preview state for jobId === 'new' ───────────────
  if (isNewJob && pendingAnalysis) {
    return (
      <PreviewState
        company={pendingAnalysis.company}
        selectedStages={pendingAnalysis.selectedStages}
        onStartNow={handleStartNow}
        onChangeSettings={handleChangeSettings}
        startLoading={startLoading}
        startError={startError}
      />
    );
  }

  // Redirect is being processed — render nothing
  if (isNewJob) {
    return null;
  }

  if (statusError) {
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <Alert severity="error">
          Failed to load job status. The job ID may be invalid or you may not have permission to view it.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
        role="banner"
        aria-label="Job header"
      >
        <Tooltip title="Back to Dashboard" arrow>
          <IconButton
            size="small"
            onClick={() => navigate('/')}
            aria-label="Navigate back to dashboard"
            sx={{ color: 'text.secondary', mt: 0.25 }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {statusLoading ? (
            <Skeleton width={200} height={32} />
          ) : (
            <Typography variant="h2" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, mb: 0.5 }}>
              {resultsData?.company_input ?? statusData?.stage_name ?? 'Loading...'}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
            {resultsData?.created_at && (
              <>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                  {new Date(resultsData.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>·</Typography>
              </>
            )}
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
              {getModeName()}
            </Typography>
          </Box>
        </Box>

        {/* Status chip + elapsed + stop/resume controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Elapsed timer */}
          {isRunning && !stopInProgress && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  animation: 'headerPulse 1.2s ease-in-out infinite',
                  '@keyframes headerPulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }}
                aria-hidden="true"
              />
              <Typography
                variant="caption"
                sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.8rem' }}
              >
                {elapsed}
              </Typography>
            </Box>
          )}

          {/* STOP button */}
          {(isRunning || stopInProgress) && (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              startIcon={stopInProgress ? <CircularProgress size={14} color="inherit" /> : <StopCircleIcon />}
              disabled={stopInProgress}
              onClick={handleStop}
              aria-label="Stop analysis"
              sx={{ fontWeight: 700, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
            >
              {stopInProgress ? 'Stopping...' : 'Stop'}
            </Button>
          )}

          {/* RESUME button */}
          {(isPaused || isFailed) && !stopInProgress && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={resumeInProgress ? <CircularProgress size={14} color="inherit" /> : <PlayCircleFilledIcon />}
              disabled={resumeInProgress}
              onClick={handleResume}
              aria-label="Resume analysis"
              sx={{ fontWeight: 700 }}
            >
              {resumeInProgress ? 'Resuming...' : 'Resume'}
            </Button>
          )}

          {/* Status chip */}
          {statusLoading ? (
            <Skeleton width={90} height={26} sx={{ borderRadius: 2 }} />
          ) : (
            <Chip
              label={stopInProgress ? 'STOPPING' : chipProps.label}
              color={stopInProgress ? 'warning' : chipProps.color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 26 }}
            />
          )}
        </Box>
      </Box>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onChange={(_, v: number) => setActiveTab(v)}
        sx={{
          mb: 2,
          '& .MuiTab-root': { fontSize: '0.8125rem', fontWeight: 600, minWidth: 100 },
          '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
        }}
        aria-label="Job view tabs"
      >
        <Tab label="Pipeline" id="tab-pipeline" aria-controls="tabpanel-pipeline" />
        <Tab
          label="Analytics"
          id="tab-analytics"
          aria-controls="tabpanel-analytics"
          disabled={(statusData?.current_stage ?? 0) < 2 && !resultsData}
        />
        <Tab
          label="Downloads"
          id="tab-downloads"
          aria-controls="tabpanel-downloads"
          disabled={!isCompleted}
        />
      </Tabs>

      {/* ── Tab Panel: Pipeline (tab 0) ────────────────── */}
      <Box
        role="tabpanel"
        id="tabpanel-pipeline"
        aria-labelledby="tab-pipeline"
        hidden={activeTab !== 0}
      >
        {activeTab === 0 && (
          <>
            {/* Pipeline Stepper */}
            <Box
              sx={{
                mb: 3,
                p: 2.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: (t) => alpha(t.palette.text.primary, 0.015),
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: 'text.disabled',
                  display: 'block',
                  mb: 2,
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                }}
              >
                Analysis Pipeline
              </Typography>
              {statusLoading ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" width={112} height={90} sx={{ borderRadius: 2 }} />
                  ))}
                </Box>
              ) : (
                <PipelineStepper
                  statusData={statusData ?? null}
                  reducedMotion={accessibilitySettings.reducedMotion}
                  selectedStages={statusData?.selected_stages ?? null}
                />
              )}

              {isPaused && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  Analysis paused. Progress has been saved. Click <strong>Resume</strong> to continue.
                </Alert>
              )}
              {isFailed && (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  Analysis failed: {statusData?.error ?? 'Unknown error'}. Click <strong>Resume</strong> to retry from the last completed stage.
                </Alert>
              )}
            </Box>

            {/* Main Grid */}
            <Grid container spacing={2.5}>
              <Grid item xs={12} lg={8}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <ExecutionLog
                    statusData={statusData ?? null}
                    company={resultsData?.company_input ?? 'company'}
                  />
                  <ResultsPanel resultsData={resultsData ?? null} isRunning={isRunning} />
                </Box>
              </Grid>
              <Grid item xs={12} lg={4}>
                <MetricsPanel
                  statusData={statusData ?? null}
                  resultsData={resultsData ?? null}
                />
              </Grid>
            </Grid>
          </>
        )}
      </Box>

      {/* ── Tab Panel: Analytics (tab 1) ──────────────── */}
      <Box
        role="tabpanel"
        id="tabpanel-analytics"
        aria-labelledby="tab-analytics"
        hidden={activeTab !== 1}
      >
        {activeTab === 1 && (
          <AnalyticsDashboard
            resultsData={resultsData ?? null}
            statusData={statusData ?? null}
          />
        )}
      </Box>

      {/* ── Tab Panel: Downloads (tab 2) ──────────────── */}
      <Box
        role="tabpanel"
        id="tabpanel-downloads"
        aria-labelledby="tab-downloads"
        hidden={activeTab !== 2}
      >
        {activeTab === 2 && (
          <DownloadSection
            jobId={jobId ?? null}
            isCompleted={isCompleted}
          />
        )}
      </Box>
    </Box>
  );
}
