import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// ============================================================
// LandingPage — public marketing surface (brand register).
//
// Editorial, typography-led, asymmetric. Sells the 8-stage
// pipeline by showing the deliverable rather than describing it.
// Shown at "/" for logged-out visitors. All CTAs route to /auth.
//
// Tokens are local to this file on purpose: the landing reads
// more editorial than the in-app MUI theme while staying tonally
// coherent (same near-black base, same emerald signal).
// ============================================================

const ink = '#0A0E17';
const inkRaised = '#11161F';
const inkLine = '#1E2530';
const paper = '#F4F6F8';
const paperDim = '#9BA6B4';
const paperFaint = '#5B6675';
const signal = '#10B981';

const display = '"Fraunces", Georgia, "Times New Roman", serif';
const mono = '"JetBrains Mono", ui-monospace, monospace';

// Reveal-on-mount: element is naturally visible (opacity 1), so if a
// visitor has reduced-motion enabled and the animation is suppressed,
// nothing stays hidden. fill-mode "both" holds the 0% frame until start.
const reveal = (delay = 0) => ({
  '@media (prefers-reduced-motion: no-preference)': {
    animation: 'landingRise 640ms cubic-bezier(0.16, 1, 0.3, 1) both',
    animationDelay: `${delay}ms`,
  },
  '@keyframes landingRise': {
    from: { opacity: 0, transform: 'translateY(14px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
});

const STAGES = [
  ['Company Research', 'Web research and structured data extraction'],
  ['Market Analysis', 'TAM / SAM / SOM with the trends that move them'],
  ['Financial Model', 'Five-year projections and unit economics'],
  ['Risk Assessment', 'Scored risks, each paired with a mitigation'],
  ['Comparable Deals', 'Recent rounds that price the opportunity'],
  ['Investor Memo', 'The thesis, written for an investment committee'],
  ['Investor Report', 'A formatted document you can forward'],
  ['Visual Summary', 'The whole story on a single one-pager'],
];

const DELIVERABLES = [
  ['Investor memo', 'The thesis, structured the way an IC expects to read it: what it is, why now, what could go wrong.'],
  ['Financial model', 'Revenue projections with the assumptions left visible, so you can argue with the numbers.'],
  ['Risk assessment', 'A single 1 to 10 score, decomposed into named risks and concrete mitigations.'],
  ['Comparable deals', 'The recent rounds that set the market, benchmarked against the company in front of you.'],
  ['Visual one-pager', 'An executive summary on one shareable page, for the partner who reads nothing longer.'],
];

// ── Small building blocks ─────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="span"
      sx={{
        fontFamily: mono,
        fontSize: '0.72rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: paperFaint,
      }}
    >
      {children}
    </Typography>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        py: 1,
        borderBottom: `1px solid ${inkLine}`,
        gap: 2,
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', color: paperDim }}>{label}</Typography>
      <Typography sx={{ fontFamily: mono, fontSize: '0.85rem', fontWeight: 500, color: paper, whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
    </Box>
  );
}

// ── The output specimen — a mock memo, the strongest selling point ────────────

function SpecimenCard() {
  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: inkRaised,
        border: `1px solid ${inkLine}`,
        borderRadius: '14px',
        p: { xs: 3, sm: 3.5 },
        boxShadow: '0 30px 60px -24px rgba(0,0,0,0.7)',
        ...reveal(180),
      }}
    >
      {/* Example label — this is an illustrative output, not a real deal */}
      <Typography sx={{ display: 'block', fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.2em', color: paperFaint, mb: 2 }}>
        EXAMPLE OUTPUT
      </Typography>

      {/* Header: company + recommendation */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontFamily: display, fontSize: '1.5rem', fontWeight: 600, color: paper, lineHeight: 1.1 }}>
            Northwind Robotics
          </Typography>
          <Typography sx={{ fontFamily: mono, fontSize: '0.68rem', letterSpacing: '0.14em', color: paperFaint, mt: 0.5 }}>
            SERIES A · INDUSTRIAL AI
          </Typography>
        </Box>
        <Box
          sx={{
            fontFamily: mono,
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: ink,
            backgroundColor: signal,
            px: 1.25,
            py: 0.5,
            borderRadius: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          STRONG BUY
        </Box>
      </Box>

      {/* Risk score band */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          mb: 2,
        }}
      >
        <Typography sx={{ fontFamily: mono, fontSize: '0.68rem', letterSpacing: '0.14em', color: paperFaint }}>
          RISK
        </Typography>
        <Typography sx={{ fontFamily: mono, fontSize: '1.05rem', fontWeight: 600, color: signal }}>
          3.2
        </Typography>
        <Typography sx={{ fontFamily: mono, fontSize: '0.8rem', color: paperFaint }}>/ 10</Typography>
      </Box>

      {/* Metric rows */}
      <Box sx={{ mb: 2.5 }}>
        <MetricRow label="Market (TAM)" value="$14.2B" />
        <MetricRow label="Net revenue retention" value="132%" />
        <MetricRow label="ARR growth, YoY" value="3.1x" />
        <MetricRow label="Suggested check" value="$2–4M" />
      </Box>

      {/* Thesis line */}
      <Typography sx={{ fontFamily: mono, fontSize: '0.66rem', letterSpacing: '0.16em', color: paperFaint, mb: 0.75 }}>
        THESIS
      </Typography>
      <Typography sx={{ fontSize: '0.9rem', color: paper, lineHeight: 1.55, mb: 2.5 }}>
        Defensible wedge in warehouse automation, with data network effects that
        compound as deployed fleets scale.
      </Typography>

      {/* Footer meta */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 2, borderTop: `1px solid ${inkLine}` }}>
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: signal,
            '@media (prefers-reduced-motion: no-preference)': {
              animation: 'specimenPulse 2.4s ease-in-out infinite',
            },
            '@keyframes specimenPulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.35 },
            },
          }}
        />
        <Typography sx={{ fontFamily: mono, fontSize: '0.68rem', color: paperFaint, letterSpacing: '0.06em' }}>
          8 / 8 stages · generated in 4m 12s
        </Typography>
      </Box>
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  const goRegister = () => navigate('/auth?mode=register');
  const goLogin = () => navigate('/auth');
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <Box
      sx={{
        backgroundColor: ink,
        color: paper,
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <Box
        component="header"
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2.5, md: 4 },
          py: 2.5,
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
              border: `1px solid ${signal}`,
              color: signal,
              fontFamily: mono,
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
            aria-hidden="true"
          >
            VC
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
            VC Intelligence
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            onClick={goLogin}
            sx={{
              color: paperDim,
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '0.875rem',
              '&:hover': { color: paper, backgroundColor: 'transparent' },
            }}
          >
            Sign in
          </Button>
          <Button
            onClick={goRegister}
            sx={{
              backgroundColor: signal,
              color: ink,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.875rem',
              px: 2,
              borderRadius: '8px',
              '&:hover': { backgroundColor: '#0FBF85' },
            }}
          >
            Start free
          </Button>
        </Box>
      </Box>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <Box
        component="section"
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2.5, md: 4 },
          pt: { xs: 5, md: 9 },
          pb: { xs: 7, md: 12 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
          gap: { xs: 5, md: 7 },
          alignItems: 'center',
        }}
      >
        {/* Left: headline */}
        <Box sx={reveal(0)}>
          <Box sx={{ mb: 2.5 }}>
            <Eyebrow>AI Investment Diligence</Eyebrow>
          </Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: display,
              fontWeight: 500,
              color: paper,
              fontSize: 'clamp(2.4rem, 5.4vw, 4.1rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              mb: 3,
            }}
          >
            Diligence that reads like your best analyst wrote it.
          </Typography>
          <Typography
            sx={{
              color: paperDim,
              fontSize: { xs: '1rem', md: '1.12rem' },
              lineHeight: 1.6,
              maxWidth: '40ch',
              mb: 4,
            }}
          >
            One company name in. A full investment package out: memo, financial
            model, risk score, comparable deals, and a one-page summary you can
            forward to the partnership.
          </Typography>

          {/* Hero input: type a company, land on sign-up. Conveys "name in". */}
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
              border: `1px solid ${inkLine}`,
              borderRadius: '12px',
              backgroundColor: inkRaised,
              mb: 2,
              transition: 'border-color 160ms ease',
              '&:focus-within': { borderColor: signal },
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
                color: paper,
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                '&::placeholder': { color: paperFaint },
              }}
            />
            <Button
              type="submit"
              endIcon={<ArrowForwardIcon />}
              sx={{
                backgroundColor: signal,
                color: ink,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.9rem',
                px: 2.25,
                py: 1,
                borderRadius: '9px',
                flexShrink: 0,
                '&:hover': { backgroundColor: '#0FBF85' },
              }}
            >
              Analyze
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Button
              onClick={() => scrollTo('pipeline')}
              sx={{
                color: paperDim,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.875rem',
                px: 0,
                minWidth: 0,
                '&:hover': { color: paper, backgroundColor: 'transparent' },
              }}
            >
              See the 8 stages
            </Button>
            <Typography sx={{ fontFamily: mono, fontSize: '0.72rem', letterSpacing: '0.04em', color: paperFaint }}>
              5 free credits · no card required
            </Typography>
          </Box>
        </Box>

        {/* Right: the output specimen */}
        <Box sx={{ position: 'relative' }}>
          {/* faint emerald wash behind the card, no blur on content */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: '-12% -8% -8% 6%',
              background: `radial-gradient(60% 60% at 70% 30%, ${signal}1f 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <SpecimenCard />
        </Box>
      </Box>

      {/* ── Pipeline: the eight stages as a numbered index ───────────── */}
      <Box
        component="section"
        id="pipeline"
        sx={{
          borderTop: `1px solid ${inkLine}`,
          borderBottom: `1px solid ${inkLine}`,
          backgroundColor: '#0B0F19',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2.5, md: 4 }, py: { xs: 6, md: 9 } }}>
          <Box sx={{ mb: { xs: 4, md: 5 }, maxWidth: '46ch' }}>
            <Box sx={{ mb: 2 }}>
              <Eyebrow>The pipeline</Eyebrow>
            </Box>
            <Typography
              sx={{
                fontFamily: display,
                fontWeight: 500,
                fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.015em',
                color: paper,
              }}
            >
              Eight specialised agents, run in sequence.
            </Typography>
          </Box>

          <Box
            component="ol"
            sx={{
              listStyle: 'none',
              m: 0,
              p: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: { sm: 6 },
            }}
          >
            {STAGES.map(([name, desc], i) => (
              <Box
                key={name}
                component="li"
                sx={{
                  display: 'flex',
                  gap: 2.5,
                  alignItems: 'baseline',
                  py: 2.25,
                  borderTop: `1px solid ${inkLine}`,
                }}
              >
                <Typography
                  sx={{ fontFamily: mono, fontSize: '0.85rem', color: signal, fontWeight: 500, minWidth: 28 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '1.02rem', color: paper, mb: 0.4 }}>
                    {name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: paperDim, lineHeight: 1.5 }}>
                    {desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Deliverables: differentiated rows, not a card grid ───────── */}
      <Box component="section" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2.5, md: 4 }, py: { xs: 6, md: 10 } }}>
        <Box sx={{ mb: { xs: 4, md: 6 }, maxWidth: '46ch' }}>
          <Box sx={{ mb: 2 }}>
            <Eyebrow>What lands on your desk</Eyebrow>
          </Box>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 500,
              fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)',
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
              color: paper,
            }}
          >
            Five deliverables, ready to circulate.
          </Typography>
        </Box>

        <Box>
          {DELIVERABLES.map(([title, body], i) => (
            <Box
              key={title}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '0.4fr 0.6fr' },
                gap: { xs: 1, md: 5 },
                py: { xs: 3, md: 3.5 },
                borderTop: `1px solid ${inkLine}`,
                ...(i === DELIVERABLES.length - 1 ? { borderBottom: `1px solid ${inkLine}` } : {}),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <Typography sx={{ fontFamily: mono, fontSize: '0.78rem', color: paperFaint }}>
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Typography
                  sx={{ fontFamily: display, fontWeight: 600, fontSize: '1.4rem', color: paper, lineHeight: 1.15 }}
                >
                  {title}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '1rem', color: paperDim, lineHeight: 1.6, maxWidth: '52ch' }}>
                {body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Closing CTA ──────────────────────────────────────────────── */}
      <Box
        component="section"
        sx={{
          backgroundColor: '#0B0F19',
          borderTop: `1px solid ${inkLine}`,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2.5, md: 4 },
            py: { xs: 7, md: 11 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 500,
              fontSize: 'clamp(1.9rem, 4vw, 3rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: paper,
              maxWidth: '18ch',
            }}
          >
            Run your first deal tonight.
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
            <Button
              onClick={goRegister}
              endIcon={<ArrowForwardIcon />}
              sx={{
                backgroundColor: signal,
                color: ink,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
                px: 3.5,
                py: 1.5,
                borderRadius: '10px',
                '&:hover': { backgroundColor: '#0FBF85', transform: 'translateY(-1px)' },
                transition: 'transform 160ms ease, background-color 160ms ease',
              }}
            >
              Create your account
            </Button>
            <Typography sx={{ fontFamily: mono, fontSize: '0.7rem', color: paperFaint, mt: 1.25, textAlign: { md: 'right' } }}>
              Full analysis 5 credits · Quick screen 1
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2.5, md: 4 }, py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography sx={{ fontFamily: mono, fontSize: '0.72rem', color: paperFaint, letterSpacing: '0.06em' }}>
            VC INTELLIGENCE
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: paperFaint }}>
            Claude-powered diligence · built for early-stage investors
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
