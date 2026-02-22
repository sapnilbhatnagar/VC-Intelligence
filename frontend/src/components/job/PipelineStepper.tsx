import { Box, Typography, LinearProgress, alpha } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalculateIcon from '@mui/icons-material/Calculate';
import ShieldIcon from '@mui/icons-material/Shield';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import type { StatusResponse } from '../../types';

// ============================================================
// Stage icon map
// ============================================================
const STAGE_ICONS: Record<number, React.ReactNode> = {
  1: <SearchIcon fontSize="small" />,
  2: <TrendingUpIcon fontSize="small" />,
  3: <CalculateIcon fontSize="small" />,
  4: <ShieldIcon fontSize="small" />,
  5: <CompareArrowsIcon fontSize="small" />,
  6: <DescriptionIcon fontSize="small" />,
  7: <CodeIcon fontSize="small" />,
  8: <ImageIcon fontSize="small" />,
};

const STAGE_NAMES = [
  'Execute Company Research',
  'Perform Market Analysis',
  'Build Financial Model',
  'Conduct Risk Assessment',
  'Research Comparable Deals',
  'Generate Investor Memo',
  'Render Investor Report',
  'Create Visual Summary',
];

// ============================================================
// Types
// ============================================================
type StageStatus = 'pending' | 'active' | 'completed' | 'failed' | 'paused' | 'skipped';

function getStageStatus(
  stageNumber: number,
  currentStage: number,
  jobStatus: string,
  selectedStages: number[] | null,
): StageStatus {
  // If selectedStages exists and this stage is not in it, it's skipped
  if (selectedStages && !selectedStages.includes(stageNumber)) return 'skipped';
  if (jobStatus === 'failed' && stageNumber === currentStage) return 'failed';
  if (jobStatus === 'paused' && stageNumber === currentStage) return 'paused';
  if (stageNumber < currentStage) return 'completed';
  if (stageNumber === currentStage && jobStatus === 'running') return 'active';
  if (jobStatus === 'completed') return 'completed';
  return 'pending';
}

// ============================================================
// Single stage card
// ============================================================
interface StageCardProps {
  number: number;
  name: string;
  status: StageStatus;
  reducedMotion?: boolean;
}

function StageCard({ number, name, status, reducedMotion }: StageCardProps) {
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isPaused = status === 'paused';
  const isSkipped = status === 'skipped';

  return (
    <Box
      role="listitem"
      aria-label={`Stage ${number}: ${name} — ${status}`}
      sx={{
        flex: '0 0 auto',
        width: { xs: 100, sm: 112, md: 120 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isSkipped
          ? (t) => alpha(t.palette.divider, 0.5)
          : isActive
          ? 'primary.main'
          : isCompleted
          ? 'success.main'
          : isFailed
          ? 'error.main'
          : isPaused
          ? 'warning.main'
          : 'divider',
        backgroundColor: isSkipped
          ? 'transparent'
          : isActive
          ? (t) => alpha(t.palette.primary.main, 0.08)
          : isCompleted
          ? (t) => alpha(t.palette.success.main, 0.06)
          : isFailed
          ? (t) => alpha(t.palette.error.main, 0.06)
          : isPaused
          ? (t) => alpha(t.palette.warning.main, 0.08)
          : (t) => alpha(t.palette.text.primary, 0.02),
        opacity: isSkipped ? 0.35 : 1,
        transition: 'all 0.3s ease',
        // Active card is slightly larger/more prominent
        transform: isActive ? 'scale(1.04)' : 'scale(1)',
        zIndex: isActive ? 1 : 0,
        animation:
          isActive && !reducedMotion ? 'stageGlow 2s ease-in-out infinite' : 'none',
        '@keyframes stageGlow': {
          '0%, 100%': {
            boxShadow: (t: { palette: { primary: { main: string } } }) =>
              `0 0 5px ${alpha(t.palette.primary.main, 0.3)}`,
          },
          '50%': {
            boxShadow: (t: { palette: { primary: { main: string } } }) =>
              `0 0 20px ${alpha(t.palette.primary.main, 0.7)}, 0 0 40px ${alpha(
                t.palette.primary.main,
                0.3
              )}`,
          },
        },
        ...(isActive && !reducedMotion
          ? { boxShadow: '0 0 12px rgba(59, 130, 246, 0.45)' }
          : {}),
      }}
    >
      {/* Stage number badge — gradient for completed */}
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isSkipped
            ? 'transparent'
            : isCompleted
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            : isActive
            ? (t) => t.palette.primary.main
            : isFailed
            ? (t) => t.palette.error.main
            : isPaused
            ? (t) => t.palette.warning.main
            : (t) => t.palette.divider,
          border: isSkipped ? '1px dashed' : 'none',
          borderColor: 'divider',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: isSkipped ? 'text.disabled' : '#fff', lineHeight: 1 }}>
          {number}
        </Typography>
      </Box>

      {/* Stage icon */}
      <Box
        sx={{
          color: isSkipped
            ? 'text.disabled'
            : isActive
            ? 'primary.main'
            : isCompleted
            ? 'success.main'
            : isFailed
            ? 'error.main'
            : isPaused
            ? 'warning.main'
            : 'text.disabled',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
        aria-hidden="true"
      >
        {isSkipped ? (
          <RemoveCircleOutlineIcon fontSize="small" sx={{ color: 'text.disabled' }} />
        ) : isCompleted ? (
          <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
        ) : isFailed ? (
          <ErrorIcon fontSize="small" sx={{ color: 'error.main' }} />
        ) : isPaused ? (
          <PauseCircleIcon fontSize="small" sx={{ color: 'warning.main' }} />
        ) : (
          STAGE_ICONS[number]
        )}

        {isActive && !reducedMotion && (
          <Box
            sx={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              animation: 'dotPulse 1.4s ease-in-out infinite',
              '@keyframes dotPulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.6)', opacity: 0.5 },
              },
            }}
            aria-hidden="true"
          />
        )}
      </Box>

      {/* Stage name */}
      <Typography
        variant="caption"
        sx={{
          textAlign: 'center',
          lineHeight: 1.3,
          fontSize: '0.65rem',
          textDecoration: isSkipped ? 'line-through' : 'none',
          color: isSkipped
            ? 'text.disabled'
            : isActive
            ? 'primary.main'
            : isCompleted
            ? 'success.main'
            : isFailed
            ? 'error.main'
            : isPaused
            ? 'warning.main'
            : 'text.disabled',
          fontWeight: isActive || isCompleted || isPaused ? 600 : 400,
        }}
      >
        {isSkipped ? 'Skipped' : name}
      </Typography>
    </Box>
  );
}

// ============================================================
// Main PipelineStepper
// ============================================================
interface PipelineStepperProps {
  statusData: StatusResponse | null;
  reducedMotion?: boolean;
  selectedStages?: number[] | null;
}

export default function PipelineStepper({ statusData, reducedMotion, selectedStages }: PipelineStepperProps) {
  const currentStage = statusData?.current_stage ?? 0;
  const progressPct = statusData?.progress_pct ?? 0;
  const jobStatus = statusData?.status ?? 'pending';
  const stages = selectedStages ?? statusData?.selected_stages ?? null;

  return (
    <Box aria-label="Analysis pipeline progress" role="region">
      <Box
        role="list"
        aria-label="Pipeline stages"
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
        {STAGE_NAMES.map((name, idx) => {
          const stageNum = idx + 1;
          const status = getStageStatus(stageNum, currentStage, jobStatus, stages);
          return (
            <StageCard
              key={stageNum}
              number={stageNum}
              name={name}
              status={status}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </Box>

      {/* Progress bar */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {statusData?.stage_name ?? 'Initializing...'}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'primary.main', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8rem' }}
          >
            {progressPct.toFixed(1)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPct}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
    </Box>
  );
}
