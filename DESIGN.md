# DESIGN.md

One light theme, used everywhere. The MUI source of truth is
`frontend/src/theme.ts` (tokens, recommendation/risk/chart helpers, component
overrides). The landing page and the auth brand panel reuse the same palette
with a few local constants so they read as one product.

## Strategy

Restrained. Warm-neutral "paper" surfaces, graphite ink, one orange accent kept
under ~10% of any viewport. Apple-style tiles: white surface, 1px hairline
border, soft low-spread shadow, generous radius (12–14px). Never pure #000/#fff.

## Color

Brand (the single accent):
- brand:        #FA7000  (orange — primary actions, active state, brand mark, focus)
- brand-hover:  #FF8A2E  (lift on hover)
- brand-text:   #B5530E  (AA-safe orange for links / inline emphasis on light)
- on-brand:     #1C1A17  (ink that sits on an orange fill, ≥6:1)

Warm neutral surfaces:
- canvas (app bg):   #F7F6F2
- surface (tiles):   #FFFFFF
- surface-alt:       #FBFAF7  (second neutral layer: sidebars, toolbars)
- border:            #EBE7DF  (hairline)
- border-strong:     #DBD5C9  (inputs, stronger dividers)

Graphite ink:
- text-primary:   #1C1A17
- text-secondary: #6B645B   (≥4.5:1 on white)
- text-disabled:  #A39B90   (decorative / non-essential only)

Semantic data vocabulary (verdicts, risk, status — NOT the brand):
- success / BUY:  #2E7D5B
- caution / HOLD: #B7791F
- danger / PASS:  #C0413E
- info (neutral): #566270  (deliberately not blue)

Recommendation chips ship as accessible bg + text pairs (see RECOMMENDATION_COLORS;
all ≥4.5:1). Risk score maps to success/caution/danger via riskColor(); financial
scenarios use CHART_COLORS (bear red / base deep-orange / bull green, no blue).

## Typography

- UI + display: "Geist", falling back to "Inter", system-ui. One family carries
  headings, labels, body, and buttons (product register: one well-tuned sans).
  No serif display face.
- Data / figures: "Geist Mono", falling back to "JetBrains Mono". Risk score,
  ARR, credits, stage indices, eyebrows.
- Fixed rem scale (not fluid in-app); landing headings use clamp(). Tight
  grotesk tracking on headings (-0.02em). Body capped ~65–75ch.

## Layout

- App shell: top bar + left sidebar nav, content on the warm canvas with white
  tiles. Responsive behavior is structural (collapsing sidebar, wrapping grids),
  not fluid type.
- Research outputs are small, self-contained tiles, each with one clearly
  defined outcome.
- Landing: asymmetric hero with a product specimen as the imagery; the 8 stages
  render as a responsive grid of small outcome tiles (auto-fit, minmax 230px).

## Motion

- Product motion 150–250ms, conveys state (hover, focus, active, loading,
  reveal), never decoration. The running pipeline stage gets a soft pulse.
- Every animation respects `prefers-reduced-motion`.

## Bans (carried from impeccable)

No emerald or electric-blue brand color, no gradient text, no side-stripe accent
borders, no decorative glassmorphism, no Fraunces / editorial-serif display, no
rainbow accent cycling on list items.
