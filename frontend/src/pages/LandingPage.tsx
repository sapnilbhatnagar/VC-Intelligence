import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import { warmBackend } from '../api/client';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalculateIcon from '@mui/icons-material/Calculate';
import ShieldIcon from '@mui/icons-material/Shield';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DescriptionIcon from '@mui/icons-material/Description';
import ArticleIcon from '@mui/icons-material/Article';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

// ============================================================
// LandingPage — public marketing surface.
//
// Light, professional, product-led: a real specimen of the output
// is the hero, the eight stages read as small outcome tiles, and a
// single orange accent (#FA7000) marks every action. Rendered at "/"
// for logged-out visitors. All CTAs route to /auth.
// ============================================================

const ORANGE = '#0E0E52'; // navy (kept the local name to minimize churn)
const ORANGE_HOVER = '#1B1B73';
const INK = '#13211B';
const MUTED = '#566B60';
const CANVAS = '#E8F7EE';
const SURFACE = '#FFFFFF';
const BORDER = '#D2E9DB';
const BORDER_STRONG = '#BBDCC8';
const ON_BRAND = '#FFFFFF'; // text/icons that sit on a navy fill
const MONO = "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace";

const STAGES: Array<[React.ReactNode, string, string]> = [
  [<SearchIcon fontSize="small" />, 'Company research', 'Web research and structured data on the company'],
  [<TrendingUpIcon fontSize="small" />, 'Market analysis', 'TAM / SAM / SOM with the trends that move them'],
  [<CalculateIcon fontSize="small" />, 'Financial model', 'Five-year projections and unit economics'],
  [<ShieldIcon fontSize="small" />, 'Risk assessment', 'A scored risk read, each risk with a mitigation'],
  [<CompareArrowsIcon fontSize="small" />, 'Comparable deals', 'Recent rounds that price the opportunity'],
  [<DescriptionIcon fontSize="small" />, 'Investor memo', 'The thesis, written for an investment committee'],
  [<ArticleIcon fontSize="small" />, 'Investor report', 'A formatted document you can forward'],
  [<AutoGraphIcon fontSize="small" />, 'Visual summary', 'The whole story on a single one-pager'],
];

const DELIVERABLES: Array<[string, string]> = [
  ['Investment memo', 'The thesis, structured the way an IC expects to read it: what it is, why now, what could go wrong.'],
  ['Financial model', 'Revenue projections with the assumptions left visible, so you can argue with the numbers.'],
  ['Risk score', 'A single 1 to 10 score, decomposed into named risks and concrete mitigations.'],
  ['Comparable deals', 'The recent rounds that set the market, benchmarked against the company in front of you.'],
  ['One-page summary', 'An executive brief on one shareable page, for the partner who reads nothing longer.'],
];

// ── Output specimen — a mock memo card, the strongest selling point ──
function Specimen() {
  const row = (label: string, value: string) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        py: 1,
        gap: 2,
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <Typography sx={{ fontSize: '0.82rem', color: MUTED }}>{label}</Typography>
      <Typography sx={{ fontFamily: MONO, fontSize: '0.85rem', fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '16px',
        p: { xs: 2.5, sm: 3 },
        boxShadow: '0 24px 60px -28px rgba(28,26,23,0.30), 0 4px 14px rgba(28,26,23,0.06)',
      }}
    >
      <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.18em', color: '#9A9388', mb: 2 }}>
        EXAMPLE OUTPUT
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: INK, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            Northwind Robotics
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.66rem', letterSpacing: '0.1em', color: '#9A9388', mt: 0.5 }}>
            SERIES A · INDUSTRIAL AI
          </Typography>
        </Box>
        <Box
          sx={{
            fontFamily: MONO,
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#FFFFFF',
            backgroundColor: '#13603F',
            px: 1.25,
            py: 0.5,
            borderRadius: '7px',
            whiteSpace: 'nowrap',
          }}
        >
          STRONG BUY
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.66rem', letterSpacing: '0.1em', color: '#9A9388' }}>RISK</Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: '1.05rem', fontWeight: 700, color: '#1C7C54' }}>3.2</Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.8rem', color: '#9A9388' }}>/ 10</Typography>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        {row('Market (TAM)', '$14.2B')}
        {row('Net revenue retention', '132%')}
        {row('ARR growth, YoY', '3.1x')}
        {row('Suggested check', '$2–4M')}
      </Box>

      <Typography sx={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.12em', color: '#9A9388', mb: 0.75 }}>
        THESIS
      </Typography>
      <Typography sx={{ fontSize: '0.9rem', color: INK, lineHeight: 1.55, mb: 2.5 }}>
        Defensible wedge in warehouse automation, with data network effects that compound as deployed fleets scale.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 2, borderTop: `1px solid ${BORDER}` }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: ORANGE }} />
        <Typography sx={{ fontFamily: MONO, fontSize: '0.68rem', color: '#9A9388', letterSpacing: '0.04em' }}>
          8 / 8 stages · generated in 4m 12s
        </Typography>
      </Box>
    </Box>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  // Wake a possibly spun-down backend while the visitor reads the page, so a
  // later sign-in does not have to wait out a cold start.
  useEffect(() => {
    warmBackend();
  }, []);

  const goRegister = () => navigate('/auth?mode=register');
  const goLogin = () => navigate('/auth');
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const primaryBtn = {
    backgroundColor: ORANGE,
    color: ON_BRAND,
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '10px',
    boxShadow: 'none',
    '&:hover': { backgroundColor: ORANGE_HOVER, boxShadow: '0 6px 18px rgba(14,14,82,0.28)' },
  };

  return (
    <Box sx={{ backgroundColor: CANVAS, color: INK, minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {/* ── Top bar ── */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(232,247,238,0.82)',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <Box
          sx={{
            maxWidth: 1180,
            mx: 'auto',
            px: { xs: 2.5, md: 4 },
            py: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: ORANGE,
                color: ON_BRAND,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: '0.78rem',
              }}
              aria-hidden="true"
            >
              VC
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              VC Intelligence
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button onClick={goLogin} sx={{ color: MUTED, fontWeight: 600, textTransform: 'none', fontSize: '0.875rem', '&:hover': { color: INK, backgroundColor: 'transparent' } }}>
              Sign in
            </Button>
            <Button onClick={goRegister} sx={{ ...primaryBtn, px: 2, fontSize: '0.875rem' }}>
              Start free
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Hero ── */}
      <Box
        component="section"
        sx={{
          maxWidth: 1180,
          mx: 'auto',
          px: { xs: 2.5, md: 4 },
          pt: { xs: 6, md: 10 },
          pb: { xs: 7, md: 12 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
          gap: { xs: 5, md: 7 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.5,
              mb: 3,
              borderRadius: '999px',
              border: `1px solid ${BORDER_STRONG}`,
              backgroundColor: SURFACE,
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ORANGE }} />
            <Typography sx={{ fontFamily: MONO, fontSize: '0.7rem', letterSpacing: '0.08em', color: MUTED }}>
              AI INVESTMENT DILIGENCE
            </Typography>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontWeight: 700,
              color: INK,
              fontSize: 'clamp(2.3rem, 5vw, 3.6rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              mb: 2.5,
              textWrap: 'balance',
            }}
          >
            Diligence that reads like your best analyst wrote it.
          </Typography>

          <Typography sx={{ color: MUTED, fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.6, maxWidth: '42ch', mb: 3.5 }}>
            One company name in. A full investment package out: memo, financial model, risk score, comparable deals, and a
            one-page summary you can forward to the partnership.
          </Typography>

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              goRegister();
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 0.75,
              pl: 2,
              maxWidth: 480,
              border: `1px solid ${BORDER_STRONG}`,
              borderRadius: '12px',
              backgroundColor: SURFACE,
              mb: 2,
              transition: 'border-color 160ms ease, box-shadow 160ms ease',
              '&:focus-within': { borderColor: ORANGE, boxShadow: '0 0 0 3px rgba(14,14,82,0.12)' },
            }}
          >
            <Box
              component="input"
              placeholder="Company name or URL, e.g. northwind.ai"
              aria-label="Company name or URL"
              sx={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: INK,
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                '&::placeholder': { color: '#9A9388' },
              }}
            />
            <Button type="submit" endIcon={<ArrowForwardIcon />} sx={{ ...primaryBtn, px: 2.25, py: 1, fontSize: '0.9rem', flexShrink: 0 }}>
              Analyze
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Button onClick={() => scrollTo('pipeline')} sx={{ color: MUTED, fontWeight: 600, textTransform: 'none', fontSize: '0.875rem', px: 0, minWidth: 0, '&:hover': { color: INK, backgroundColor: 'transparent' } }}>
              See how it works
            </Button>
            <Typography sx={{ fontFamily: MONO, fontSize: '0.72rem', letterSpacing: '0.02em', color: '#9A9388' }}>
              5 free credits · no card required
            </Typography>
          </Box>
        </Box>

        {/* Right: specimen with a soft orange wash behind */}
        <Box sx={{ position: 'relative' }}>
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: '-14% -10% -6% 8%',
              background: 'radial-gradient(55% 55% at 70% 28%, rgba(14,14,82,0.14) 0%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />
          <Specimen />
        </Box>
      </Box>

      {/* ── Pipeline: eight stages as small outcome tiles ── */}
      <Box component="section" id="pipeline" sx={{ borderTop: `1px solid ${BORDER}`, backgroundColor: SURFACE }}>
        <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2.5, md: 4 }, py: { xs: 6, md: 9 } }}>
          <Box sx={{ maxWidth: '52ch', mb: { xs: 4, md: 5 } }}>
            <Typography sx={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: INK, mb: 1.5 }}>
              Eight specialised agents, run in sequence.
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: '1rem', lineHeight: 1.6 }}>
              Each stage produces one clearly defined output. Run the full pipeline, or just the stages you need.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 1.5,
            }}
          >
            {STAGES.map(([icon, name, outcome], i) => (
              <Box
                key={name}
                sx={{
                  position: 'relative',
                  p: 2,
                  borderRadius: '14px',
                  border: `1px solid ${BORDER}`,
                  backgroundColor: CANVAS,
                  transition: 'border-color 0.18s ease, transform 0.18s ease',
                  '&:hover': { borderColor: BORDER_STRONG, transform: 'translateY(-2px)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(14,14,82,0.10)',
                      color: ORANGE,
                    }}
                    aria-hidden="true"
                  >
                    {icon}
                  </Box>
                  <Typography sx={{ fontFamily: MONO, fontSize: '0.7rem', color: '#B7AFA2' }}>
                    {String(i + 1).padStart(2, '0')}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 650, fontSize: '0.95rem', color: INK, mb: 0.5 }}>{name}</Typography>
                <Typography sx={{ fontSize: '0.82rem', color: MUTED, lineHeight: 1.5 }}>{outcome}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Deliverables ── */}
      <Box component="section" sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2.5, md: 4 }, py: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
            gap: { xs: 4, md: 7 },
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: INK, mb: 1.5 }}>
              Five deliverables, ready to circulate.
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: '1rem', lineHeight: 1.6, mb: 1 }}>
              Everything an investment committee expects, generated in minutes and formatted to forward.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {DELIVERABLES.map(([title, body]) => (
              <Box
                key={title}
                sx={{
                  display: 'flex',
                  gap: 1.75,
                  p: 2,
                  borderRadius: '14px',
                  border: `1px solid ${BORDER}`,
                  backgroundColor: SURFACE,
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '8px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: ORANGE,
                    color: ON_BRAND,
                  }}
                  aria-hidden="true"
                >
                  <CheckIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 650, fontSize: '0.95rem', color: INK, mb: 0.25 }}>{title}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: MUTED, lineHeight: 1.55 }}>{body}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Closing CTA ── */}
      <Box component="section" sx={{ borderTop: `1px solid ${BORDER}`, backgroundColor: SURFACE }}>
        <Box
          sx={{
            maxWidth: 1180,
            mx: 'auto',
            px: { xs: 2.5, md: 4 },
            py: { xs: 7, md: 10 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          <Typography sx={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: INK, maxWidth: '18ch' }}>
            Run your first deal tonight.
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
            <Button onClick={goRegister} endIcon={<ArrowForwardIcon />} sx={{ ...primaryBtn, px: 3.5, py: 1.5, fontSize: '1rem' }}>
              Create your account
            </Button>
            <Typography sx={{ fontFamily: MONO, fontSize: '0.7rem', color: '#9A9388', mt: 1.25, textAlign: { md: 'right' } }}>
              Full analysis 5 credits · Quick screen 1
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Footer ── */}
      <Box component="footer" sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2.5, md: 4 }, py: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.72rem', color: '#9A9388', letterSpacing: '0.04em' }}>
            VC INTELLIGENCE
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#9A9388' }}>
            Claude-powered diligence, built for early-stage investors
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
