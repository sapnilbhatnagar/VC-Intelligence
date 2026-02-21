import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  alpha,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import TimelineIcon from '@mui/icons-material/Timeline';
import type { StatusResponse } from '../../types';

// ============================================================
// Stage metadata
// ============================================================
const STAGE_LABELS: Record<number, string> = {
  1: 'Company Research',
  2: 'Market Analysis',
  3: 'Financial Modeling',
  4: 'Risk Assessment',
  5: 'Comparable Deals',
  6: 'Investor Memo',
  7: 'HTML Report',
  8: 'Infographic',
};

function stageActiveMsg(stage: number, company: string): string {
  const co = company && company !== 'company' ? company : 'this company';
  const msgs: Record<number, string> = {
    1: `Profiling ${co} — researching the founding team, product, and recent developments`,
    2: `Mapping the competitive landscape and sizing the addressable market`,
    3: `Building a financial model and stress-testing revenue projections`,
    4: `Evaluating risk factors and scoring mitigation strategies`,
    5: `Sourcing comparable deals and benchmarking valuation multiples`,
    6: `Synthesizing all research and drafting the investment memorandum`,
    7: `Rendering the formatted HTML report`,
    8: `Generating the visual summary infographic`,
  };
  return msgs[stage] ?? 'Processing...';
}

function stageDoneMsg(stage: number, company: string): string {
  const co = company && company !== 'company' ? company : 'the company';
  const msgs: Record<number, string> = {
    1: `Profiled ${co}'s founding story, team, and product positioning`,
    2: `Market sizing and competitive analysis complete`,
    3: `Financial model built — projections and scenario analysis ready`,
    4: `Risk factors identified and scored`,
    5: `Comparable deals and valuation benchmarks compiled`,
    6: `Investment memorandum drafted`,
    7: `HTML report rendered and ready for download`,
    8: `Infographic created — all deliverables ready`,
  };
  return msgs[stage] ?? 'Complete';
}

// tau = half-life seconds — how fast the stage progress ring fills
const STAGE_TAU: Record<number, number> = {
  1: 27, 2: 30, 3: 55, 4: 45, 5: 27, 6: 72, 7: 15, 8: 15,
};

function simulatePct(elapsedSec: number, stageNum: number): number {
  const tau = STAGE_TAU[stageNum] ?? 40;
  return Math.min(92, Math.round(92 * (1 - Math.exp(-elapsedSec / tau))));
}

function fmtElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ============================================================
// Individual stage row
// ============================================================
type RowStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'paused' | 'failed';

interface StageRowProps {
  stageNum: number;
  rowStatus: RowStatus;
  company: string;
  elapsedSec: number;
  simPct: number;
}

function StageRow({ stageNum, rowStatus, company, elapsedSec, simPct }: StageRowProps) {
  const label = STAGE_LABELS[stageNum];
  const isActive = rowStatus === 'active';
  const isCompleted = rowStatus === 'completed';
  const isFailed = rowStatus === 'failed';
  const isPaused = rowStatus === 'paused';
  const isSkipped = rowStatus === 'skipped';
  const isPending = rowStatus === 'pending';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 0.875,
        opacity: isPending || isSkipped ? 0.35 : 1,
        transition: 'opacity 0.4s ease',
        animation: isActive ? 'rowPop 0.35s ease' : 'none',
        '@keyframes rowPop': { from: { opacity: 0.5, transform: 'translateX(-4px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      }}
    >
      {/* Fixed-width icon column (32px) */}
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isActive ? (
          /* Spinning clock ring with stage % inside */
          <Box sx={{ position: 'relative', width: 32, height: 32 }}>
            {/* Background track */}
            <CircularProgress
              variant="determinate"
              value={100}
              size={32}
              thickness={3}
              sx={{
                color: (t) => alpha(t.palette.primary.main, 0.14),
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
            {/* Progress arc — fills clockwise like a clock hand sweeping */}
            <CircularProgress
              variant="determinate"
              value={simPct}
              size={32}
              thickness={3}
              sx={{
                color: 'primary.main',
                position: 'absolute',
                top: 0,
                left: 0,
                transition: 'all 1.4s ease-out',
              }}
            />
            {/* Percentage label */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.5rem',
                  fontWeight: 800,
                  color: 'primary.main',
                  lineHeight: 1,
                  fontFamily: 'monospace',
                }}
              >
                {simPct}
              </Typography>
            </Box>
          </Box>
        ) : isCompleted ? (
          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
        ) : isFailed ? (
          <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
        ) : isPaused ? (
          <PauseCircleIcon sx={{ color: 'warning.main', fontSize: 20 }} />
        ) : isSkipped ? (
          <RemoveCircleOutlineIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
        )}
      </Box>

      {/* Text content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isActive ? 700 : isCompleted ? 600 : 400,
              fontSize: '0.8rem',
              color: isActive
                ? 'primary.main'
                : isCompleted
                ? 'text.primary'
                : isFailed
                ? 'error.main'
                : isPaused
                ? 'warning.main'
                : 'text.disabled',
              textDecoration: isSkipped ? 'line-through' : 'none',
            }}
          >
            {label}
          </Typography>

          {/* Right-side timing / status */}
          {isActive && elapsedSec > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontFamily: 'monospace',
                fontSize: '0.68rem',
                flexShrink: 0,
              }}
            >
              {fmtElapsed(elapsedSec)}
            </Typography>
          )}
          {isCompleted && (
            <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.63rem', flexShrink: 0 }}>
              done
            </Typography>
          )}
        </Box>

        {/* Sub-description — only for active and completed */}
        {isActive && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              mt: 0.3,
              fontSize: '0.71rem',
              lineHeight: 1.45,
              animation: 'descFade 0.5s ease',
              '@keyframes descFade': { from: { opacity: 0 }, to: { opacity: 1 } },
            }}
          >
            {stageActiveMsg(stageNum, company)}
          </Typography>
        )}
        {isCompleted && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              display: 'block',
              mt: 0.2,
              fontSize: '0.69rem',
              lineHeight: 1.35,
            }}
          >
            {stageDoneMsg(stageNum, company)}
          </Typography>
        )}
        {(isFailed || isPaused) && (
          <Typography
            variant="caption"
            sx={{
              color: isFailed ? 'error.main' : 'warning.main',
              display: 'block',
              mt: 0.2,
              fontSize: '0.7rem',
            }}
          >
            {isFailed
              ? 'Failed — click Resume to retry from this stage'
              : 'Paused — click Resume to continue'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ============================================================
// Main component
// ============================================================
interface ExecutionLogProps {
  statusData: StatusResponse | null;
  company: string;
}

export default function ExecutionLog({ statusData, company }: ExecutionLogProps) {
  const [expanded, setExpanded] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const stageStartRef = useRef<number>(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStage = statusData?.current_stage ?? 0;
  const jobStatus = statusData?.status ?? 'pending';
  const selectedStages = statusData?.selected_stages ?? null;
  const isRunning = jobStatus === 'running';

  // Reset elapsed counter when stage number changes
  useEffect(() => {
    stageStartRef.current = Date.now();
    setElapsedSec(0);
  }, [currentStage]);

  // Tick the in-stage elapsed timer every second while running
  useEffect(() => {
    if (isRunning && currentStage > 0) {
      tickRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - stageStartRef.current) / 1000));
      }, 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isRunning, currentStage]);

  const simPct = isRunning && currentStage > 0 ? simulatePct(elapsedSec, currentStage) : 0;

  const getRowStatus = (s: number): RowStatus => {
    if (selectedStages && !selectedStages.includes(s)) return 'skipped';
    if (s < currentStage) return 'completed';
    if (s === currentStage) {
      if (jobStatus === 'running') return 'active';
      if (jobStatus === 'paused') return 'paused';
      if (jobStatus === 'failed') return 'failed';
    }
    if (jobStatus === 'completed') return 'completed';
    return 'pending';
  };

  // Header badge
  const badgeLabel =
    jobStatus === 'running' ? 'LIVE'
      : jobStatus === 'completed' ? 'DONE'
      : jobStatus === 'paused' ? 'PAUSED'
      : jobStatus === 'failed' ? 'FAILED'
      : null;

  const badgePaletteKey =
    jobStatus === 'running' ? 'primary'
      : jobStatus === 'completed' ? 'success'
      : jobStatus === 'paused' ? 'warning'
      : 'error';

  return (
    <Box
      role="region"
      aria-label="Pipeline activity"
      sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          backgroundColor: (t) => alpha(t.palette.text.primary, 0.03),
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'divider',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((p) => !p)}
        role="button"
        aria-expanded={expanded}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            Pipeline Activity
          </Typography>
          {badgeLabel && (
            <Box
              sx={{
                px: 0.875,
                py: 0.25,
                borderRadius: 0.5,
                backgroundColor: (t) => alpha(t.palette[badgePaletteKey].main, 0.1),
                border: '1px solid',
                borderColor: (t) => alpha(t.palette[badgePaletteKey].main, 0.22),
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {jobStatus === 'running' && (
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    animation: 'liveBlink 1s step-start infinite',
                    '@keyframes liveBlink': {
                      '0%,100%': { opacity: 1 },
                      '50%': { opacity: 0 },
                    },
                  }}
                  aria-hidden="true"
                />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: `${badgePaletteKey}.main`,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                }}
              >
                {badgeLabel}
              </Typography>
            </Box>
          )}
        </Box>
        <Tooltip title={expanded ? 'Collapse' : 'Expand'} arrow>
          <IconButton
            size="small"
            aria-label={expanded ? 'Collapse activity log' : 'Expand activity log'}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((p) => !p);
            }}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Stage list ───────────────────────────────────────── */}
      <Collapse in={expanded}>
        <Box
          sx={{ px: 2, py: 1.5, maxHeight: 420, overflowY: 'auto' }}
          role="log"
          aria-live="polite"
          aria-label="Pipeline stage activity"
        >
          {statusData === null ? (
            <Typography
              variant="body2"
              sx={{ color: 'text.disabled', textAlign: 'center', py: 3 }}
            >
              Waiting for pipeline to start...
            </Typography>
          ) : (
            <Box>
              {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((s, i) => (
                <Box key={s}>
                  <StageRow
                    stageNum={s}
                    rowStatus={getRowStatus(s)}
                    company={company}
                    elapsedSec={s === currentStage ? elapsedSec : 0}
                    simPct={s === currentStage ? simPct : 0}
                  />
                  {/* Subtle divider between rows */}
                  {i < 7 && (
                    <Box
                      sx={{
                        ml: '44px',
                        height: '1px',
                        backgroundColor: (t) => alpha(t.palette.divider, 0.45),
                      }}
                    />
                  )}
                </Box>
              ))}

              {/* Completion banner */}
              {jobStatus === 'completed' && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 1.5,
                    backgroundColor: (t) => alpha(t.palette.success.main, 0.06),
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.success.main, 0.2),
                    animation: 'bannerFade 0.5s ease',
                    '@keyframes bannerFade': { from: { opacity: 0 }, to: { opacity: 1 } },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Analysis complete — all deliverables are ready for download
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
