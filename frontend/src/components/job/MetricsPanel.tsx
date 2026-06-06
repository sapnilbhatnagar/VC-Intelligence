import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  alpha,
  Divider,
} from '@mui/material';
import type { StatusResponse, ResultsResponse, RecommendationType } from '../../types';
import { useCreditsConversion } from '../../hooks/useCreditsConversion';

// ============================================================
// Recommendation chip color map
// ============================================================
const RECO_COLOR: Record<
  RecommendationType,
  { bg: string; text: string; label: string }
> = {
  'STRONG BUY': { bg: '#10B981', text: '#fff', label: 'STRONG BUY' },
  BUY: { bg: '#5B9DF9', text: '#fff', label: 'BUY' },
  HOLD: { bg: '#F59E0B', text: '#000', label: 'HOLD' },
  PASS: { bg: '#EF4444', text: '#fff', label: 'PASS' },
  'STRONG PASS': { bg: '#7F1D1D', text: '#fff', label: 'STRONG PASS' },
};

// ============================================================
// Animated counter hook
// ============================================================
function useCountUp(target: number | null, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    };
    raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return value;
}

// ============================================================
// Sub-components
// ============================================================
interface MetricCardProps {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}

function MetricCard({ label, children, accent }: MetricCardProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: (t) =>
          accent ? alpha(t.palette.primary.main, 0.06) : alpha(t.palette.text.primary, 0.03),
        border: '1px solid',
        borderColor: (t) =>
          accent ? alpha(t.palette.primary.main, 0.2) : 'divider',
      }}
    >
      <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem', display: 'block', mb: 0.75 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'success'
      : status === 'running'
      ? 'primary'
      : status === 'failed'
      ? 'error'
      : status === 'paused'
      ? 'warning'
      : 'default';

  const dotColor =
    status === 'completed'
      ? 'success.main'
      : status === 'running'
      ? 'primary.main'
      : status === 'failed'
      ? 'error.main'
      : status === 'paused'
      ? 'warning.main'
      : 'text.disabled';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: dotColor,
          animation: status === 'running' ? 'statusPulse 1.4s ease-in-out infinite' : 'none',
          '@keyframes statusPulse': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.5, transform: 'scale(1.3)' },
          },
        }}
        aria-hidden="true"
      />
      <Chip
        label={status.toUpperCase()}
        color={color as 'success' | 'primary' | 'error' | 'warning' | 'default'}
        size="small"
        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
      />
    </Box>
  );
}

// ============================================================
// Main component
// ============================================================
interface MetricsPanelProps {
  statusData: StatusResponse | null;
  resultsData: ResultsResponse | null;
}

export default function MetricsPanel({ statusData, resultsData }: MetricsPanelProps) {
  const animatedTokens = useCountUp(resultsData?.total_tokens ?? null);

  const recommendation = resultsData?.recommendation ?? null;
  const recoConfig = recommendation ? RECO_COLOR[recommendation] : null;

  const creditsUsed = useCreditsConversion(resultsData?.total_tokens);

  const riskScore = resultsData?.risk_score ?? null;
  const riskColor =
    riskScore === null
      ? 'text.disabled'
      : riskScore <= 3
      ? 'success.main'
      : riskScore <= 6
      ? 'warning.main'
      : 'error.main';

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
      role="region"
      aria-label="Job metrics panel"
    >
      {/* Status */}
      <MetricCard label="Status" accent={statusData?.status === 'running' || statusData?.status === 'paused'}>
        <StatusBadge status={statusData?.status ?? 'pending'} />
      </MetricCard>

      {/* Progress */}
      <MetricCard label="Progress">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <CircularProgress
              variant="determinate"
              value={statusData?.progress_pct ?? 0}
              size={48}
              thickness={4}
              sx={{ color: 'primary.main' }}
              aria-label={`${(statusData?.progress_pct ?? 0).toFixed(1)}% complete`}
            />
            {/* Background track */}
            <CircularProgress
              variant="determinate"
              value={100}
              size={48}
              thickness={4}
              sx={{
                color: 'divider',
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: -1,
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                {Math.round(statusData?.progress_pct ?? 0)}%
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Stage {statusData?.current_stage ?? 0} / {statusData?.total_stages ?? 8}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {statusData?.stage_name ?? 'Waiting...'}
            </Typography>
          </Box>
        </Box>
      </MetricCard>

      <Divider />

      {/* Tokens */}
      <MetricCard label="Total Tokens">
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: resultsData ? 'primary.main' : 'text.disabled',
            fontSize: '1.25rem',
          }}
          aria-label={`${animatedTokens.toLocaleString()} tokens used`}
        >
          {resultsData ? animatedTokens.toLocaleString() : '—'}
        </Typography>
      </MetricCard>

      {/* Credits Used */}
      <MetricCard label="AI Credits Used">
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: resultsData ? 'success.main' : 'text.disabled',
            fontSize: '1.25rem',
          }}
          aria-label={creditsUsed ? `Credits used: ${creditsUsed}` : 'Credits not yet available'}
        >
          {creditsUsed ?? '—'}
        </Typography>
      </MetricCard>

      <Divider />

      {/* Recommendation */}
      <MetricCard label="Recommendation" accent={!!recoConfig}>
        {recoConfig ? (
          <Chip
            label={recoConfig.label}
            size="medium"
            sx={{
              backgroundColor: recoConfig.bg,
              color: recoConfig.text,
              fontWeight: 700,
              fontSize: '0.8125rem',
              height: 30,
              animation: 'fadeIn 0.5s ease',
              '@keyframes fadeIn': { from: { opacity: 0, transform: 'scale(0.9)' }, to: { opacity: 1, transform: 'scale(1)' } },
            }}
            aria-label={`Recommendation: ${recoConfig.label}`}
          />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            Pending analysis...
          </Typography>
        )}
      </MetricCard>

      {/* Risk Score */}
      <MetricCard label="Risk Score">
        {riskScore !== null ? (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography
              variant="h3"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 700,
                color: riskColor,
                fontSize: '1.75rem',
                lineHeight: 1,
                animation: 'fadeIn 0.5s ease',
                '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
              }}
              aria-label={`Risk score: ${riskScore.toFixed(1)} out of 10`}
            >
              {riskScore.toFixed(1)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              / 10
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            —
          </Typography>
        )}
      </MetricCard>
    </Box>
  );
}
