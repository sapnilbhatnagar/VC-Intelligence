import axios, { AxiosError } from 'axios';
import type {
  AnalyzeRequest,
  JobResponse,
  StatusResponse,
  ResultsResponse,
  HistoryItem,
  AuthLoginResponse,
  AuthUser,
  AdminStats,
  AdminUser,
  AdminAnalysis,
  CreditTransaction,
  ApiKeyStatus,
  UserApiKey,
} from '../types';

// ============================================================
// Axios Instance
// ============================================================
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Auth calls get a longer ceiling: a free-tier backend can be spun down and
// needs ~50s+ to cold-start on the first request, which would otherwise blow
// past the default 30s timeout and fail the sign-in.
const AUTH_TIMEOUT = 90000;

// ============================================================
// Auth header injection interceptor
// Reads token lazily from localStorage on every request so it
// does not need a direct Zustand subscription (avoids circular
// dependency between client.ts and authStore.ts).
// ============================================================
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('vc-auth-store');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      const token = parsed?.state?.token;
      if (token) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore parse errors — request proceeds without auth header
  }
  return config;
});

/**
 * Extract a human-readable message from an API error body.
 *
 * FastAPI returns `detail` as a plain string for explicit HTTPExceptions, but
 * as an ARRAY of error objects for 422 validation failures. Passing that array
 * into new Error() renders as "[object Object]"; this flattens every shape
 * into readable text. Exported for tests.
 */
export function normalizeApiError(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const detail = (data as { detail?: unknown }).detail;
  if (detail == null) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => {
      if (typeof d === 'string') return d;
      const item = d as { loc?: unknown; msg?: unknown };
      const loc = Array.isArray(item.loc)
        ? item.loc.filter((seg) => seg !== 'body' && seg !== 'query').join('.')
        : '';
      const msg = typeof item.msg === 'string' ? item.msg : JSON.stringify(d);
      return loc ? `${loc}: ${msg}` : msg;
    });
    return parts.join('; ');
  }
  return JSON.stringify(detail);
}

// Response interceptor — normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message =
      normalizeApiError(error.response?.data) ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ============================================================
// Existing API Functions
// ============================================================

/** Start a new due-diligence analysis job */
export async function startAnalysis(payload: AnalyzeRequest): Promise<JobResponse> {
  const { data } = await apiClient.post<JobResponse>('/analyze', payload);
  return data;
}

/** Poll the status of an in-progress job */
export async function getJobStatus(jobId: string): Promise<StatusResponse> {
  const { data } = await apiClient.get<StatusResponse>(`/status/${jobId}`);
  return data;
}

/** Fetch full results once a job is completed */
export async function getJobResults(jobId: string): Promise<ResultsResponse> {
  const { data } = await apiClient.get<ResultsResponse>(`/results/${jobId}`);
  return data;
}

/** List past analyses (last 100) */
export async function getHistory(): Promise<HistoryItem[]> {
  const { data } = await apiClient.get<HistoryItem[]>('/history');
  return data;
}

/** Health check — returns true if the backend is reachable */
export async function checkHealth(): Promise<boolean> {
  try {
    await apiClient.get('/health');
    return true;
  } catch {
    return false;
  }
}

/** Signal pipeline to pause after current stage */
export async function stopJob(jobId: string): Promise<JobResponse> {
  const { data } = await apiClient.post<JobResponse>(`/stop/${jobId}`);
  return data;
}

/** Resume a paused or failed pipeline from last completed stage */
export async function resumeJob(jobId: string): Promise<JobResponse> {
  const { data } = await apiClient.post<JobResponse>(`/resume/${jobId}`);
  return data;
}

/** Complete remaining stages of a partial analysis */
export async function completeRemaining(
  jobId: string,
  selectedStages?: number[] | null,
): Promise<JobResponse> {
  const { data } = await apiClient.post<JobResponse>(`/complete/${jobId}`, {
    selected_stages: selectedStages ?? null,
  });
  return data;
}

// ============================================================
// Auth API Functions
// ============================================================

/** Register a new account — returns tokens + user info.
 *  Provider + API key are mandatory: every analysis runs on the user's own
 *  provider account (or the platform's, via the admin passphrase). */
export async function register(
  email: string,
  password: string,
  username: string | undefined,
  name: string | undefined,
  apiKey: string,
  provider: string,
  effort: string,
): Promise<AuthLoginResponse> {
  const { data } = await apiClient.post<AuthLoginResponse>(
    '/auth/register',
    {
      email,
      password,
      ...(username ? { username } : {}),
      ...(name ? { name } : {}),
      api_key: apiKey,
      llm_provider: provider,
      llm_effort: effort,
    },
    { timeout: AUTH_TIMEOUT },
  );
  return data;
}

/** Log in with email or username + password */
export async function loginApi(
  identifier: string,
  password: string,
): Promise<AuthLoginResponse> {
  const { data } = await apiClient.post<AuthLoginResponse>(
    '/auth/login',
    { identifier, password },
    { timeout: AUTH_TIMEOUT },
  );
  return data;
}

/**
 * Wake a possibly spun-down backend. Fire-and-forget on public auth surfaces so
 * the cold start happens while the visitor is reading / typing, not after they
 * submit. Resolves to false on any error (including timeout); never throws.
 */
export async function warmBackend(): Promise<boolean> {
  return checkHealth();
}

/** Fetch the currently authenticated user's profile */
export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

/** Update the current user's display name and/or username */
export async function updateProfile(
  updates: { name?: string; username?: string; llm_effort?: string }
): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>('/auth/me/profile', updates);
  return data;
}

/** Add credits to the authenticated user's own account (mock purchase) */
export async function addCredits(
  amount: number
): Promise<{ message: string; new_balance: number }> {
  const { data } = await apiClient.post<{ message: string; new_balance: number }>(
    '/auth/me/add-credits',
    { amount }
  );
  return data;
}

/** Get the analyses belonging to the currently authenticated user */
export async function getMyAnalyses(): Promise<HistoryItem[]> {
  const { data } = await apiClient.get<HistoryItem[]>('/auth/me/analyses');
  return data;
}

/** List the user's stored API keys (masked). */
export async function listApiKeys(): Promise<UserApiKey[]> {
  const { data } = await apiClient.get<UserApiKey[]>('/auth/me/api-keys');
  return data;
}

/** Add another API key for a provider. */
export async function addApiKeyEntry(
  apiKey: string,
  provider: string,
  label?: string,
): Promise<UserApiKey> {
  const { data } = await apiClient.post<UserApiKey>('/auth/me/api-keys', {
    api_key: apiKey,
    llm_provider: provider,
    ...(label ? { label } : {}),
  });
  return data;
}

/** Make one stored key the default for future runs. */
export async function activateApiKey(keyId: string): Promise<UserApiKey> {
  const { data } = await apiClient.put<UserApiKey>(`/auth/me/api-keys/${keyId}/activate`);
  return data;
}

/** Delete one stored key. */
export async function deleteApiKeyEntry(keyId: string): Promise<void> {
  await apiClient.delete(`/auth/me/api-keys/${keyId}`);
}

/** Save the user's API key, optionally switching provider and effort level. */
export async function saveApiKey(
  apiKey: string,
  provider?: string,
  effort?: string,
): Promise<ApiKeyStatus> {
  const { data } = await apiClient.put<ApiKeyStatus>('/auth/me/api-key', {
    api_key: apiKey,
    ...(provider ? { llm_provider: provider } : {}),
    ...(effort ? { llm_effort: effort } : {}),
  });
  return data;
}

/** Remove the user's stored API key (revert to credit-based runs) */
export async function deleteApiKey(): Promise<ApiKeyStatus> {
  const { data } = await apiClient.delete<ApiKeyStatus>('/auth/me/api-key');
  return data;
}

// ============================================================
// Admin API Functions (require admin JWT)
// ============================================================

/** Get platform-wide statistics */
export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>('/admin/stats');
  return data;
}

/** List all registered users */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users');
  return data;
}

/** Set a user's credit balance to an exact value */
export async function setUserCredits(
  userId: string,
  credits: number
): Promise<AdminUser> {
  const { data } = await apiClient.put<AdminUser>(
    `/admin/users/${userId}/credits`,
    { credits }
  );
  return data;
}

/** Add N credits to a user's balance */
export async function grantUserCredits(
  userId: string,
  amount: number
): Promise<AdminUser> {
  const { data } = await apiClient.post<AdminUser>(
    `/admin/users/${userId}/credits/add`,
    { amount }
  );
  return data;
}

/** Fetch all analyses across all users */
export async function getAdminAnalyses(): Promise<AdminAnalysis[]> {
  const { data } = await apiClient.get<AdminAnalysis[]>('/admin/analyses');
  return data;
}

/** Delete an analysis by job ID */
export async function deleteAnalysis(jobId: string): Promise<void> {
  await apiClient.delete(`/analyses/${jobId}`);
}

/** Google OAuth — exchange Google ID token for app JWT */
export async function googleAuth(credential: string): Promise<AuthLoginResponse> {
  const { data } = await apiClient.post<AuthLoginResponse>(
    '/auth/google',
    { credential },
    { timeout: AUTH_TIMEOUT },
  );
  return data;
}

// ============================================================
// Admin user CRUD (require admin JWT)
// ============================================================

/** Update a user's email, role, or credits via PATCH */
export async function adminUpdateUser(
  userId: string,
  data: Partial<{ email: string; role: string; credits: number }>
): Promise<AdminUser> {
  const { data: res } = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, data);
  return res;
}

/** Create a new user account (admin-only) */
export async function adminCreateUser(data: {
  email: string;
  password: string;
  role: string;
  credits: number;
}): Promise<AdminUser> {
  const { data: res } = await apiClient.post<AdminUser>('/admin/users', data);
  return res;
}

/** Delete a user account (admin-only) */
export async function adminDeleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}

/** Fetch all credit transactions (admin-only) */
export async function getAdminCreditTransactions(): Promise<CreditTransaction[]> {
  const { data } = await apiClient.get<CreditTransaction[]>('/admin/credit-transactions');
  return data;
}

// ============================================================
// Download helpers
// The report/one-pager endpoints require the owner's auth, so we
// fetch them through apiClient (which attaches the Bearer token),
// then open the returned file as an object URL. A plain window.open
// would not carry the token and would 401.
// ============================================================
async function openAuthedFile(path: string): Promise<void> {
  const response = await apiClient.get(path, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(response.data as Blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  // Revoke after a delay so the new tab has time to load it.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** Open the investor report (HTML) in a new tab, authenticated. */
export const openReport = (jobId: string) => openAuthedFile(`/results/${jobId}/report`);

/** Open the visual one-pager (HTML) in a new tab, authenticated. */
export const openOnePager = (jobId: string) => openAuthedFile(`/results/${jobId}/one-pager`);
