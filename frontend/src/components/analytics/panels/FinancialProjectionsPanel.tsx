import { memo, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Chip,
  alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DataSourceTooltip from '../DataSourceTooltip';

// ============================================================
// Helpers
// ============================================================
function formatCurrency(val: number | null | undefined): string {
  if (val == null) return 'N/A';
  if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

/**
 * Compute year-by-year revenues from growth rate multipliers + starting ARR.
 * currentArr is in USD millions (as returned by the backend).
 * Returns raw USD values (e.g. 5_000_000 for $5M).
 */
function computeRevenuesFromRates(currentArrMillions: number, rates: number[]): number[] {
  const currentArrRaw = currentArrMillions * 1_000_000;
  const revenues: number[] = [];
  let prev = currentArrRaw;
  for (const rate of rates) {
    prev = prev * rate;
    revenues.push(Math.round(prev));
  }
  return revenues;
}

/**
 * Pull a year-by-year revenue array from a scenario object (legacy / fallback format).
 * Accepts keys like revenue_y1…revenue_y5, year1_revenue…year5_revenue,
 * or a revenues / projected_revenues array.
 */
function getRevenueArrayLegacy(obj: Record<string, unknown> | undefined): number[] {
  if (!obj) return [];

  for (const key of ['revenues', 'projected_revenues', 'revenue_series']) {
    const arr = obj[key];
    if (Array.isArray(arr) && arr.length > 0) {
      return (arr as unknown[]).map((v) => (typeof v === 'number' ? v : 0)).slice(0, 5);
    }
  }

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

  return [];
}

// ============================================================
// SVG line chart
// ============================================================
const SVG_W = 480;
const SVG_H = 160;
const PAD = { top: 16, right: 16, bottom: 32, left: 56 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;
const YEARS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'];

interface LineData {
  label: 'Bear' | 'Base' | 'Bull';
  color: string;
  values: number[];
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
  const gridTicks = [0.25, 0.5, 0.75, 1.0];

  return (
    <Box
      component="figure"
      sx={{ m: 0, p: 0, width: '100%' }}
      aria-label="5-year revenue projection line chart — Bear, Base, and Bull scenarios"
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

        {/* X-axis year labels */}
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

        {/* Shaded confidence band between bear and bull */}
        {bear && bull && bear.values.length === 5 && bull.values.length === 5 && (
          <path
            d={buildShadeArea(bear.values, bull.values, maxVal)}
            fill="rgba(99,102,241,0.08)"
          />
        )}

        {/* Scenario lines */}
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

        {/* Data point dots */}
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
              sx={{ width: 16, height: 3, borderRadius: 2, backgroundColor: line.color }}
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
// Key metric tile
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
        sx={{ fontWeight: 700, fontFamily: 'monospace', color: color ?? 'text.primary', fontSize: '0.9rem' }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ============================================================
// Skeleton placeholder (stage pending)
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
// Parse error state (projections exist but can't be read)
// ============================================================
function ProjectionsParseError() {
  return (
    <Box
      sx={{
        py: 3,
        px: 2,
        borderRadius: 1.5,
        border: '1px dashed',
        borderColor: (t) => alpha(t.palette.warning.main, 0.3),
        backgroundColor: (t) => alpha(t.palette.warning.main, 0.04),
        textAlign: 'center',
      }}
    >
      <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 22, mb: 0.75 }} />
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem' }}>
        Financial projections were generated but could not be parsed for display.
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, fontSize: '0.68rem' }}>
        The full model narrative is available in the Pipeline tab.
      </Typography>
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
function FinancialProjectionsPanel({ projections }: FinancialProjectionsPanelProps) {
  const { lines, currentArrRaw, year5Base, moicEstimate, stage, yearStart } = useMemo(() => {
    const empty = { lines: [] as LineData[], currentArrRaw: null, year5Base: null, moicEstimate: null, stage: null, yearStart: null };
    if (!projections) return empty;

    const currentArr = typeof projections['current_arr'] === 'number'
      ? (projections['current_arr'] as number)
      : null;

    // ── Primary format: growth-rate multipliers (current backend output) ──
    // bear_rates, base_rates, bull_rates are YoY revenue multipliers
    const bearRates = projections['bear_rates'];
    const baseRates = projections['base_rates'];
    const bullRates = projections['bull_rates'];

    const hasRateFormat =
      Array.isArray(bearRates) && (bearRates as unknown[]).length > 0 &&
      currentArr !== null;

    if (hasRateFormat) {
      const builtLines: LineData[] = [];

      if (Array.isArray(bearRates) && bearRates.length > 0) {
        builtLines.push({
          label: 'Bear',
          color: '#EF4444',
          values: computeRevenuesFromRates(currentArr!, bearRates as number[]),
        });
      }
      if (Array.isArray(baseRates) && baseRates.length > 0) {
        builtLines.push({
          label: 'Base',
          color: '#3B82F6',
          values: computeRevenuesFromRates(currentArr!, baseRates as number[]),
        });
      }
      if (Array.isArray(bullRates) && bullRates.length > 0) {
        builtLines.push({
          label: 'Bull',
          color: '#10B981',
          values: computeRevenuesFromRates(currentArr!, bullRates as number[]),
        });
      }

      const baseLine = builtLines.find((l) => l.label === 'Base');
      const y5Base = baseLine && baseLine.values.length === 5 ? baseLine.values[4] : null;
      const currentArrRaw = currentArr !== null ? currentArr * 1_000_000 : null;
      const moic =
        y5Base !== null && currentArrRaw !== null && currentArrRaw > 0
          ? Math.round((y5Base / currentArrRaw) * 10) / 10
          : null;

      return {
        lines: builtLines,
        currentArrRaw,
        year5Base: y5Base,
        moicEstimate: moic,
        stage: typeof projections['stage'] === 'string' ? projections['stage'] as string : null,
        yearStart: typeof projections['year_start'] === 'number' ? projections['year_start'] as number : null,
      };
    }

    // ── Fallback: nested scenario objects (legacy format) ──
    const bearObj = projections['bear_case'] as Record<string, unknown> | undefined;
    const baseObj = projections['base_case'] as Record<string, unknown> | undefined;
    const bullObj = projections['bull_case'] as Record<string, unknown> | undefined;

    const ensureFivePoints = (arr: number[]): number[] => {
      if (arr.length === 5) return arr;
      if (arr.length > 5) return arr.slice(0, 5);
      if (arr.length === 0) return [];
      const last = arr[arr.length - 1];
      const growth = arr.length > 1 ? last / arr[arr.length - 2] : 1.3;
      const out = [...arr];
      while (out.length < 5) out.push(Math.round(out[out.length - 1] * growth));
      return out;
    };

    const bearVals = ensureFivePoints(getRevenueArrayLegacy(bearObj));
    const baseVals = ensureFivePoints(getRevenueArrayLegacy(baseObj));
    const bullVals = ensureFivePoints(getRevenueArrayLegacy(bullObj));

    const legacyLines: LineData[] = [];
    if (bearVals.length > 0) legacyLines.push({ label: 'Bear', color: '#EF4444', values: bearVals });
    if (baseVals.length > 0) legacyLines.push({ label: 'Base', color: '#3B82F6', values: baseVals });
    if (bullVals.length > 0) legacyLines.push({ label: 'Bull', color: '#10B981', values: bullVals });

    if (legacyLines.length === 0) return empty;

    const y5Base = baseVals.length === 5 ? baseVals[4] : null;
    const arrRaw = currentArr !== null ? currentArr * 1_000_000 : null;
    const moic =
      y5Base !== null && arrRaw !== null && arrRaw > 0
        ? Math.round((y5Base / arrRaw) * 10) / 10
        : null;

    return {
      lines: legacyLines,
      currentArrRaw: arrRaw,
      year5Base: y5Base,
      moicEstimate: moic,
      stage: null,
      yearStart: null,
    };
  }, [projections]);

  const hasData = lines.length > 0;

  // Determine if projections were received but couldn't be parsed
  const hasParseError = projections !== null && !hasData;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: 'divider',
        backgroundColor: alpha('#ffffff', 0.03),
      }}
      role="region"
      aria-label="Financial modelling and projections"
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TrendingUpIcon fontSize="small" sx={{ color: '#10B981' }} aria-hidden="true" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Financial Modelling
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
              5-year revenue projections — Bear / Base / Bull scenarios
            </Typography>
          </Box>
          <DataSourceTooltip
            stageName="Build Financial Model"
            stageNumber={3}
            description="Revenue projections computed from AI-generated growth rate scenarios (Bear/Base/Bull) applied to the company's current ARR."
          />
          {stage && (
            <Chip
              label={stage}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 600,
                backgroundColor: alpha('#10B981', 0.1),
                color: '#10B981',
              }}
            />
          )}
        </Box>

        {/* ── Year reference label ── */}
        {yearStart && hasData && (
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1, fontSize: '0.65rem' }}>
            Projection period: {yearStart}–{yearStart + 4} &nbsp;·&nbsp; Y1 = Year {yearStart}
          </Typography>
        )}

        {/* ── Content states ── */}
        {!projections ? (
          <>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
              Awaiting financial modelling stage…
            </Typography>
            <ProjectionsSkeleton />
          </>
        ) : hasParseError ? (
          <ProjectionsParseError />
        ) : (
          <>
            {/* SVG Line Chart */}
            <ProjectionChart lines={lines} />

            {/* Key metrics row */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <MetricTile
                label="Current ARR"
                value={formatCurrency(currentArrRaw)}
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

export default memo(FinancialProjectionsPanel);
