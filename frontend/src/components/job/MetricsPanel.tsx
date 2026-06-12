import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  alpha,
  Divider,
} from '@mui/material';
import type { StatusResponse, ResultsResponse } from '../../types';
import { useCreditsConversion } from '../../hooks/useCreditsConversion';
import { RECOMMENDATION_COLORS, riskColor, MONO } from '../../theme';
import { useAuthStore } from '../../store/authStore';

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
        borderRadius: '14px',
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: (t) => (accent ? alpha(t.palette.primary.main, 0.3) : 'divider'),
        boxShadow: '0 1px 3px rgba(22,27,34,0.05)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        '&:hover': { boxShadow: '0 6px 18px rgba(22,27,34,0.07)' },
      }}
    >
      <Typography
        sx={{
          fontFamily: MONO,
          color: 'text.secondary',
          fontSize: '0.6rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          display: 'block',
          mb: 0.75,
        }}
      >
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
  const usesPlatformKey = useAuthStore((s) => !!s.user?.uses_platform_key);

  const recommendation = resultsData?.recommendation ?? null;
  const recoConfig = recommendation ? RECOMMENDATION_COLORS[recommendation] : null;

  const creditsUsed = useCreditsConversion(resultsData?.total_tokens);

  const riskScore = resultsData?.risk_score ?? null;
  const riskScoreColor = riskScore === null ? 'text.disabled' : riskColor(riskScore);

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

      {/* Credits apply only to platform-key (passphrase) runs */}
      {usesPlatformKey && (
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
      )}

      <Divider />

      {/* Recommendation */}
      <MetricCard label="Recommendation" accent={!!recoConfig}>
        {recoConfig ? (
          <Chip
            label={recommendation}
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
            aria-label={`Recommendation: ${recommendation}`}
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
                color: riskScoreColor,
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
