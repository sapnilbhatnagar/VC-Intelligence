import { Box, Typography, alpha } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import PauseIcon from '@mui/icons-material/Pause';
import RemoveIcon from '@mui/icons-material/Remove';
import { MONO } from '../../theme';
import type { StatusResponse } from '../../types';

// ============================================================
// PipelineStepper — the agent rail as a mission-control panel.
//
// A committed dark surface (the product's one dark panel, matching
// the landing page's pipeline band): eight nodes on a connected
// track that fills as the agent advances, a live status pill, and
// a banner naming the stage being worked and the engine tier
// working it.
// ============================================================

// Dark-panel palette (local: this is the only dark product surface).
const PANEL = {
  bg: '#0E131B',
  bgGlow: 'radial-gradient(80% 90% at 85% -10%, rgba(37,99,235,0.18) 0%, transparent 60%)',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.22)',
  text: '#F2F5F9',
  dim: 'rgba(255,255,255,0.62)',
  faint: 'rgba(255,255,255,0.38)',
  cobalt: '#3B82F6',
  cobaltSoft: '#8AB4F8',
  green: '#26A45D',
  amber: '#D29922',
  red: '#E5534B',
};

interface StageMeta {
  short: string;
  engine: string;
}

const STAGE_META: StageMeta[] = [
  { short: 'Company research', engine: 'Fast model + web search' },
  { short: 'Market analysis', engine: 'Fast model + web search' },
  { short: 'Financial model', engine: 'Reasoning model' },
  { short: 'Risk assessment', engine: 'Reasoning model + deep thinking' },
  { short: 'Comparable deals', engine: 'Fast model + web search' },
  { short: 'Investor memo', engine: 'Reasoning model + deep thinking' },
  { short: 'Investor report', engine: 'Template engine' },
  { short: 'Visual summary', engine: 'Fast model + chart engine' },
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
  queued: PANEL.lineStrong,
  active: PANEL.cobalt,
  completed: PANEL.green,
  failed: PANEL.red,
  paused: PANEL.amber,
  skipped: PANEL.line,
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
        gap: 0.9,
        position: 'relative',
        py: 0.5,
      }}
    >
      {/* node disc */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? color : PANEL.bg,
          border: '2px solid',
          borderColor: status === 'skipped' ? PANEL.line : color,
          color: filled ? '#FFFFFF' : status === 'skipped' ? PANEL.faint : PANEL.dim,
          zIndex: 1,
          transition: 'background-color 0.25s ease, border-color 0.25s ease, transform 0.25s ease',
          transform: isActive ? 'scale(1.15)' : 'scale(1)',
          boxShadow: isActive ? `0 0 18px ${alpha(PANEL.cobalt, 0.55)}` : 'none',
          ...(isActive && !reducedMotion && {
            '@media (prefers-reduced-motion: no-preference)': {
              animation: 'railPulse 2s ease-in-out infinite',
              '@keyframes railPulse': {
                '0%, 100%': { boxShadow: `0 0 12px ${alpha(PANEL.cobalt, 0.45)}, 0 0 0 0 ${alpha(PANEL.cobalt, 0.4)}` },
                '60%': { boxShadow: `0 0 18px ${alpha(PANEL.cobalt, 0.6)}, 0 0 0 9px ${alpha(PANEL.cobalt, 0)}` },
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
              ? PANEL.faint
              : isActive
              ? PANEL.cobaltSoft
              : status === 'failed'
              ? PANEL.red
              : status === 'paused'
              ? PANEL.amber
              : status === 'completed'
              ? PANEL.text
              : PANEL.dim,
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
// Status pill for the panel header
// ============================================================
function StatusPill({ jobStatus }: { jobStatus: string }) {
  const map: Record<string, { label: string; color: string; pulse?: boolean }> = {
    running: { label: 'LIVE', color: PANEL.cobalt, pulse: true },
    completed: { label: 'COMPLETE', color: PANEL.green },
    paused: { label: 'PAUSED', color: PANEL.amber },
    failed: { label: 'FAILED', color: PANEL.red },
    pending: { label: 'QUEUED', color: PANEL.lineStrong },
  };
  const pill = map[jobStatus] ?? map.pending;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.4,
        borderRadius: '999px',
        border: `1px solid ${alpha(pill.color, 0.6)}`,
        backgroundColor: alpha(pill.color, 0.14),
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: pill.color,
          ...(pill.pulse && {
            '@media (prefers-reduced-motion: no-preference)': {
              animation: 'pillPulse 1.4s ease-in-out infinite',
              '@keyframes pillPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
            },
          }),
        }}
      />
      <Typography sx={{ fontFamily: MONO, fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.12em', color: PANEL.text }}>
        {pill.label}
      </Typography>
    </Box>
  );
}

// ============================================================
// Main panel
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

  // The track fill ends at the active node (or the end when completed).
  const fillPct = jobStatus === 'completed' ? 100 : Math.max(0, ((currentStage - 0.5) / 8) * 100);
  const fillColor =
    jobStatus === 'failed' ? PANEL.red : jobStatus === 'paused' ? PANEL.amber : undefined;

  return (
    <Box
      aria-label="Analysis pipeline progress"
      role="region"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '18px',
        backgroundColor: PANEL.bg,
        color: PANEL.text,
        p: { xs: 2, md: 2.75 },
        boxShadow: '0 18px 48px rgba(14,19,27,0.28)',
      }}
    >
      {/* ambient glow */}
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: PANEL.bgGlow, pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative' }}>
        {/* header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.64rem', letterSpacing: '0.16em', color: PANEL.dim }}>
            ANALYSIS PIPELINE
          </Typography>
          <StatusPill jobStatus={jobStatus} />
        </Box>

        {/* rail with connecting track */}
        <Box sx={{ overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: 0.5, md: 0 }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Box sx={{ position: 'relative', minWidth: 720 }}>
            {/* track */}
            <Box aria-hidden="true" sx={{ position: 'absolute', top: 20, left: '5%', right: '5%', height: '2px', backgroundColor: PANEL.line }} />
            {/* track fill */}
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                top: 20,
                left: '5%',
                width: `${Math.min(90, fillPct * 0.9)}%`,
                height: '2px',
                background: fillColor ?? `linear-gradient(90deg, ${PANEL.green}, ${PANEL.cobalt})`,
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
            mt: 2.25,
            px: 2,
            py: 1.5,
            borderRadius: '12px',
            border: `1px solid ${PANEL.line}`,
            backgroundColor: 'rgba(255,255,255,0.045)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: PANEL.text }}>
                {statusData?.stage_name ?? 'Initializing'}
              </Typography>
              {activeMeta && (
                <Typography sx={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.05em', color: PANEL.dim, border: `1px solid ${PANEL.line}`, borderRadius: '6px', px: 0.75, py: 0.15 }}>
                  {activeMeta.engine}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: PANEL.cobaltSoft, fontWeight: 700, fontFamily: MONO, fontSize: '0.8rem' }}>
              {progressPct.toFixed(1)}%
            </Typography>
          </Box>
          {/* progress bar */}
          <Box sx={{ height: 6, borderRadius: 3, backgroundColor: PANEL.line, overflow: 'hidden' }} role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
            <Box
              sx={{
                height: '100%',
                width: `${progressPct}%`,
                borderRadius: 3,
                background: fillColor ?? `linear-gradient(90deg, ${PANEL.green}, ${PANEL.cobalt})`,
                transition: 'width 0.5s ease',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
