import { memo, useRef, useEffect, useState } from 'react';
import { Box, Typography, Chip, alpha, Grow } from '@mui/material';
import type { ResultsResponse, RecommendationType } from '../../../types';
import DataSourceTooltip from '../DataSourceTooltip';

// ============================================================
// Constants
// ============================================================
const RECO_STYLE: Record<RecommendationType, { bg: string; text: string; glow: string }> = {
  'STRONG BUY': { bg: '#10B981', text: '#fff', glow: 'rgba(16, 185, 129, 0.25)' },
  BUY:          { bg: '#3B82F6', text: '#fff', glow: 'rgba(59, 130, 246, 0.25)' },
  HOLD:         { bg: '#F59E0B', text: '#000', glow: 'rgba(245, 158, 11, 0.2)' },
  PASS:         { bg: '#EF4444', text: '#fff', glow: 'rgba(239, 68, 68, 0.25)' },
  'STRONG PASS':{ bg: '#7F1D1D', text: '#fff', glow: 'rgba(127, 29, 29, 0.3)' },
};

function getRiskColor(score: number): string {
  if (score <= 3) return '#10B981';
  if (score <= 6) return '#F59E0B';
  return '#EF4444';
}

function getRiskLabel(score: number): string {
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Medium';
  return 'High';
}

// ============================================================
// Animated risk ring (compact)
// ============================================================
const RING_SIZE = 52;
const STROKE = 5;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function MiniRiskRing({ score, color }: { score: number; color: string }) {
  const [offset, setOffset] = useState(CIRC);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const id = window.setTimeout(() => setOffset(CIRC - (score / 10) * CIRC), 100);
      return () => window.clearTimeout(id);
    }
  }, [score]);

  const c = RING_SIZE / 2;
  return (
    <Box sx={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ display: 'block' }}>
        <circle cx={c} cy={c} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
        <circle
          cx={c} cy={c} r={RADIUS} fill="none" stroke={color} strokeWidth={STROKE}
          strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color, lineHeight: 1 }}>
          {score.toFixed(1)}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================================
// Metric tile sub-component
// ============================================================
interface TileProps {
  label: string;
  children: React.ReactNode;
  accentColor?: string;
  flex?: number;
}

function MetricTile({ label, children, accentColor, flex = 1 }: TileProps) {
  return (
    <Box
      sx={{
        flex,
        minWidth: 120,
        p: 1.75,
        borderRadius: 2,
        border: '1px solid',
        borderColor: accentColor ? alpha(accentColor, 0.2) : 'divider',
        backgroundColor: accentColor ? alpha(accentColor, 0.04) : alpha('#ffffff', 0.02),
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.62rem',
          fontWeight: 600,
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
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
// Component
// ============================================================
function KeyMetricsPanel({ resultsData, stageCount, totalStages }: KeyMetricsPanelProps) {
  const mountedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; setVisible(true); }
  }, []);

  const reco = resultsData.recommendation;
  const recoStyle = reco ? RECO_STYLE[reco] : null;
  const riskScore = resultsData.risk_score ?? 0;
  const riskColor = getRiskColor(riskScore);
  const hasRisk = resultsData.risk_score !== null;

  // Extract financial metrics if available
  const projections = resultsData.financial_projections as Record<string, unknown> | null;
  const currentArr = projections && typeof projections['current_arr'] === 'number'
    ? (projections['current_arr'] as number) : null;

  // Compute MOIC from rates if available
  let moic: number | null = null;
  if (currentArr && projections) {
    const baseRates = projections['base_rates'];
    if (Array.isArray(baseRates) && baseRates.length === 5) {
      let rev = currentArr * 1_000_000;
      for (const r of baseRates as number[]) rev *= r;
      moic = Math.round((rev / (currentArr * 1_000_000)) * 10) / 10;
    }
  }

  const formatCurr = (val: number) => {
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}B`;
    return `$${val.toFixed(0)}M`;
  };

  return (
    <Grow in={visible} timeout={400}>
      <Box role="region" aria-label="Key analysis metrics">
        {/* Row of metric tiles */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Tile 1: Investment Verdict */}
          {recoStyle && reco && (
            <MetricTile label="Investment Verdict" accentColor={recoStyle.bg} flex={1.2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={reco}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    height: 28,
                    backgroundColor: recoStyle.bg,
                    color: recoStyle.text,
                    px: 0.75,
                    letterSpacing: '0.03em',
                    boxShadow: `0 2px 8px ${recoStyle.glow}`,
                  }}
                />
                <DataSourceTooltip
                  stageName="Generate Investor Memo"
                  stageNumber={6}
                  description="Investment recommendation derived from the AI-generated investor memo, synthesizing all prior research stages."
                />
              </Box>
            </MetricTile>
          )}

          {/* Tile 2: Risk Score */}
          {hasRisk && (
            <MetricTile label="Risk Score" accentColor={riskColor}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <MiniRiskRing score={riskScore} color={riskColor} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: riskColor, fontSize: '0.85rem', lineHeight: 1.2 }}>
                    {getRiskLabel(riskScore)} Risk
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.25 }}>
                    {riskScore.toFixed(1)} / 10
                  </Typography>
                </Box>
                <DataSourceTooltip
                  stageName="Conduct Risk Assessment"
                  stageNumber={4}
                  description="Composite risk score (0-10) from the AI risk assessment stage, evaluating market, financial, regulatory, and execution risks."
                />
              </Box>
            </MetricTile>
          )}

          {/* Tile 3: Current ARR (if available) */}
          {currentArr !== null && (
            <MetricTile label="Current ARR" accentColor="#3B82F6">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#3B82F6', fontSize: '1.1rem' }}>
                  {formatCurr(currentArr)}
                </Typography>
                <DataSourceTooltip
                  stageName="Build Financial Model"
                  stageNumber={3}
                  description="Current Annual Recurring Revenue extracted during financial modelling from public filings, estimates, or disclosed data."
                />
              </Box>
            </MetricTile>
          )}

          {/* Tile 4: Est. MOIC */}
          {moic !== null && (
            <MetricTile label="Est. 5Y MOIC" accentColor="#F59E0B">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#F59E0B', fontSize: '1.1rem' }}>
                  {moic}x
                </Typography>
                <DataSourceTooltip
                  stageName="Build Financial Model"
                  stageNumber={3}
                  description="Estimated 5-year Multiple on Invested Capital based on base-case revenue projections vs. current ARR."
                />
              </Box>
            </MetricTile>
          )}

          {/* Tile 5: Pipeline Progress */}
          <MetricTile label="Pipeline Progress">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${stageCount} / ${totalStages}`}
                size="small"
                sx={{
                  height: 26,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  backgroundColor: alpha('#3B82F6', 0.12),
                  color: '#3B82F6',
                }}
              />
              {resultsData.total_tokens !== null && (
                <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
                  {(resultsData.total_tokens).toLocaleString()} tokens
                </Typography>
              )}
            </Box>
          </MetricTile>
        </Box>
      </Box>
    </Grow>
  );
}

export default memo(KeyMetricsPanel);
