import { useState, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Collapse,
  alpha,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdComponents } from '../../../utils/markdownComponents';
import DataSourceTooltip from '../DataSourceTooltip';

// ============================================================
// Types
// ============================================================
interface DealItem {
  name: string;
  detail: string;
  valuation: string | null;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Extract a monetary valuation string from a line of text.
 * Matches patterns like "$1.2B", "$450M", "€200M", "valued at $X".
 */
function extractValuation(text: string): string | null {
  const match = text.match(
    /(?:valued?\s+at\s+|valuation\s+of\s+|raised?\s+)?(\$|€|£)[\d.,]+\s*(?:[BbMmKk]|billion|million|thousand)?/,
  );
  return match ? match[0].trim() : null;
}

/**
 * Parse the comparable deals text into structured DealItem objects.
 *
 * Handles formats:
 *   1. Company Name: description ...
 *   1. **Company Name** — description ...
 *   - Company Name ($500M) ...
 */
function parseDeals(text: string): DealItem[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10);

  const deals: DealItem[] = [];

  for (const line of lines) {
    const listMatch = line.match(/^(?:\d+[\.\)]|[-•*])\s+\*{0,2}([^:*–\-]{4,60})\*{0,2}[:\s–\-]+(.+)/);
    if (listMatch) {
      const raw = listMatch[1].trim();
      const detail = listMatch[2].trim().replace(/\*+/g, '');
      deals.push({ name: raw, detail, valuation: extractValuation(line) });
      if (deals.length >= 8) break;
      continue;
    }

    const boldMatch = line.match(/^\*{2}([^*]{3,50})\*{2}\s*[-:–]\s*(.+)/);
    if (boldMatch) {
      deals.push({
        name: boldMatch[1].trim(),
        detail: boldMatch[2].trim(),
        valuation: extractValuation(line),
      });
      if (deals.length >= 8) break;
    }
  }

  if (deals.length < 2) {
    return lines
      .filter((l) => /^(?:\d+[\.\)]|[-•*])\s/.test(l) && l.length > 15)
      .slice(0, 6)
      .map((l) => ({
        name: l.replace(/^(?:\d+[\.\)]|[-•*])\s+/, '').slice(0, 60),
        detail: l.replace(/^(?:\d+[\.\)]|[-•*])\s+/, ''),
        valuation: extractValuation(l),
      }));
  }

  return deals;
}

// ============================================================
// Deal card sub-component
// ============================================================
interface DealCardProps {
  deal: DealItem;
  index: number;
}

const ACCENT = '#6366F1';

function DealCard({ deal, index }: DealCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 1.25,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: alpha(ACCENT, 0.03),
        transition: 'background-color 0.18s',
        '&:hover': { backgroundColor: alpha(ACCENT, 0.07) },
      }}
      role="listitem"
    >
      {/* Index badge */}
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: 1,
          backgroundColor: alpha(ACCENT, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          mt: 0.1,
        }}
        aria-hidden="true"
      >
        <Typography
          sx={{ fontSize: '0.65rem', fontWeight: 700, color: ACCENT, fontFamily: 'monospace' }}
        >
          {String(index + 1).padStart(2, '0')}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flexWrap: 'wrap',
            mb: deal.detail ? 0.25 : 0,
          }}
        >
          <BusinessOutlinedIcon
            sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }}
            aria-hidden="true"
          />
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.78rem', lineHeight: 1.3 }}
          >
            {deal.name}
          </Typography>
          {deal.valuation && (
            <Chip
              label={deal.valuation}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                backgroundColor: alpha(ACCENT, 0.12),
                color: ACCENT,
                px: 0.25,
              }}
              aria-label={`Valuation: ${deal.valuation}`}
            />
          )}
        </Box>
        {deal.detail && deal.detail !== deal.name && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.71rem',
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}
          >
            {deal.detail}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ============================================================
// Props
// ============================================================
interface ComparableDealsPanelProps {
  text: string;
}

// ============================================================
// Component
// ============================================================
function ComparableDealsPanel({ text }: ComparableDealsPanelProps) {
  // Two independent expansion states: deal list and full report
  const [showMoreDeals, setShowMoreDeals] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  const deals = useMemo(() => parseDeals(text), [text]);
  const hasStructuredDeals = deals.length >= 2;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: 'divider',
        backgroundColor: alpha('#ffffff', 0.03),
      }}
      role="region"
      aria-label="Comparable deals and market benchmarks"
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
          <CompareArrowsIcon
            fontSize="small"
            sx={{ color: ACCENT, mt: 0.15, flexShrink: 0 }}
            aria-hidden="true"
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Comparable Deals
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', lineHeight: 1.3 }}>
              Recent transactions, valuations, and benchmarks in the same sector
            </Typography>
          </Box>
          <DataSourceTooltip
            stageName="Research Comparable Deals"
            stageNumber={5}
            description="Comparable transactions and market benchmarks identified by the AI comps research stage, including deal sizes and valuations."
          />
          {hasStructuredDeals && (
            <Chip
              label={`${deals.length} comps`}
              size="small"
              sx={{
                flexShrink: 0,
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 600,
                backgroundColor: alpha(ACCENT, 0.1),
                color: ACCENT,
              }}
              aria-label={`${deals.length} comparable deals found`}
            />
          )}
        </Box>

        {hasStructuredDeals ? (
          <>
            {/* ── Deal cards ── */}
            <Box
              role="list"
              aria-label="Comparable deals list"
              sx={{ display: 'flex', flexDirection: 'column', gap: 0.875, mt: 1.5 }}
            >
              {(showMoreDeals ? deals : deals.slice(0, 4)).map((deal, i) => (
                <DealCard key={i} deal={deal} index={i} />
              ))}
            </Box>

            {deals.length > 4 && (
              <Button
                size="small"
                onClick={() => setShowMoreDeals((v) => !v)}
                sx={{
                  mt: 1.25,
                  fontSize: '0.68rem',
                  p: 0,
                  minWidth: 0,
                  textTransform: 'none',
                  color: ACCENT,
                  '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
                }}
                aria-expanded={showMoreDeals}
              >
                {showMoreDeals
                  ? 'Show fewer comps'
                  : `Show ${deals.length - 4} more comp${deals.length - 4 > 1 ? 's' : ''}`}
              </Button>
            )}

            {/* ── Full report toggle ── */}
            <Divider sx={{ mt: 1.5, mb: 1 }} />
            <Box>
              <Button
                size="small"
                startIcon={<ArticleOutlinedIcon fontSize="small" />}
                onClick={() => setShowFullReport((v) => !v)}
                sx={{
                  fontSize: '0.68rem',
                  p: 0,
                  minWidth: 0,
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&:hover': { backgroundColor: 'transparent', color: 'text.primary' },
                }}
                aria-expanded={showFullReport}
                aria-controls="comps-full-report"
              >
                {showFullReport ? 'Hide detailed comps analysis' : 'View detailed comps analysis'}
              </Button>

              <Collapse in={showFullReport} unmountOnExit>
                <Box
                  id="comps-full-report"
                  sx={{
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    // Markdown styles within this section
                    '& h2, & h3': { fontSize: '0.85rem', fontWeight: 700, mt: 1.5, mb: 0.5 },
                    '& h4': { fontSize: '0.78rem', fontWeight: 700, mt: 1.25, mb: 0.25 },
                    '& p': { fontSize: '0.78rem', lineHeight: 1.65, color: 'text.secondary', mb: 0.75 },
                    '& li': { fontSize: '0.78rem', lineHeight: 1.65, color: 'text.secondary' },
                    '& strong': { color: 'text.primary', fontWeight: 700 },
                    '& table': { width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', mb: 1 },
                    '& th': {
                      textAlign: 'left',
                      p: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      color: 'text.disabled',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.65rem',
                    },
                    '& td': {
                      p: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      color: 'text.secondary',
                    },
                  }}
                  aria-label="Full comparable deals analysis"
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: ACCENT,
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      mb: 1,
                    }}
                  >
                    Full Comps Analysis Report
                  </Typography>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {text}
                  </ReactMarkdown>
                </Box>
              </Collapse>
            </Box>
          </>
        ) : (
          /* Fallback: the AI produced prose rather than a structured list */
          <>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'text.disabled',
                fontSize: '0.65rem',
                mb: 1.5,
                fontStyle: 'italic',
              }}
            >
              Comps presented as narrative analysis
            </Typography>
            <Box
              sx={{
                '& h2, & h3': { fontSize: '0.85rem', fontWeight: 700, mt: 1.25, mb: 0.5 },
                '& p': { fontSize: '0.78rem', lineHeight: 1.65, color: 'text.secondary', mb: 0.75 },
                '& li': { fontSize: '0.78rem', lineHeight: 1.65, color: 'text.secondary' },
                '& strong': { color: 'text.primary', fontWeight: 700 },
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {text}
              </ReactMarkdown>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(ComparableDealsPanel);
