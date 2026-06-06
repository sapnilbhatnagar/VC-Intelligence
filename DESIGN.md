# DESIGN.md

Design tokens for marketing/auth surfaces. The in-app product theme lives in
`frontend/src/theme.ts` (dark / light / advanced MUI themes); this file governs
the landing page and the auth brand panel, which deliberately read more
editorial than the app chrome while staying tonally coherent (same near-black
base, same emerald signal).

## Color

Strategy: Restrained. Warm-tinted near-black neutrals + one emerald accent.
Never pure #000 or #fff.

- ink (base bg):        #0A0E17  (near-black, faint blue-graphite tint)
- ink-raised:          #11161F  (panels, the specimen card)
- ink-line:            #1E2530  (hairline borders)
- paper (text hi):     #F4F6F8
- paper-dim (text mid):#9BA6B4
- paper-faint (muted): #5B6675
- signal (accent):     #10B981  (emerald — the STRONG BUY signal; CTA + live dot only)
- signal-deep:         #0E7C5A  (pressed / gradient floor for the CTA)
- caution:             #F59E0B  (HOLD, used only inside specimen)
- risk:                #EF4444  (PASS, used only inside specimen)

Emerald stays under ~10% of any viewport. If it is spreading, pull it back.

## Typography

- Display (landing + auth headline): "Fraunces", Georgia, serif. Optical size
  high, weight 500–600, tight tracking (-0.02em). This is the editorial voice.
- UI / body: "Inter", system-ui (already the app font).
- Data / labels / specimen figures: "JetBrains Mono" (already loaded). Used for
  stage indices, risk score, recommendation tag, eyebrows.

Scale (display): clamp-driven. Hero ~ clamp(2.5rem, 6vw, 4.5rem). Step ratio ≥ 1.25.
Body capped at ~68ch.

## Layout

- Asymmetric and editorial. No centered hero. Left-weighted headline, the output
  specimen sits to the right / below.
- The 8 stages render as a numbered table-of-contents index (mono numerals), not
  as a card grid.
- Generous, varied vertical rhythm between sections (not uniform padding).
- Max content width ~1200px, but let the hero break wider than the body.

## Motion

- Entrance: short, ease-out (cubic-bezier(0.16, 1, 0.3, 1)), 400–600ms, small
  translate + fade. No bounce. Respect prefers-reduced-motion.
- The live signal dot pulses slowly (emerald), nothing else loops.

## Components

- Specimen card: ink-raised panel, 1px ink-line border, generous padding, mono
  figures. Shows company, recommendation tag, risk score, a few metric rows.
- Primary CTA: solid emerald, dark ink text, subtle lift on hover.
- Secondary CTA: ghost, paper-dim text, ink-line border.
