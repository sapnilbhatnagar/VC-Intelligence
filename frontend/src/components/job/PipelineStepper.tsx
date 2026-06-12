import { Box, Typography, LinearProgress, alpha } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import PauseIcon from '@mui/icons-material/Pause';
import RemoveIcon from '@mui/icons-material/Remove';
import { MONO, TOKENS } from '../../theme';
import type { StatusResponse } from '../../types';

// ============================================================
// PipelineStepper — the agent rail.
//
// Eight nodes on a connected track. The fill of the track and the
// state of each node show the agent moving stage to stage; the
// banner below names the stage being worked and the engine
// (model) working it.
// ============================================================

interface StageMeta {
  short: string;
  engine: string;
}

const STAGE_META: StageMeta[] = [
  { short: 'Company research', engine: 'Haiku + web search' },
  { short: 'Market analysis', engine: 'Haiku + web search' },
  { short: 'Financial model', engine: 'Sonnet' },
  { short: 'Risk assessment', engine: 'Sonnet + extended thinking' },
  { short: 'Comparable deals', engine: 'Haiku + web search' },
  { short: 'Investor memo', engine: 'Sonnet + extended thinking' },
  { short: 'Investor report', engine: 'Template engine' },
  { short: 'Visual summary', engine: 'Haiku + chart engine' },
];

type StageStatus = 'queued' | 'active' | 'completed' | 'failed' | 'paused' | 'skipped';

function getStageStatus(
  stageNumber: number,
  currentStage: number,
  jobStatus: string,
  selectedStages: number[] | null,
): StageStatus {
  if (selectedStages && !selectedStages.includes(stageNumber)) return 'skipped';
  if (jobStatus === 'failed' && stageNumber === currentStage) return 'failed';
  if (jobStatus === 'paused' && stageNumber === currentStage) return 'paused';
  if (stageNumber < currentStage) return 'completed';
  if (stageNumber === currentStage && jobStatus === 'running') return 'active';
  if (jobStatus === 'completed') return 'completed';
  return 'queued';
}

const NODE_COLOR: Record<StageStatus, string> = {
  queued: TOKENS.borderStrong,
  active: TOKENS.brand,
  completed: TOKENS.success,
  failed: TOKENS.error,
  paused: TOKENS.warning,
  skipped: TOKENS.border,
};

// ============================================================
// Single node on the rail
// ============================================================
interface RailNodeProps {
  number: number;
  meta: StageMeta;
  status: StageStatus;
  reducedMotion?: boolean;
}

function RailNode({ number, meta, status, reducedMotion }: RailNodeProps) {
  const color = NODE_COLOR[status];
  const isActive = status === 'active';
  const filled = status === 'completed' || status === 'failed' || status === 'paused' || isActive;

  return (
    <Box
      role="listitem"
      aria-label={`Stage ${number}: ${meta.short} — ${status}`}
      sx={{
        flex: '1 1 0',
        minWidth: 86,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        position: 'relative',
        py: 0.5,
      }}
    >
      {/* node disc */}
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? color : 'background.paper',
          border: '2px solid',
          borderColor: status === 'skipped' ? TOKENS.border : color,
          color: filled ? '#FFFFFF' : status === 'skipped' ? 'text.disabled' : 'text.secondary',
          zIndex: 1,
          transition: 'background-color 0.25s ease, border-color 0.25s ease, transform 0.25s ease',
          transform: isActive ? 'scale(1.12)' : 'scale(1)',
          ...(isActive && !reducedMotion && {
            '@media (prefers-reduced-motion: no-preference)': {
              animation: 'railPulse 2s ease-in-out infinite',
              '@keyframes railPulse': {
                '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(TOKENS.brand, 0.4)}` },
                '60%': { boxShadow: `0 0 0 8px ${alpha(TOKENS.brand, 0)}` },
              },
            },
          }),
        }}
        aria-hidden="true"
      >
        {status === 'completed' ? (
          <CheckIcon sx={{ fontSize: 15 }} />
        ) : status === 'failed' ? (
          <PriorityHighIcon sx={{ fontSize: 14 }} />
        ) : status === 'paused' ? (
          <PauseIcon sx={{ fontSize: 14 }} />
        ) : status === 'skipped' ? (
          <RemoveIcon sx={{ fontSize: 14 }} />
        ) : (
          <Typography sx={{ fontFamily: MONO, fontSize: '0.68rem', fontWeight: 600, lineHeight: 1, color: 'inherit' }}>
            {number}
          </Typography>
        )}
      </Box>

      {/* label */}
      <Typography
        variant="caption"
        sx={{
          textAlign: 'center',
          lineHeight: 1.25,
          fontSize: '0.66rem',
          fontWeight: isActive ? 700 : status === 'completed' ? 600 : 500,
          color:
            status === 'skipped'
              ? 'text.disabled'
              : isActive
              ? 'primary.main'
              : status === 'failed'
              ? 'error.main'
              : status === 'paused'
              ? 'warning.main'
              : 'text.secondary',
          textDecoration: status === 'skipped' ? 'line-through' : 'none',
          maxWidth: 96,
        }}
      >
        {meta.short}
      </Typography>
    </Box>
  );
}

// ============================================================
// Main rail
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

  const activeMeta = currentStage >= 1 && currentStage <= 8 ? STAGE_META[currentStage - 1] : null;
  const isRunning = jobStatus === 'running';

  // The track fill ends at the active node (or the end when completed).
  const fillPct = jobStatus === 'completed' ? 100 : Math.max(0, ((currentStage - 0.5) / 8) * 100);

  return (
    <Box aria-label="Analysis pipeline progress" role="region">
      {/* rail with connecting track */}
      <Box sx={{ position: 'relative', overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: 0.5, md: 0 }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Box sx={{ position: 'relative', minWidth: 720 }}>
          {/* track */}
          <Box aria-hidden="true" sx={{ position: 'absolute', top: 19, left: '5%', right: '5%', height: '2px', backgroundColor: TOKENS.border }} />
          {/* track fill */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top: 19,
              left: '5%',
              width: `${Math.min(90, (fillPct * 0.9))}%`,
              height: '2px',
              backgroundColor: jobStatus === 'failed' ? TOKENS.error : jobStatus === 'paused' ? TOKENS.warning : TOKENS.success,
              transition: 'width 0.5s ease',
            }}
          />
          <Box role="list" aria-label="Pipeline stages" sx={{ display: 'flex', position: 'relative' }}>
            {STAGE_META.map((meta, idx) => {
              const stageNum = idx + 1;
              return (
                <RailNode
                  key={stageNum}
                  number={stageNum}
                  meta={meta}
                  status={getStageStatus(stageNum, currentStage, jobStatus, stages)}
                  reducedMotion={reducedMotion}
                />
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* active stage banner */}
      <Box
        sx={{
          mt: 2,
          px: 2,
          py: 1.5,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: isRunning ? TOKENS.brandSoftBorder : 'divider',
          backgroundColor: isRunning ? TOKENS.brandSoft : TOKENS.surfaceAlt,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {statusData?.stage_name ?? 'Initializing'}
            </Typography>
            {activeMeta && (
              <Typography sx={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.05em', color: 'text.secondary', border: '1px solid', borderColor: 'divider', borderRadius: '6px', px: 0.75, py: 0.15, backgroundColor: 'background.paper' }}>
                {activeMeta.engine}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, fontFamily: MONO, fontSize: '0.8rem' }}>
            {progressPct.toFixed(1)}%
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progressPct} sx={{ height: 6, borderRadius: 3 }} />
      </Box>
    </Box>
  );
}
