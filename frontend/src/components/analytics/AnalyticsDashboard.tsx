import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Skeleton,
  Fade,
  alpha,
  Collapse,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ResultsResponse, StatusResponse } from '../../types';
import { mdComponents } from '../../utils/markdownComponents';
import DataSourceTooltip from './DataSourceTooltip';
import KeyMetricsPanel from './panels/KeyMetricsPanel';
import InvestmentHighlightsPanel from './panels/InvestmentHighlightsPanel';
import FinancialProjectionsPanel from './panels/FinancialProjectionsPanel';
import RiskAssessmentPanel from './panels/RiskAssessmentPanel';
import ComparableDealsPanel from './panels/ComparableDealsPanel';

// ============================================================
// Market Intelligence Summary — collapsible, secondary placement
// ============================================================
const PREVIEW_LINES = 12;

function MarketSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = useMemo(() => text.split('\n'), [text]);
  const isLong = lines.length > PREVIEW_LINES;
  const previewText = isLong ? lines.slice(0, PREVIEW_LINES).join('\n') : text;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.5),
      }}
      role="region"
      aria-label="Market intelligence summary"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Market Intelligence Summary
        </Typography>
        <DataSourceTooltip
          stageName="Perform Market Analysis"
          stageNumber={2}
          description="Comprehensive market analysis including TAM/SAM/SOM sizing, competitive landscape, and industry trends from the market research stage."
        />
      </Box>

      {!expanded && (
        <Box>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {previewText}
          </ReactMarkdown>
          {isLong && (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              ...
            </Typography>
          )}
        </Box>
      )}

      <Collapse in={expanded} unmountOnExit>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {text}
        </ReactMarkdown>
      </Collapse>

      {isLong && (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          endIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          sx={{
            mt: 1,
            p: 0,
            minWidth: 0,
            fontSize: '0.72rem',
            textTransform: 'none',
            color: 'primary.main',
            '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
          }}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Read more...'}
        </Button>
      )}
    </Box>
  );
}

// ============================================================
// Types
// ============================================================
export interface AnalyticsDashboardProps {
  resultsData: ResultsResponse | null;
  statusData: StatusResponse | null;
}

// ============================================================
// Skeleton panel placeholder
// ============================================================
function PanelSkeleton({ stageHint }: { stageHint?: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.5),
        height: '100%',
        minHeight: 200,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={120} height={20} />
        {stageHint && (
          <Box
            sx={{
              ml: 'auto',
              px: 1,
              py: 0.25,
              borderRadius: 0.5,
              backgroundColor: (t) => alpha(t.palette.warning.main, 0.1),
              border: '1px solid',
              borderColor: (t) => alpha(t.palette.warning.main, 0.2),
            }}
          >
            <Typography variant="caption" sx={{ color: 'warning.main', fontSize: '0.6rem', fontWeight: 600 }}>
              {stageHint}
            </Typography>
          </Box>
        )}
      </Box>
      <Skeleton variant="text" width="100%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="85%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="70%" height={16} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

// ============================================================
// Main Analytics Dashboard
// ============================================================
export default function AnalyticsDashboard({ resultsData, statusData }: AnalyticsDashboardProps) {
  const stageCount = statusData?.current_stage ?? resultsData?.current_stage ?? 0;
  const totalStages = statusData?.total_stages ?? 8;
  const isRunning = statusData?.status === 'running';

  if (!resultsData && stageCount < 2) {
    return (
      <Box
        sx={{
          py: 6,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          Analytics will appear once at least 2 pipeline stages have completed.
        </Typography>
      </Box>
    );
  }

  const hasMarket = !!resultsData?.market_analysis;
  const hasFinancials = !!resultsData?.financial_projections;
  const hasRisk = !!resultsData?.risk_assessment && resultsData.risk_score !== null;
  const hasComps = !!resultsData?.comparable_deals;
  const hasMemo = !!resultsData?.investor_memo;

  return (
    <Box role="region" aria-label="Analytics dashboard">
      {/* ── Row 1: Key Metrics Tiles (full width) ── */}
      {resultsData && (
        <Fade in timeout={400}>
          <Box sx={{ mb: 2.5 }}>
            <KeyMetricsPanel
              resultsData={resultsData}
              stageCount={stageCount}
              totalStages={totalStages}
            />
          </Box>
        </Fade>
      )}

      {/* ── Row 2: Primary investor panels — Highlights + Financial ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          {hasMemo ? (
            <Fade in timeout={500}>
              <Box sx={{ height: '100%' }}>
                <InvestmentHighlightsPanel memoText={resultsData?.investor_memo ?? null} />
              </Box>
            </Fade>
          ) : (
            <PanelSkeleton
              stageHint={isRunning ? 'Stage 6: Generate Investor Memo' : undefined}
            />
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {hasFinancials ? (
            <Fade in timeout={600}>
              <Box sx={{ height: '100%' }}>
                <FinancialProjectionsPanel
                  projections={resultsData?.financial_projections as Record<string, unknown> | null ?? null}
                />
              </Box>
            </Fade>
          ) : (
            <PanelSkeleton
              stageHint={isRunning && stageCount < 3 ? 'Stage 3: Build Financial Model' : undefined}
            />
          )}
        </Grid>
      </Grid>

      {/* ── Row 3: Risk + Comps ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          {hasRisk ? (
            <Fade in timeout={700}>
              <Box sx={{ height: '100%' }}>
                <RiskAssessmentPanel
                  text={resultsData!.risk_assessment!}
                  riskScore={resultsData!.risk_score!}
                />
              </Box>
            </Fade>
          ) : (
            <PanelSkeleton
              stageHint={isRunning && stageCount < 4 ? 'Stage 4: Conduct Risk Assessment' : undefined}
            />
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {hasComps ? (
            <Fade in timeout={800}>
              <Box sx={{ height: '100%' }}>
                <ComparableDealsPanel text={resultsData!.comparable_deals!} />
              </Box>
            </Fade>
          ) : (
            <PanelSkeleton
              stageHint={isRunning && stageCount < 5 ? 'Stage 5: Research Comparable Deals' : undefined}
            />
          )}
        </Grid>
      </Grid>

      {/* ── Row 4: Market Intelligence — full width, secondary importance ── */}
      {hasMarket && (
        <Fade in timeout={500}>
          <Box>
            <MarketSummary text={resultsData!.market_analysis!} />
          </Box>
        </Fade>
      )}
    </Box>
  );
}
