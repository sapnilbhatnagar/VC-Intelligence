import { useRef, useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, alpha, Grow } from '@mui/material';
import type { ResultsResponse, RecommendationType } from '../../../types';

// ============================================================
// Constants
// ============================================================
const RECO_STYLE: Record<RecommendationType, { bg: string; text: string }> = {
  'STRONG BUY': { bg: '#10B981', text: '#fff' },
  BUY:          { bg: '#3B82F6', text: '#fff' },
  HOLD:         { bg: '#F59E0B', text: '#000' },
  PASS:         { bg: '#EF4444', text: '#fff' },
  'STRONG PASS':{ bg: '#7F1D1D', text: '#fff' },
};

function getRiskColor(score: number): string {
  if (score <= 3) return '#10B981';
  if (score <= 6) return '#F59E0B';
  return '#EF4444';
}

function getRiskLabel(score: number): string {
  if (score <= 3) return 'Low Risk';
  if (score <= 6) return 'Medium Risk';
  return 'High Risk';
}

// ============================================================
// Props
// ============================================================
interface KeyMetricsPanelProps {
  resultsData: ResultsResponse;
  stageCount: number;
  totalStages: number;
}

// ============================================================
// Animated risk bar sub-component
// ============================================================
function AnimatedRiskBar({ score, color }: { score: number; color: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Defer so the CSS transition fires after mount
    const id = window.setTimeout(() => setWidth((score / 10) * 100), 80);
    return () => window.clearTimeout(id);
  }, [score]);

  return (
    <Box
      sx={{
        width: 120,
        height: 8,
        borderRadius: 4,
        backgroundColor: alpha('#ffffff', 0.08),
        position: 'relative',
        overflow: 'hidden',
      }}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-label={`Risk score: ${score.toFixed(1)} out of 10`}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${width}%`,
          backgroundColor: color,
          borderRadius: 4,
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </Box>
  );
}

// ============================================================
// Component
// ============================================================
export default function KeyMetricsPanel({
  resultsData,
  stageCount,
  totalStages,
}: KeyMetricsPanelProps) {
  const mountedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setVisible(true);
    }
  }, []);

  const recoStyle = resultsData.recommendation ? RECO_STYLE[resultsData.recommendation] : null;
  const riskScore = resultsData.risk_score ?? 0;
  const riskColor = getRiskColor(riskScore);
  const riskLabel = getRiskLabel(riskScore);

  return (
    <Grow in={visible} timeout={400}>
      <Card
        variant="outlined"
        sx={{
          borderColor: 'divider',
          backgroundColor: alpha('#ffffff', 0.03),
        }}
        role="region"
        aria-label="Key analysis metrics"
      >
        <CardContent
          sx={{
            p: 2,
            '&:last-child': { pb: 2 },
            display: 'flex',
            gap: 3,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Recommendation badge */}
          {recoStyle && resultsData.recommendation && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Recommendation
              </Typography>
              <Chip
                label={resultsData.recommendation}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  height: 26,
                  backgroundColor: recoStyle.bg,
                  color: recoStyle.text,
                  px: 0.5,
                  letterSpacing: '0.03em',
                }}
                aria-label={`Recommendation: ${resultsData.recommendation}`}
              />
            </Box>
          )}

          {/* Risk score bar */}
          {resultsData.risk_score !== null && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Risk Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AnimatedRiskBar score={riskScore} color={riskColor} />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: riskColor,
                    fontSize: '0.72rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {riskScore.toFixed(1)}/10
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                  {riskLabel}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Stage completion */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Stages Complete
            </Typography>
            <Chip
              label={`${stageCount} / ${totalStages}`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                backgroundColor: alpha('#3B82F6', 0.12),
                color: '#3B82F6',
                width: 'fit-content',
              }}
              aria-label={`${stageCount} of ${totalStages} pipeline stages complete`}
            />
          </Box>

          {/* Token usage — pushed to the right on wider layouts */}
          {resultsData.total_tokens !== null && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: { xs: 0, sm: 'auto' } }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Tokens Used
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}
              >
                {(resultsData.total_tokens ?? 0).toLocaleString()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grow>
  );
}
