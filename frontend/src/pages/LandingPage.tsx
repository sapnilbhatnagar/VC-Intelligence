import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, Chip, Container, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { warmBackend } from '../api/client';
import AuthDialog, { type AuthMode } from '../components/auth/AuthDialog';
import BrandMark from '../components/brand/BrandMark';
import { TOKENS, MONO, CHART_COLORS, RECOMMENDATION_COLORS } from '../theme';

// ============================================================
// Landing page — the public face of the diligence desk, with the
// sign-in window opening as a dialog on this same page.
//
// Brand register: one committed ink band for the pipeline, white
// hero showing the deliverable itself (memo specimen with verdict,
// risk dial, and scenario chart), audience ledger, credit terms.
// ============================================================

const INK = '#10151C'; // pipeline band background (deeper than text ink)
const INK_LINE = 'rgba(255,255,255,0.14)';
const INK_DIM = 'rgba(255,255,255,0.64)';

interface StageEntry {
  n: string;
  name: string;
  engine: string;
  outcome: string;
}

const STAGES: StageEntry[] = [
  { n: '01', name: 'Company research', engine: 'Haiku + web search', outcome: 'Founders, product, funding history, traction signals' },
  { n: '02', name: 'Market analysis', engine: 'Haiku + web search', outcome: 'TAM and SAM with sources, competitors, timing' },
  { n: '03', name: 'Financial model', engine: 'Sonnet', outcome: 'Five-year bear, base, and bull revenue scenarios' },
  { n: '04', name: 'Risk assessment', engine: 'Sonnet + extended thinking', outcome: 'Five risk categories, scored 1 to 10, deal-killers named' },
  { n: '05', name: 'Comparable deals', engine: 'Haiku + web search', outcome: 'Recent rounds, acquisitions, entry multiples' },
  { n: '06', name: 'Investor memo', engine: 'Sonnet + extended thinking', outcome: 'Verdict, thesis, suggested terms, next steps' },
  { n: '07', name: 'Investor report', engine: 'Template engine', outcome: 'Formatted, printable investment document' },
  { n: '08', name: 'Visual summary', engine: 'Haiku + chart engine', outcome: 'One-page executive infographic' },
];

// ============================================================
// Specimen: five-year scenario chart (pure SVG, brand chart colors)
// ============================================================
function ScenarioChartSVG() {
  // Hand-tuned paths over a 280x132 plot: bear flattens, base compounds,
  // bull accelerates. Y is inverted (SVG origin top-left).
  return (
    <svg viewBox="0 0 280 132" width="100%" role="img" aria-label="Five-year revenue projection: bear, base, and bull scenarios">
      {[18, 48, 78, 108].map((y) => (
        <line key={y} x1="0" x2="280" y1={y} y2={y} stroke={CHART_COLORS.grid} strokeWidth="1" />
      ))}
      <path
        d="M8 112 C 90 106, 180 78, 272 26 L 272 66 C 180 96, 90 112, 8 116 Z"
        fill={CHART_COLORS.band}
      />
      <path d="M8 114 C 100 110, 190 100, 272 88" fill="none" stroke={CHART_COLORS.bear} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 113 C 100 106, 190 80, 272 44" fill="none" stroke={CHART_COLORS.base} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 112 C 100 102, 190 60, 272 12" fill="none" stroke={CHART_COLORS.bull} strokeWidth="2" strokeLinecap="round" />
      <circle cx="272" cy="88" r="3" fill={CHART_COLORS.bear} />
      <circle cx="272" cy="44" r="3.5" fill={CHART_COLORS.base} />
      <circle cx="272" cy="12" r="3" fill={CHART_COLORS.bull} />
    </svg>
  );
}

// ============================================================
// Specimen: risk dial (arc gauge)
// ============================================================
function RiskDialSVG({ score }: { score: number }) {
  // Semi-circular gauge, 0–10. The needle position maps the score.
  const angle = Math.PI * (1 - score / 10);
  const r = 34;
  const cx = 42;
  const cy = 44;
  const nx = cx + r * 0.72 * Math.cos(angle);
  const ny = cy - r * 0.72 * Math.sin(angle);
  return (
    <svg viewBox="0 0 84 52" width="84" role="img" aria-label={`Risk score ${score} out of 10`}>
      <path d="M8 44 A34 34 0 0 1 30.5 12" fill="none" stroke={TOKENS.success} strokeWidth="6" strokeLinecap="round" />
      <path d="M34 10.8 A34 34 0 0 1 53.5 12" fill="none" stroke="#B7791F" strokeWidth="6" strokeLinecap="round" />
      <path d="M57 14.5 A34 34 0 0 1 76 44" fill="none" stroke={TOKENS.error} strokeWidth="6" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={TOKENS.textPrimary} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3.5" fill={TOKENS.textPrimary} />
    </svg>
  );
}

// ============================================================
// Hero specimen — the memo itself, as the imagery
// ============================================================
function MemoSpecimen() {
  const verdict = RECOMMENDATION_COLORS['BUY'];
  return (
    <Box sx={{ position: 'relative', maxWidth: 460, mx: 'auto', width: '100%' }}>
      {/* one-pager peeking from behind */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          transform: 'rotate(2.5deg) translate(14px, 10px)',
          borderRadius: '16px',
          border: `1px solid ${TOKENS.border}`,
          backgroundColor: TOKENS.surfaceAlt,
          boxShadow: '0 10px 30px rgba(22,27,34,0.08)',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          borderRadius: '16px',
          border: `1px solid ${TOKENS.border}`,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 24px 64px rgba(22,27,34,0.14), 0 4px 14px rgba(22,27,34,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* document header */}
        <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${TOKENS.border}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.1em', color: 'text.disabled', mb: 0.25 }}>
              INVESTMENT COMMITTEE MEMO
            </Typography>
            <Typography sx={{ fontWeight: 750, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              Northbeam Robotics
            </Typography>
          </Box>
          <Chip label="BUY" size="small" sx={{ backgroundColor: verdict.bg, color: verdict.text, fontWeight: 700, fontSize: '0.7rem' }} />
        </Box>

        {/* metrics row */}
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 3, borderBottom: `1px solid ${TOKENS.border}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RiskDialSVG score={4.2} />
            <Box>
              <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.05rem', lineHeight: 1 }}>4.2</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Risk / 10</Typography>
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.05rem', lineHeight: 1 }}>$2.1M</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Est. ARR</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.05rem', lineHeight: 1 }}>6.4x</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Base MOIC</Typography>
          </Box>
        </Box>

        {/* scenario chart */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 650, color: 'text.primary' }}>Revenue scenarios, 5 years</Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {([['Bear', CHART_COLORS.bear], ['Base', CHART_COLORS.base], ['Bull', CHART_COLORS.bull]] as const).map(([label, c]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 2.5, borderRadius: 2, backgroundColor: c }} />
                  <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <ScenarioChartSVG />
        </Box>

        {/* memo excerpt */}
        <Box sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
          <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'text.secondary' }}>
            Vertical robotics for mid-market warehouses; founders shipped two prior
            logistics products. Pipeline coverage 3.1x, NRR 124 percent [ESTIMATED].
            Primary concern: incumbent pricing response within 18 months.
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.08em', color: 'text.disabled', mt: 1.5 }}>
            STAGE 6 OF 8 - MEMO WRITER - SPECIMEN OUTPUT
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ============================================================
// Deliverable preview SVGs (one per output, deliberately distinct)
// ============================================================
function AnalyticsPreviewSVG() {
  return (
    <svg viewBox="0 0 120 84" width="100%" role="img" aria-label="Analytics dashboard preview">
      <rect x="1" y="1" width="118" height="82" rx="8" fill="#FFFFFF" stroke={TOKENS.border} />
      {[20, 34, 48].map((y, i) => (
        <rect key={y} x="10" y={y} width={[64, 84, 48][i]} height="7" rx="3.5" fill={[CHART_COLORS.bull, CHART_COLORS.base, CHART_COLORS.bear][i]} opacity="0.85" />
      ))}
      <circle cx="96" cy="30" r="14" fill="none" stroke={TOKENS.border} strokeWidth="6" />
      <path d="M96 16 A14 14 0 0 1 109 35" fill="none" stroke={CHART_COLORS.base} strokeWidth="6" />
      <rect x="10" y="64" width="100" height="5" rx="2.5" fill={TOKENS.canvasSubtle} />
    </svg>
  );
}

function ReportPreviewSVG() {
  return (
    <svg viewBox="0 0 120 84" width="100%" role="img" aria-label="Investor report preview">
      <rect x="24" y="2" width="72" height="80" rx="6" fill="#FFFFFF" stroke={TOKENS.border} />
      <rect x="32" y="12" width="40" height="6" rx="3" fill={TOKENS.textPrimary} opacity="0.85" />
      <rect x="32" y="24" width="56" height="3.5" rx="1.75" fill={TOKENS.textDisabled} opacity="0.6" />
      <rect x="32" y="31" width="50" height="3.5" rx="1.75" fill={TOKENS.textDisabled} opacity="0.6" />
      <rect x="32" y="38" width="54" height="3.5" rx="1.75" fill={TOKENS.textDisabled} opacity="0.6" />
      <rect x="32" y="50" width="24" height="8" rx="4" fill={RECOMMENDATION_COLORS['BUY'].bg} />
      <rect x="32" y="64" width="56" height="3.5" rx="1.75" fill={TOKENS.textDisabled} opacity="0.6" />
      <rect x="32" y="71" width="44" height="3.5" rx="1.75" fill={TOKENS.textDisabled} opacity="0.6" />
    </svg>
  );
}

function OnePagerPreviewSVG() {
  return (
    <svg viewBox="0 0 120 84" width="100%" role="img" aria-label="Visual one-pager preview">
      <rect x="1" y="1" width="118" height="82" rx="8" fill={INK} />
      <rect x="10" y="10" width="46" height="7" rx="3.5" fill="#FFFFFF" opacity="0.9" />
      <rect x="10" y="24" width="48" height="24" rx="5" fill="rgba(255,255,255,0.12)" />
      <rect x="62" y="24" width="48" height="24" rx="5" fill="rgba(255,255,255,0.12)" />
      {[16, 26, 36].map((h, i) => (
        <rect key={h} x={16 + i * 14} y={68 - h} width="8" height={h} rx="2" fill={[CHART_COLORS.bear, '#B7791F', CHART_COLORS.bull][i]} />
      ))}
      <rect x="62" y="56" width="48" height="14" rx="5" fill={CHART_COLORS.base} />
    </svg>
  );
}

// ============================================================
// Page
// ============================================================
export default function LandingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const authParam = searchParams.get('auth');
  const [authOpen, setAuthOpen] = useState(authParam === 'signin' || authParam === 'register');
  const [authMode, setAuthMode] = useState<AuthMode>(authParam === 'register' ? 'register' : 'signin');

  // Warm a possibly spun-down backend while the visitor reads.
  useEffect(() => {
    warmBackend();
  }, []);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    if (authParam) setSearchParams({}, { replace: true });
  };

  return (
    <Box sx={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      {/* ── Top nav ─────────────────────────────────────────── */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.86)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${TOKENS.border}`,
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
          <BrandMark size={30} />
          <Typography sx={{ fontWeight: 750, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
            VC Intelligence
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button variant="text" onClick={() => openAuth('signin')} sx={{ color: 'text.primary', fontSize: '0.85rem' }}>
            Sign in
          </Button>
          <Button variant="contained" onClick={() => openAuth('register')} sx={{ fontSize: '0.85rem', display: { xs: 'none', sm: 'inline-flex' } }}>
            Create free account
          </Button>
        </Container>
      </Box>

      {/* ── Hero ────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ pt: { xs: 7, md: 11 }, pb: { xs: 8, md: 12 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
            gap: { xs: 6, md: 8 },
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: 'clamp(2.2rem, 4.6vw, 3.6rem)',
                lineHeight: 1.04,
                letterSpacing: '-0.03em',
                textWrap: 'balance',
                mb: 3,
              }}
            >
              A company name in.
              <br />
              An IC-ready memo out.
            </Typography>
            <Typography sx={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'text.secondary', maxWidth: '52ch', mb: 4 }}>
              Eight specialist AI agents run in sequence: research, market sizing,
              a five-year financial model, scored risk, comparable deals, and a
              memo your committee can argue with. The diligence week, in minutes.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => openAuth('register')}
                sx={{ px: 3, py: 1.4 }}
              >
                Create free account
              </Button>
              <Button variant="outlined" size="large" onClick={() => openAuth('signin')} sx={{ px: 3, py: 1.4 }}>
                Sign in
              </Button>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.disabled' }}>
              5 free credits on sign-up. No card required.
            </Typography>
          </Box>

          <MemoSpecimen />
        </Box>
      </Container>

      {/* ── Pipeline band ───────────────────────────────────── */}
      <Box sx={{ backgroundColor: INK, color: '#FFFFFF', py: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' },
              gap: { xs: 5, md: 10 },
              alignItems: 'start',
            }}
          >
            <Box sx={{ position: { md: 'sticky' }, top: { md: 96 } }}>
              <Typography
                component="h2"
                sx={{ fontWeight: 750, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', letterSpacing: '-0.025em', lineHeight: 1.12, mb: 2.5, textWrap: 'balance' }}
              >
                Eight agents, in sequence. Each hands its findings to the next.
              </Typography>
              <Typography sx={{ color: INK_DIM, lineHeight: 1.65, fontSize: '0.95rem', maxWidth: '46ch' }}>
                Fast research agents gather the record. Reasoning agents with
                extended thinking model the financials, score the risk, and write
                the memo. You watch every stage run, pause it, or resume it.
              </Typography>
              <Box sx={{ mt: 3.5, display: 'flex', gap: 3 }}>
                <Box>
                  <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.3rem' }}>5&ndash;15</Typography>
                  <Typography variant="caption" sx={{ color: INK_DIM }}>minutes, full run</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.3rem' }}>3</Typography>
                  <Typography variant="caption" sx={{ color: INK_DIM }}>documents delivered</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.3rem' }}>1&ndash;5</Typography>
                  <Typography variant="caption" sx={{ color: INK_DIM }}>credits per company</Typography>
                </Box>
              </Box>
            </Box>

            {/* vertical agent rail */}
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, position: 'relative' }}>
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  left: 11,
                  top: 14,
                  bottom: 14,
                  width: '2px',
                  background: `linear-gradient(to bottom, ${TOKENS.brandHover}, ${INK_LINE})`,
                }}
              />
              {STAGES.map((stage, i) => (
                <Box
                  component="li"
                  key={stage.n}
                  sx={{
                    position: 'relative',
                    pl: 5.5,
                    pb: i === STAGES.length - 1 ? 0 : 3.25,
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      position: 'absolute',
                      left: 4,
                      top: 6,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: `2px solid ${TOKENS.brandHover}`,
                      backgroundColor: INK,
                      ...(i === 0 && {
                        '@media (prefers-reduced-motion: no-preference)': {
                          animation: 'nodePulse 2.4s ease-in-out infinite',
                          '@keyframes nodePulse': {
                            '0%, 100%': { boxShadow: '0 0 0 0 rgba(37,99,235,0.45)' },
                            '50%': { boxShadow: '0 0 0 7px rgba(37,99,235,0)' },
                          },
                        },
                      }),
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.7rem', color: TOKENS.brandHover, fontWeight: 600 }}>
                      {stage.n}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                      {stage.name}
                    </Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.06em', color: INK_DIM, border: `1px solid ${INK_LINE}`, borderRadius: '6px', px: 0.75, py: 0.2 }}>
                      {stage.engine}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: INK_DIM, fontSize: '0.85rem', lineHeight: 1.55, maxWidth: '52ch' }}>
                    {stage.outcome}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── Deliverables ────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 11 } }}>
        <Typography
          component="h2"
          sx={{ fontWeight: 750, fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)', letterSpacing: '-0.022em', mb: 1.5, textWrap: 'balance' }}
        >
          What lands on your desk
        </Typography>
        <Typography sx={{ color: 'text.secondary', maxWidth: '60ch', mb: 5, lineHeight: 1.6 }}>
          Every run produces working documents, not a chat transcript. Each one
          marks what is confirmed, what is estimated, and what is unknown.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {[
            {
              svg: <AnalyticsPreviewSVG />,
              name: 'Live analytics',
              text: 'Financial projections, risk breakdown, investment highlights, and comparable deals as interactive panels, with the data source of every figure on hover.',
            },
            {
              svg: <ReportPreviewSVG />,
              name: 'Investor report',
              text: 'The full investment document, formatted and printable: thesis, market, model, risks, comps, recommendation, and suggested terms.',
            },
            {
              svg: <OnePagerPreviewSVG />,
              name: 'Visual one-pager',
              text: 'An executive summary infographic for the partner meeting: verdict, key metrics, and scenario chart on a single page.',
            },
          ].map((item, i) => (
            <Box
              key={item.name}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '88px 1fr', sm: '140px 1fr' },
                gap: { xs: 2.5, sm: 4 },
                alignItems: 'center',
                py: 3.5,
                borderTop: `1px solid ${TOKENS.border}`,
                ...(i === 2 && { borderBottom: `1px solid ${TOKENS.border}` }),
              }}
            >
              <Box sx={{ maxWidth: 140 }}>{item.svg}</Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 0.5, letterSpacing: '-0.01em' }}>
                  {item.name}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '64ch' }}>
                  {item.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>

      {/* ── Audience ledger ─────────────────────────────────── */}
      <Box sx={{ backgroundColor: TOKENS.canvas, borderTop: `1px solid ${TOKENS.border}`, borderBottom: `1px solid ${TOKENS.border}`, py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            component="h2"
            sx={{ fontWeight: 750, fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)', letterSpacing: '-0.022em', mb: 5, textWrap: 'balance' }}
          >
            Built for small teams with large mandates
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 4, md: 6 } }}>
            {[
              {
                who: 'Micro VC funds',
                line: 'Screen the whole inbound pile, not a sample.',
                detail: 'Quick-screen a deal for one credit before the first call; run the full eight stages only on the ones that survive.',
              },
              {
                who: 'Private equity',
                line: 'Pre-LOI triage with a paper trail.',
                detail: 'Scored risk categories, revenue scenarios, and comparable transactions you can hand to the deal team as a starting file.',
              },
              {
                who: 'Strategic buyers',
                line: 'Know a target before the banker calls.',
                detail: 'Track competitors and acquisition candidates: who funds them, how they are priced, and what a fair entry multiple looks like.',
              },
            ].map((a) => (
              <Box key={a.who}>
                <Typography sx={{ fontWeight: 750, fontSize: '1rem', mb: 1, letterSpacing: '-0.01em' }}>
                  {a.who}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'text.primary', mb: 1, lineHeight: 1.5 }}>
                  {a.line}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {a.detail}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── Terms / closing ─────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
            gap: 4,
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography component="h2" sx={{ fontWeight: 750, fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', letterSpacing: '-0.022em', mb: 2 }}>
              Priced per company, not per seat
            </Typography>
            <Box component="dl" sx={{ m: 0, display: 'flex', flexDirection: 'column', maxWidth: 560 }}>
              {[
                ['Quick screen', '1 credit', 'research, market, memo'],
                ['Full analysis', '5 credits', 'all eight stages, all three documents'],
                ['Your own API key', 'unlimited', 'self-billed runs, key encrypted at rest'],
              ].map(([term, price, note]) => (
                <Box key={term} sx={{ display: 'flex', alignItems: 'baseline', gap: 2, py: 1.25, borderBottom: `1px solid ${TOKENS.border}` }}>
                  <Typography component="dt" sx={{ fontWeight: 650, fontSize: '0.9rem', minWidth: 132 }}>{term}</Typography>
                  <Typography component="dd" sx={{ m: 0, fontFamily: MONO, fontSize: '0.82rem', fontWeight: 600, color: TOKENS.brandText, minWidth: 84 }}>{price}</Typography>
                  <Typography component="dd" sx={{ m: 0, color: 'text.secondary', fontSize: '0.82rem' }}>{note}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => openAuth('register')}
            sx={{ px: 4, py: 1.6, fontSize: '0.95rem', justifySelf: { xs: 'start', md: 'end' } }}
          >
            Create free account
          </Button>
        </Box>
      </Container>

      {/* ── Footer ──────────────────────────────────────────── */}
      <Box component="footer" sx={{ borderTop: `1px solid ${TOKENS.border}`, py: 4 }}>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <BrandMark size={22} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            VC Intelligence
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            AI-assisted research. Verify material findings before investing.
          </Typography>
        </Container>
      </Box>

      {/* ── The sign-in window, on this same page ───────────── */}
      <AuthDialog open={authOpen} mode={authMode} onClose={closeAuth} />
    </Box>
  );
}
