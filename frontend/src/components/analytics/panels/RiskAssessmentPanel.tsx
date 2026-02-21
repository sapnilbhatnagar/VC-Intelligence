import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, Card, CardContent, Button, alpha } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';

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
 * Pull bullet-point risk factors from text.
 * Prefers explicit list lines; falls back to sentences.
 */
function extractBullets(text: string, max = 6): string[] {
  const bulletLines = text
    .split(/\n+/)
    .filter((l) => /^[-•*\d]+[\.\)]\s/.test(l.trim()) && l.trim().length > 20)
    .map((l) => l.replace(/^[-•*\d]+[\.\)]\s*/, '').trim())
    .slice(0, max);

  if (bulletLines.length >= 2) return bulletLines;

  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 300)
    .slice(0, max);
}

// ============================================================
// SVG Donut Ring
// ============================================================
const RING_SIZE = 88;           // outer diameter
const STROKE_WIDTH = 9;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DonutRingProps {
  score: number;         // 0–10
  color: string;
  label: string;
}

function DonutRing({ score, color, label }: DonutRingProps) {
  // Animate the stroke-dashoffset from 0 to the correct fill on mount
  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // Short delay so the browser registers the initial state before transitioning
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
        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE_WIDTH}
        />

        {/* Filled arc — rotated so it starts at the top (12 o'clock) */}
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

      {/* Score label centered inside the ring */}
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
// Props
// ============================================================
interface RiskAssessmentPanelProps {
  text: string;
  riskScore: number;
}

// ============================================================
// Component
// ============================================================
export default function RiskAssessmentPanel({ text, riskScore }: RiskAssessmentPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const riskColor = getRiskColor(riskScore);
  const riskLabel = getRiskLabel(riskScore);
  const bullets = useMemo(() => extractBullets(text, 6), [text]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ShieldIcon fontSize="small" sx={{ color: riskColor }} aria-hidden="true" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Risk Assessment
          </Typography>
        </Box>

        {/* Donut + summary */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2.5 }}>
          <DonutRing score={riskScore} color={riskColor} label={riskLabel} />

          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: riskColor,
                lineHeight: 1.2,
                fontSize: '1rem',
              }}
            >
              {riskLabel}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
              Score: {riskScore.toFixed(1)} / 10
            </Typography>

            {/* Severity band indicator */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                mt: 1,
              }}
              aria-hidden="true"
            >
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

        {/* Risk factor bullets */}
        {bullets.length > 0 && (
          <>
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: '0.62rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                mb: 1,
              }}
            >
              Risk Factors
            </Typography>

            <Box
              component="ul"
              sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.75 }}
              aria-label="Risk factors"
            >
              {visibleBullets.map((bullet, i) => (
                <Box
                  key={i}
                  component="li"
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Colored dot */}
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
                aria-controls="risk-factors-list"
              >
                {expanded ? 'Show fewer factors' : `Show ${hiddenCount} more factor${hiddenCount > 1 ? 's' : ''}`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
