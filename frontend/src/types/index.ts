// ============================================================
// API Request / Response Types
// ============================================================

export interface AnalyzeRequest {
  company: string;
  selected_stages: number[] | null;
  api_key_id?: string | null;
}

export interface JobResponse {
  job_id: string;
  status: string;
  message: string;
}

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface StatusResponse {
  job_id: string;
  status: JobStatus;
  current_stage: number;
  stage_name: string;
  total_stages: number;
  progress_pct: number;
  error: string | null;
  resumable: boolean;
  paused_at: string | null;
  selected_stages: number[] | null;
  created_at?: string;
}

export interface FinancialProjections {
  company_name: string;
  current_arr: number;
  [key: string]: unknown;
}

export interface TokensUsed {
  [agent: string]: number;
}

export type RecommendationType = 'STRONG BUY' | 'BUY' | 'HOLD' | 'PASS' | 'STRONG PASS';

export interface ResultsResponse {
  job_id: string;
  company_input: string;
  status: JobStatus;
  current_stage: number;
  created_at: string;
  completed_at: string | null;
  company_info: string | null;
  market_analysis: string | null;
  financial_model_text: string | null;
  financial_projections: FinancialProjections | null;
  risk_assessment: string | null;
  comparable_deals: string | null;
  investor_memo: string | null;
  recommendation: RecommendationType | null;
  risk_score: number | null;
  total_tokens: number | null;
  tokens_used: TokensUsed | null;
  html_report_path: string | null;
  chart_path: string | null;
  infographic_path: string | null;
}

export interface HistoryItem {
  job_id: string;
  company_input: string;
  status: JobStatus;
  current_stage: number;
  recommendation: RecommendationType | null;
  risk_score: number | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================
// LLM Providers & Effort Levels
// ============================================================

export type LlmProvider = 'anthropic' | 'openai' | 'deepseek' | 'glm' | 'nvidia';
export type LlmEffort = 'low' | 'medium' | 'high' | 'max';

export const LLM_PROVIDERS: { id: LlmProvider; label: string; keyHint: string }[] = [
  { id: 'anthropic', label: 'Claude (Anthropic)', keyHint: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI (GPT)', keyHint: 'sk-...' },
  { id: 'deepseek', label: 'DeepSeek', keyHint: 'sk-...' },
  { id: 'glm', label: 'GLM (Zhipu AI)', keyHint: 'key from open.bigmodel.cn' },
  { id: 'nvidia', label: 'NVIDIA (API Catalog)', keyHint: 'nvapi-...' },
];

export const EFFORT_LEVELS: { id: LlmEffort; label: string; description: string }[] = [
  { id: 'low', label: 'Low', description: 'Fastest and cheapest; light models throughout' },
  { id: 'medium', label: 'Medium', description: 'Fast research, strong reasoning (recommended)' },
  { id: 'high', label: 'High', description: 'Strong models on every stage' },
  { id: 'max', label: 'Max', description: 'The deepest reasoning your provider offers' },
];

export function providerLabel(id?: string | null): string {
  return LLM_PROVIDERS.find((p) => p.id === id)?.label ?? 'your provider';
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: 'admin' | 'user';
  credits: number;
  created_at?: string;
  has_api_key?: boolean;
  api_key_last4?: string | null;
  llm_provider?: LlmProvider | null;
  llm_effort?: LlmEffort | null;
  uses_platform_key?: boolean;
}

export interface AuthLoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  username?: string;
  name?: string;
  role: 'admin' | 'user';
  credits: number;
  has_api_key?: boolean;
  api_key_last4?: string | null;
  llm_provider?: LlmProvider | null;
  llm_effort?: LlmEffort | null;
  uses_platform_key?: boolean;
}

export interface UserApiKey {
  id: string;
  llm_provider: LlmProvider;
  label: string | null;
  api_key_last4: string | null;
  uses_platform_key: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyStatus {
  has_api_key: boolean;
  api_key_last4: string | null;
  llm_provider?: LlmProvider | null;
  llm_effort?: LlmEffort | null;
  uses_platform_key?: boolean;
}

export interface AdminStats {
  total_users: number;
  total_analyses: number;
  completed_analyses: number;
  running_analyses: number;
  failed_analyses: number;
  paused_analyses: number;
  total_credits_in_circulation: number;
  users_low_credits: number;
  analyses_today: number;
  new_users_today: number;
  logins_today?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: 'admin' | 'user';
  credits: number;
  created_at: string;
  last_login_at?: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  type: 'purchase' | 'admin_grant' | 'admin_set' | 'usage' | 'signup_bonus';
  description: string;
  created_at: string;
}

export interface AdminAnalysis {
  job_id: string;
  company_input: string;
  status: JobStatus;
  current_stage: number;
  recommendation: RecommendationType | null;
  risk_score: number | null;
  created_at: string;
  completed_at: string | null;
  user_id?: string;
}

// ============================================================
// UI / Store Types
// ============================================================

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: number; // 80–140 (percentage)
  reducedMotion: boolean;
}

export interface PipelineStage {
  number: number;
  name: string;
  icon: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { number: 1, name: 'Execute Company Research', icon: 'search' },
  { number: 2, name: 'Perform Market Analysis', icon: 'trending_up' },
  { number: 3, name: 'Build Financial Model', icon: 'calculate' },
  { number: 4, name: 'Conduct Risk Assessment', icon: 'shield' },
  { number: 5, name: 'Research Comparable Deals', icon: 'compare' },
  { number: 6, name: 'Generate Investor Memo', icon: 'description' },
  { number: 7, name: 'Render Investor Report', icon: 'html' },
  { number: 8, name: 'Create Visual Summary', icon: 'image' },
];

// ============================================================
// Research Mode & Stage Selection
// ============================================================

export type ResearchMode = 'full' | 'quick' | 'custom';

export interface ResearchPreset {
  label: string;
  stages: number[];
  description: string;
  costEstimate: string;
}

export const RESEARCH_PRESETS: Record<ResearchMode, ResearchPreset> = {
  full: {
    label: 'Full Analysis',
    stages: [1, 2, 3, 4, 5, 6, 7, 8],
    description: 'Complete IC-ready package with report & infographic',
    costEstimate: '5 credits',
  },
  quick: {
    label: 'Quick Screen',
    stages: [1, 2, 6],
    description: 'Company research + market analysis + investment memo',
    costEstimate: '1 credit',
  },
  custom: {
    label: 'Custom',
    stages: [],
    description: 'Choose exactly which research modules to run',
    costEstimate: 'Variable',
  },
};

export interface StageInfoItem {
  number: number;
  name: string;
  costHint: string;
  requires?: number[];
}

export const STAGE_INFO: StageInfoItem[] = [
  { number: 1, name: 'Execute Company Research', costHint: '0.5 cr' },
  { number: 2, name: 'Perform Market Analysis', costHint: '0.5 cr' },
  { number: 3, name: 'Build Financial Model', costHint: '1.5 cr' },
  { number: 4, name: 'Conduct Risk Assessment', costHint: '2 cr' },
  { number: 5, name: 'Research Comparable Deals', costHint: '0.5 cr' },
  { number: 6, name: 'Generate Investor Memo', costHint: '2.5 cr' },
  { number: 7, name: 'Render Investor Report', costHint: '0.2 cr', requires: [6] },
  { number: 8, name: 'Create Visual Summary', costHint: '0.3 cr', requires: [6] },
];
