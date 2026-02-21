import { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Skeleton, alpha } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// ============================================================
// Helpers
// ============================================================
function formatCurrency(val: number | null | undefined): string {
  if (val == null) return 'N/A';
  if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

/**
 * Pull a year-by-year revenue array from a scenario object.
 * Accepts keys like revenue_y1…revenue_y5, year1_revenue…year5_revenue,
 * or a revenues / projected_revenues array.
 */
function getRevenueArray(obj: Record<string, unknown> | undefined): number[] {
  if (!obj) return [];

  // Try explicit array field
  for (const key of ['revenues', 'projected_revenues', 'revenue_series']) {
    const arr = obj[key];
    if (Array.isArray(arr) && arr.length > 0) {
      return (arr as unknown[]).map((v) => (typeof v === 'number' ? v : 0)).slice(0, 5);
    }
  }

  // Try year-keyed scalars in two naming conventions
  const patterns = [
    (y: number) => `revenue_y${y}`,
    (y: number) => `year${y}_revenue`,
    (y: number) => `revenue_year${y}`,
    (y: number) => `y${y}_revenue`,
  ];

  for (const fmt of patterns) {
    const vals: number[] = [];
    for (let y = 1; y <= 5; y++) {
      const v = obj[fmt(y)];
      if (typeof v === 'number') vals.push(v);
    }
    if (vals.length >= 2) return vals;
  }

  // Last resort: single terminal value — build a linear ramp from a reasonable base
  const terminal =
    obj['year5_revenue'] ?? obj['revenue_y5'] ?? obj['projected_revenue'] ?? obj['revenue_year3'];
  if (typeof terminal === 'number' && terminal > 0) {
    // Synthesise a 5-point ramp ending at terminal
    return [0.1, 0.2, 0.4, 0.65, 1.0].map((f) => Math.round(f * terminal));
  }

  return [];
}

// ============================================================
// SVG line chart
// ============================================================
const SVG_W = 480;
const SVG_H = 160;
const PAD = { top: 16, right: 16, bottom: 32, left: 52 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;
const YEARS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'];

interface LineData {
  label: 'Bear' | 'Base' | 'Bull';
  color: string;
  values: number[]; // length 5
}

function buildPath(values: number[], maxVal: number): string {
  return values
    .map((v, i) => {
      const x = PAD.left + (i / (values.length - 1)) * PLOT_W;
      const y = PAD.top + PLOT_H - (v / maxVal) * PLOT_H;
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');
}

function buildShadeArea(bear: number[], bull: number[], maxVal: number): string {
  const topPath = bull
    .map((v, i) => {
      const x = PAD.left + (i / (bull.length - 1)) * PLOT_W;
      const y = PAD.top + PLOT_H - (v / maxVal) * PLOT_H;
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  const bottomPath = [...bear]
    .reverse()
    .map((v, i, arr) => {
      const origIdx = arr.length - 1 - i;
      const x = PAD.left + (origIdx / (arr.length - 1)) * PLOT_W;
      const y = PAD.top + PLOT_H - (v / maxVal) * PLOT_H;
      return `L${x} ${y}`;
    })
    .join(' ');

  return `${topPath} ${bottomPath} Z`;
}

interface ProjectionChartProps {
  lines: LineData[];
}

function ProjectionChart({ lines }: ProjectionChartProps) {
  const maxVal = useMemo(
    () => Math.max(...lines.flatMap((l) => l.values), 1),
    [lines],
  );

  const bear = lines.find((l) => l.label === 'Bear');
  const bull = lines.find((l) => l.label === 'Bull');

  // Horizontal gridlines
  const gridTicks = [0.25, 0.5, 0.75, 1.0];

  return (
    <Box
      component="figure"
      sx={{ m: 0, p: 0, width: '100%' }}
      aria-label="5-year revenue projections line chart"
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        {/* Gridlines */}
        {gridTicks.map((t) => {
          const y = PAD.top + PLOT_H - t * PLOT_H;
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + PLOT_W}
                y2={y}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="rgba(255,255,255,0.35)"
              >
                {formatCurrency(t * maxVal)}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {YEARS.map((yr, i) => {
          const x = PAD.left + (i / (YEARS.length - 1)) * PLOT_W;
          return (
            <text
              key={yr}
              x={x}
              y={PAD.top + PLOT_H + 18}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(255,255,255,0.4)"
            >
              {yr}
            </text>
          );
        })}

        {/* Shaded band between bear / bull */}
        {bear && bull && bear.values.length === 5 && bull.values.length === 5 && (
          <path
            d={buildShadeArea(bear.values, bull.values, maxVal)}
            fill="rgba(99,102,241,0.08)"
          />
        )}

        {/* Lines */}
        {lines.map((line) =>
          line.values.length < 2 ? null : (
            <path
              key={line.label}
              d={buildPath(line.values, maxVal)}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}

        {/* Data points */}
        {lines.map((line) =>
          line.values.map((v, i) => {
            const x = PAD.left + (i / (line.values.length - 1)) * PLOT_W;
            const y = PAD.top + PLOT_H - (v / maxVal) * PLOT_H;
            return (
              <circle
                key={`${line.label}-${i}`}
                cx={x}
                cy={y}
                r={3}
                fill={line.color}
                opacity={0.85}
              />
            );
          }),
        )}
      </svg>

      {/* Legend */}
      <Box
        sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 0.5 }}
        role="list"
        aria-label="Chart legend"
      >
        {lines.map((line) => (
          <Box
            key={line.label}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            role="listitem"
          >
            <Box
              sx={{
                width: 16,
                height: 3,
                borderRadius: 2,
                backgroundColor: line.color,
              }}
              aria-hidden="true"
            />
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
              {line.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ============================================================
// Key metrics grid
// ============================================================
interface MetricTileProps {
  label: string;
  value: string;
  color?: string;
}

function MetricTile({ label, value, color }: MetricTileProps) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: alpha('#ffffff', 0.02),
        flex: 1,
        minWidth: 90,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          color: 'text.disabled',
          fontSize: '0.62rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontFamily: 'monospace',
          color: color ?? 'text.primary',
          fontSize: '0.9rem',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ============================================================
// Skeleton placeholder
// ============================================================
function ProjectionsSkeleton() {
  return (
    <Box>
      <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1.5, mb: 1.5 }} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={56} sx={{ flex: 1, borderRadius: 1.5 }} />
        ))}
      </Box>
    </Box>
  );
}

// ============================================================
// Props
// ============================================================
interface FinancialProjectionsPanelProps {
  projections: Record<string, unknown> | null;
}

// ============================================================
// Component
// ============================================================
export default function FinancialProjectionsPanel({ projections }: FinancialProjectionsPanelProps) {
  const { lines, currentArr, year5Base, moicEstimate } = useMemo(() => {
    if (!projections) {
      return { lines: [], currentArr: null, year5Base: null, moicEstimate: null };
    }

    const bearObj = projections['bear_case'] as Record<string, unknown> | undefined;
    const baseObj = projections['base_case'] as Record<string, unknown> | undefined;
    const bullObj = projections['bull_case'] as Record<string, unknown> | undefined;

    const ensureFivePoints = (arr: number[]): number[] => {
      if (arr.length === 5) return arr;
      if (arr.length > 5) return arr.slice(0, 5);
      // Pad with linear extrapolation
      if (arr.length === 0) return [];
      const last = arr[arr.length - 1];
      const growth = arr.length > 1 ? last / arr[arr.length - 2] : 1.3;
      const out = [...arr];
      while (out.length < 5) out.push(Math.round(out[out.length - 1] * growth));
      return out;
    };

    const bearVals = ensureFivePoints(getRevenueArray(bearObj));
    const baseVals = ensureFivePoints(getRevenueArray(baseObj));
    const bullVals = ensureFivePoints(getRevenueArray(bullObj));

    const builtLines: LineData[] = [];
    if (bearVals.length > 0) builtLines.push({ label: 'Bear', color: '#EF4444', values: bearVals });
    if (baseVals.length > 0) builtLines.push({ label: 'Base', color: '#3B82F6', values: baseVals });
    if (bullVals.length > 0) builtLines.push({ label: 'Bull', color: '#10B981', values: bullVals });

    const currentArr = typeof projections['current_arr'] === 'number'
      ? (projections['current_arr'] as number)
      : null;

    const year5Base = baseVals.length === 5 ? baseVals[4] : null;

    // Simple MOIC heuristic: Year5Base / currentARR (capped for display)
    const moicEstimate =
      year5Base != null && currentArr != null && currentArr > 0
        ? Math.round((year5Base / currentArr) * 10) / 10
        : null;

    return { lines: builtLines, currentArr, year5Base, moicEstimate };
  }, [projections]);

  const hasData = lines.length > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: 'divider',
        backgroundColor: alpha('#ffffff', 0.03),
      }}
      role="region"
      aria-label="Financial projections"
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUpIcon fontSize="small" sx={{ color: '#10B981' }} aria-hidden="true" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Financial Projections
          </Typography>
          {typeof projections?.['company_name'] === 'string' && (
            <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
              {projections['company_name'] as string}
            </Typography>
          )}
        </Box>

        {!projections ? (
          <>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
              Financial modeling not yet completed.
            </Typography>
            <ProjectionsSkeleton />
          </>
        ) : !hasData ? (
          <>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
              Financial modeling not yet completed.
            </Typography>
            <ProjectionsSkeleton />
          </>
        ) : (
          <>
            {/* SVG Line Chart */}
            <ProjectionChart lines={lines} />

            {/* Key metrics row */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <MetricTile
                label="Current ARR"
                value={formatCurrency(currentArr)}
                color="#3B82F6"
              />
              <MetricTile
                label="Year 5 Base"
                value={formatCurrency(year5Base)}
                color="#10B981"
              />
              <MetricTile
                label="Est. MOIC"
                value={moicEstimate != null ? `${moicEstimate}x` : 'N/A'}
                color="#F59E0B"
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
