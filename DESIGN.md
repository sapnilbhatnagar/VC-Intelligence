# DESIGN.md

The "institutional daylight" system: one light theme, used everywhere. The MUI
source of truth is `frontend/src/theme.ts` (tokens, recommendation/risk/chart
helpers, component overrides). The landing page reuses the same tokens with two
local constants (the ink pipeline band) so the brand and product read as one.

## Strategy

Apple-style structure, Google-style color discipline. Cool-gray canvas, white
tiles with 1px hairline borders, soft low-spread layered shadows, generous radii
(14 to 16px). One deep cobalt accent for actions and active state, kept under
~10 percent of any viewport. The data vocabulary (verdicts, risk) is a separate
green / amber / red scale and never doubles as decoration. Never pure #000
backgrounds in-app; the landing page's pipeline band uses a committed ink
(#10151C) as its single dark surface.

## Color

Brand (the single accent):
- brand:         #1D4ED8  (cobalt — primary actions, active state, links, focus)
- brand-hover:   #2563EB
- brand-pressed: #1740B3
- on-brand:      #FFFFFF  (6.4:1 on the cobalt fill)
- brand-soft:    rgba(29,78,216,0.08)  (selected rows, soft chips)

Cool neutral surfaces:
- canvas (app bg):   #F4F6F8
- surface (tiles):   #FFFFFF
- surface-alt:       #F9FAFB  (second neutral layer: rail, toolbars)
- border:            #E5E8ED  (hairline)
- border-strong:     #D3D9E0  (inputs, stronger dividers)

Ink:
- text-primary:   #161B22
- text-secondary: #57606C   (>= 4.5:1 on white)
- text-disabled:  #8B95A1   (decorative / non-essential only)

Semantic data vocabulary (verdicts, risk, status — NOT the brand):
- success / BUY:  #188038
- caution / HOLD: #A05E00  (HOLD chips use #B7791F bg + ink text)
- danger / PASS:  #C5221F

All risk colors hold AA as data text on white. Recommendation chips ship as
accessible bg + text pairs (RECOMMENDATION_COLORS, all >= 4.5:1). Risk score
maps to success/caution/danger via riskColor(); financial scenarios use
CHART_COLORS (bear red / base cobalt / bull green).

## Typography

- UI + display: "Hanken Grotesk" (one family carries headings, labels, body,
  buttons; weight contrast 450/620/700/800 does the hierarchy work).
- Data / figures: "JetBrains Mono". Risk scores, ARR, credits, stage indices,
  tile labels.
- Fixed rem scale in-app; landing headings use clamp() (max 3.6rem). Tight
  tracking on display (-0.03em landing, -0.02em app). Body capped ~65-75ch.

## Layout

- App shell: fixed left rail (244px, surface-alt) carrying brand, "New
  analysis", navigation, credit balance, connection state, and the user block.
  Content scrolls on the canvas. Mobile: slim top bar + temporary drawer.
- Dashboard is "the deal desk": KPI strip (one featured ink tile), analysis
  form beside a pipeline-activity / verdict-mix / risk-profile column, and the
  deal-flow table.
- Pipeline progress is the agent rail (PipelineStepper): eight nodes on a
  connected track that fills as the agent advances; the banner names the active
  stage and the engine (model) working it.
- Landing: sign-in opens as a dialog on the page itself (/auth redirects to
  /?auth=signin). Hero shows the deliverable (memo specimen with verdict chip,
  risk dial, scenario chart); pipeline renders as a vertical agent rail on the
  ink band; deliverables as ruled rows; audience and pricing as ledgers.

## Graphics

Purposeful inline SVG only: BrandMark (cobalt tile, ascending bars), risk dial,
scenario chart, risk histogram, deliverable previews. No stock imagery, no
decorative illustration.

## Motion

- Product motion 150-250ms, conveys state (hover, focus, active, loading,
  reveal), never decoration. The active pipeline node gets a soft pulse ring.
- Every animation is wrapped in `@media (prefers-reduced-motion: no-preference)`.

## Bans (carried from impeccable)

No gradient text, no side-stripe accent borders, no decorative glassmorphism,
no hero-metric template, no identical icon-card grids, no emoji or tick/cross
glyphs in product copy (data-quality markers are [CONFIRMED] / [ESTIMATED] /
[UNKNOWN]). Retired identities (orange paper, navy/mint, emerald) stay retired;
theme.test.ts enforces the banned list.
