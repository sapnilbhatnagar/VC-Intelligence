# Frontend MUI Agent Memory

## Project
- React 18 + TypeScript + MUI v5, dark theme SaaS app
- Root: `frontend/src/`
- Build: `npm run build` from `frontend/` — must pass `tsc && vite build`

## Key Files
- `src/pages/Dashboard.tsx` — main dashboard (premium layout with hero stats, two-column grid)
- `src/pages/JobView.tsx` — job detail view with Pipeline/Analytics/Downloads tabs
- `src/components/analytics/AnalyticsDashboard.tsx` — analytics dashboard container
- `src/components/analytics/panels/` — 5 standalone panel components (KeyMetrics, InvestmentHighlights, FinancialProjections, RiskAssessment, ComparableDeals)
- `src/components/job/DownloadSection.tsx` — download buttons (used in Downloads tab)
- `src/components/job/MetricsPanel.tsx`, `ExecutionLog.tsx`, `ResultsPanel.tsx`, `PipelineStepper.tsx`
- `src/api/client.ts` — axios client, all API functions including `getHistory`
- `src/store/authStore.ts` — Zustand auth store (`user.email`, `user.credits`, `token`)
- `src/types/index.ts` — all shared interfaces

## TypeScript Gotchas
- `Record<string, unknown>` indexing returns `unknown` — cannot render directly as ReactNode; use `typeof val === 'string'` guard before rendering, or cast explicitly
- MUI `sx` prop: avoid `(t) => expr` when `t` is unused — TypeScript strict mode flags this as TS6133
- `alpha()` from `@mui/material` can be called with a static hex string without needing the theme callback
- `FinancialProjections` in types is `{ company_name: string; current_arr: number; [key: string]: unknown }` — pass as `Record<string, unknown>` when accessing dynamic keys
- Object literals in `sx` cannot have duplicate keys — for line-clamp drop `display: 'block'`, keep only `display: '-webkit-box'`
- Remove unused helper functions to avoid TS6133 — declare only if actually called

## MUI Patterns
- `alpha(color, opacity)` works with hex strings directly — no theme needed
- Tab panels: use `hidden={activeTab !== n}` + `role="tabpanel"` + `aria-labelledby` + `aria-controls`
- Donut ring: prefer SVG `stroke-dasharray` + `stroke-dashoffset` animated via CSS transition; NOT conic-gradient for animated variant
- SVG donut animation pattern: set dashOffset = CIRCUMFERENCE initially, then setTimeout(120ms) in useEffect to trigger CSS transition
- `Box component="li"` renders semantic list items inside `Box component="ul/ol"`
- Line-clamp in sx: `{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties`
- SVG charts: use `viewBox` + `width="100%" height="auto"` for full responsiveness; pad with PAD object

## Panel Architecture (analytics/panels/)
- Each panel is a standalone default-export component in its own file
- Always: `Card variant="outlined"` + `backgroundColor: alpha('#ffffff', 0.03)`
- Mount animation: `Grow` on top-level card for metrics; `Fade` for individual list items
- Data extraction: regex parse before rendering, guard empty arrays gracefully with skeleton or caption

## Recommendation Colors
```ts
'STRONG BUY': { bg: '#10B981', text: '#fff' }
BUY: { bg: '#3B82F6', text: '#fff' }
HOLD: { bg: '#F59E0B', text: '#000' }
PASS: { bg: '#EF4444', text: '#fff' }
'STRONG PASS': { bg: '#7F1D1D', text: '#fff' }
```
