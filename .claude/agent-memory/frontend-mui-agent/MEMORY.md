# Frontend MUI Agent Memory

## Project: VC Due Diligence Frontend
- Stack: React 18 + TypeScript + MUI v5 + Vite + Zustand + TanStack Query + Axios + @react-oauth/google
- Frontend root: `D:\Obsidian Vault\Sapnil Bhatnagar\Projects\AI VC Due Diligence\AI VC Due Diligence V2\frontend\`
- Backend base URL: `/api/v1` (relative — frontend served from same origin as backend)
- Dev server: `npm run dev` → http://localhost:3000

## Key TypeScript Patterns (MUI v5)
- MUI `Tab` `icon` prop requires `React.ReactElement`, NOT `React.ReactNode` (null is not assignable)
- MUI DataGrid v7 `GridRenderCellParams` value can be undefined — always use local const + null check
- Unused imports cause TS6133 errors with `noUnusedLocals: true` — always clean up
- MUI `Chip` `color` prop must be cast when the value comes from a Record — cast to the union type
- `import.meta.env` requires `src/vite-env.d.ts` with `/// <reference types="vite/client" />`
- MUI `sx` callback `(t) => ...` causes TS6133 if `t` unused — use direct value instead
- MUI `@keyframes` inside `sx` prop must use plain values, not theme callbacks

## State Architecture
- Zustand store (`jobStore`) persists: accessibilitySettings, sidebarOpen, themeMode
- jobStore has `pendingAnalysis` (NOT persisted) for preview flow — stored in-memory only
- TanStack Query handles all data fetching/polling; Zustand syncs results via useEffect
- Polling: `refetchInterval` callback returns `false` when status is completed/failed/paused
- `stopInProgress` and `resumeInProgress` are transient booleans (not persisted)

## Route Architecture (post-Change 1)
- `/preview` route REMOVED — preview embedded in `/job/new` (JobView handles jobId==='new')
- `/job/:jobId` and `/history` are ProtectedRoutes (require auth → redirect to /auth)
- JobView `isNewJob` flag: reads `pendingAnalysis` from store, renders PreviewState component
- PreviewState → handleStartNow → startAnalysis → navigate(`/job/${id}`, { replace: true })
- If `pendingAnalysis` is null when landing on `/job/new`, useEffect redirects to `/`

## History Page
- Calls `getMyAnalyses` (NOT `getHistory`) — query key `['my-analyses']`
- Protected route, always authenticated; `getMyAnalyses` calls `/auth/me/analyses`
- Admin users see all analyses via backend `/history` route which checks `current_user.role`

## Auth Architecture
- Auth store: `src/store/authStore.ts` — Zustand + persist, keys: token, user (AuthUser)
- Token injected lazily into axios via request interceptor reading `localStorage['vc-auth-store']`
- AuthPage: has Google Sign-In via @react-oauth/google; main.tsx wraps root in GoogleOAuthProvider
- Route guards: `ProtectedRoute` (needs token), `AdminRoute` (needs token + role=admin)
- Login sends `identifier` field (email OR username), not `email`
- Admin logs in with identifier="Admin" (stored as email="Admin" in DB)
- AuthPage has admin mode chip: pre-fills identifier="Admin", focuses password field
- `loginApi(identifier, password)` — sends `{ identifier, password }` to `/auth/login`
- `register(email, password, username?)` — optional username

## Auth Types (AuthUser / AuthLoginResponse)
- Both have optional `username?: string` field (added in Change 4)

## Backend Auth (routes_auth.py)
- Login tries `get_user_by_email(identifier)` first, then `get_user_by_username(identifier)`
- Register checks username uniqueness; `UserLoginRequest` has `identifier` field
- `TokenResponse` and `UserResponse` include optional `username`

## Backend Authorization (routes.py)
- `/history`: admin → `list_analyses()`, user → `list_analyses_by_user()`, anon → `[]`
- `/status/{job_id}` and `/results/{job_id}`: 403 if user_id mismatch and not admin

## Database (storage/database.py)
- Users table has `username TEXT` column (migration in init_db)
- `create_user()` accepts optional `username` param
- `get_user_by_username(username)` function exists
- `update_user()` allowed set includes "username"
- `list_users()` includes username column in SELECT

## Theme System (theme.ts)
- Three modes: `dark` | `light` | `advanced` — factory: `createAppTheme(mode: ThemeMode)`
- `ThemeMode` type defined in both `src/types/index.ts` AND `src/theme.ts` (keep in sync)

## Pipeline Status Values
- `JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'`
- Stop button shown when running; Resume shown when paused OR failed

## Infographic Generator (tools/infographic_generator.py)
- V2: dark theme (#0F172A bg), donut/gauge chart for risk score via matplotlib Wedge
- 4-col layout row 1: TAM/Funding/Stage cards + donut risk score
- Revenue chart: area fill, value annotations on base line
- Highlights and Risks side-by-side (cols 2 and 3 in row 2)
- Footer summary bar with all key metrics; 160 DPI PNG output

## Admin Dashboard
- Full user CRUD: adminUpdateUser (PATCH), adminCreateUser (POST), adminDeleteUser (DELETE)
- Create user dialog has email/password/role/credits fields
