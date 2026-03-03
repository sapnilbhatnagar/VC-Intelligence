import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Box, Typography, Card, CardContent, Button, alpha, Divider, Collapse } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdComponents } from '../../../utils/markdownComponents';
import DataSourceTooltip from '../DataSourceTooltip';

// ============================================================
// Helpers
// ============================================================
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

/**
 * Priority 1: Extract the "Top 3 Deal-Killer Risks" section from structured output.
 * Priority 2: Extract **RiskName** — Severity: X | Likelihood: X% lines.
 * Priority 3: Extract generic bullet points / sentences.
 */
function extractRiskFactors(text: string, max = 6): string[] {
  // Strategy 1: "Top 3 Deal-Killer Risks:" numbered list
  const dealKillerMatch = text.match(
    /Top\s+\d+\s+Deal[- ]Killer\s+Risks?:?\s*\n([\s\S]{20,600}?)(?:\n##|\n\*\*Recommended|\n---|\n\n\n|$)/i,
  );
  if (dealKillerMatch) {
    const section = dealKillerMatch[1];
    const items = section
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^\d+[\.\)]/.test(l))
      .map((l) => l.replace(/^\d+[\.\)]\s*/, '').replace(/\*+/g, '').trim())
      .filter((l) => l.length > 15)
      .slice(0, max);
    if (items.length >= 2) return items;
  }

  // Strategy 2: **RiskName** — Severity: X | Likelihood: X% structured lines
  const structuredMatches: string[] = [];
  const structuredRe = /\*\*([^*\n]{5,60})\*\*\s*[—\-–]\s*Severity:\s*(\w+)\s*\|\s*Likelihood:\s*([^\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = structuredRe.exec(text)) !== null && structuredMatches.length < max) {
    structuredMatches.push(`${m[1].trim()}: ${m[2].trim()} severity, ${m[3].trim()} likelihood`);
  }
  if (structuredMatches.length >= 2) return structuredMatches;

  // Strategy 3: Numbered / bulleted list lines
  const bulletLines = text
    .split(/\n+/)
    .filter((l) => /^[-•*\d]+[\.\)]\s/.test(l.trim()) && l.trim().length > 20)
    .map((l) => l.replace(/^[-•*\d]+[\.\)]\s*/, '').replace(/\*+/g, '').trim())
    .filter((l) => l.length > 15)
    .slice(0, max);
  if (bulletLines.length >= 2) return bulletLines;

  // Strategy 4: Sentences
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 300)
    .slice(0, max);
}

// ============================================================
// SVG Donut Ring
// ============================================================
const RING_SIZE = 88;
const STROKE_WIDTH = 9;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DonutRingProps {
  score: number;
  color: string;
  label: string;
}

function DonutRing({ score, color, label }: DonutRingProps) {
  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const id = window.setTimeout(() => {
        const filled = CIRCUMFERENCE - (score / 10) * CIRCUMFERENCE;
        setDashOffset(filled);
      }, 120);
      return () => window.clearTimeout(id);
    }
  }, [score]);

  const center = RING_SIZE / 2;

  return (
    <Box
      sx={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}
      role="img"
      aria-label={`Risk score: ${score.toFixed(1)} out of 10 — ${label}`}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
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
            fontSize: '1.05rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            color,
            lineHeight: 1,
          }}
        >
          {score.toFixed(1)}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================================
// Risk category row — parsed from ## Section headers
// ============================================================
interface RiskCategory {
  name: string;
  overall: string | null;
}

function parseRiskCategories(text: string): RiskCategory[] {
  const categories: RiskCategory[] = [];
  const re = /###\s+\d+\.\s+(.+?)\s*(?:\[Overall:\s*([^\]]+)\])?(?=\n|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    categories.push({
      name: m[1].trim(),
      overall: m[2]?.trim() ?? null,
    });
  }
  return categories;
}

const SEVERITY_COLOR: Record<string, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#EF4444',
  Critical: '#7F1D1D',
};

// ============================================================
// Props
// ============================================================
interface RiskAssessmentPanelProps {
  text: string;
  riskScore: number;
}

// ============================================================
// Component
// ============================================================
function RiskAssessmentPanel({ text, riskScore }: RiskAssessmentPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullExpanded, setFullExpanded] = useState(false);

  const riskColor = getRiskColor(riskScore);
  const riskLabel = getRiskLabel(riskScore);

  const bullets = useMemo(() => extractRiskFactors(text, 6), [text]);
  const categories = useMemo(() => parseRiskCategories(text), [text]);
  const rationaleText = useMemo(() => {
    const m = text.match(/\*\*Rationale:\*\*\s*([^\n]{30,400})/i);
    return m ? m[1].trim() : null;
  }, [text]);

  const visibleBullets = expanded ? bullets : bullets.slice(0, 3);
  const hiddenCount = bullets.length - 3;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: 'divider',
        backgroundColor: alpha('#ffffff', 0.03),
      }}
      role="region"
      aria-label="Risk assessment"
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
          <ShieldIcon fontSize="small" sx={{ color: riskColor }} aria-hidden="true" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
            Risk Assessment
          </Typography>
          <DataSourceTooltip
            stageName="Conduct Risk Assessment"
            stageNumber={4}
            description="Risk factors and composite score from the AI risk assessment stage, evaluating market, financial, regulatory, execution, and technology risks."
          />
        </Box>

        {/* Donut + summary */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2.5 }}>
          <DonutRing score={riskScore} color={riskColor} label={riskLabel} />

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: riskColor, lineHeight: 1.2, fontSize: '1rem' }}
            >
              {riskLabel}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
              Score: {riskScore.toFixed(1)} / 10
            </Typography>

            {/* Severity band indicator */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }} aria-hidden="true">
              {['Low', 'Med', 'High'].map((band) => {
                const active =
                  (band === 'Low' && riskScore <= 3) ||
                  (band === 'Med' && riskScore > 3 && riskScore <= 6) ||
                  (band === 'High' && riskScore > 6);
                const bandColor = band === 'Low' ? '#10B981' : band === 'Med' ? '#F59E0B' : '#EF4444';
                return (
                  <Box
                    key={band}
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 0.75,
                      backgroundColor: active ? alpha(bandColor, 0.15) : alpha('#ffffff', 0.04),
                      border: '1px solid',
                      borderColor: active ? bandColor : 'transparent',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.58rem',
                        fontWeight: active ? 700 : 400,
                        color: active ? bandColor : 'text.disabled',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {band}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* Risk categories row (from structured LLM output) */}
        {categories.length > 0 && (
          <>
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: '0.62rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                mb: 0.75,
              }}
            >
              Risk Categories
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {categories.map((cat, i) => {
                const catColor = cat.overall ? (SEVERITY_COLOR[cat.overall] ?? riskColor) : riskColor;
                return (
                  <Box
                    key={i}
                    sx={{
                      px: 0.75,
                      py: 0.3,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: alpha(catColor, 0.35),
                      backgroundColor: alpha(catColor, 0.07),
                    }}
                  >
                    <Typography
                      sx={{ fontSize: '0.62rem', fontWeight: 600, color: catColor }}
                    >
                      {cat.name}
                      {cat.overall && (
                        <Box component="span" sx={{ opacity: 0.75, ml: 0.4 }}>
                          · {cat.overall}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </>
        )}

        {/* Deal-killer / key risk factors */}
        {bullets.length > 0 && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <WarningAmberIcon sx={{ fontSize: 13, color: riskColor }} aria-hidden="true" />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                  fontSize: '0.62rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Key Risk Factors
              </Typography>
            </Box>

            <Box
              component="ul"
              sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.75 }}
              aria-label="Key risk factors"
            >
              {visibleBullets.map((bullet, i) => (
                <Box
                  key={i}
                  component="li"
                  sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: riskColor,
                      flexShrink: 0,
                      mt: '5px',
                      opacity: 0.7,
                    }}
                    aria-hidden="true"
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.73rem' }}
                  >
                    {bullet}
                  </Typography>
                </Box>
              ))}
            </Box>

            {bullets.length > 3 && (
              <Button
                size="small"
                onClick={() => setExpanded((v) => !v)}
                sx={{
                  mt: 1,
                  fontSize: '0.68rem',
                  p: 0,
                  minWidth: 0,
                  textTransform: 'none',
                  color: riskColor,
                  '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
                }}
                aria-expanded={expanded}
              >
                {expanded ? 'Show fewer factors' : `Show ${hiddenCount} more factor${hiddenCount > 1 ? 's' : ''}`}
              </Button>
            )}
          </>
        )}

        {/* Rationale paragraph (from Summary Assessment section) */}
        {rationaleText && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.25,
              borderRadius: 1.5,
              backgroundColor: alpha(riskColor, 0.05),
              border: '1px solid',
              borderColor: alpha(riskColor, 0.15),
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {`*${rationaleText}*`}
            </ReactMarkdown>
          </Box>
        )}

        {/* View Full Assessment — expandable */}
        <Box sx={{ mt: 1.5 }}>
          <Button
            size="small"
            onClick={() => setFullExpanded((v) => !v)}
            endIcon={fullExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            sx={{
              p: 0,
              minWidth: 0,
              fontSize: '0.7rem',
              textTransform: 'none',
              color: riskColor,
              '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
            }}
            aria-expanded={fullExpanded}
          >
            {fullExpanded ? 'Hide full assessment' : 'View full assessment'}
          </Button>
          <Collapse in={fullExpanded} unmountOnExit>
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: alpha('#ffffff', 0.02),
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {text}
              </ReactMarkdown>
            </Box>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
}

export default memo(RiskAssessmentPanel);
