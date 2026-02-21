// ============================================================
// API Request / Response Types
// ============================================================

export interface AnalyzeRequest {
  company: string;
  selected_stages: number[] | null;
}

export interface JobResponse {
  job_id: string;
  status: string;
  message: string;
}

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export type ThemeMode = 'dark' | 'light' | 'advanced';

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
}

export interface AdminStats {
  total_users: number;
  total_analyses: number;
  completed_analyses: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  credits: number;
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
  darkMode: boolean;
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
  { number: 1, name: 'Company Research', icon: 'search' },
  { number: 2, name: 'Market Analysis', icon: 'trending_up' },
  { number: 3, name: 'Financial Modeling', icon: 'calculate' },
  { number: 4, name: 'Risk Assessment', icon: 'shield' },
  { number: 5, name: 'Comparable Deals', icon: 'compare' },
  { number: 6, name: 'Investor Memo', icon: 'description' },
  { number: 7, name: 'HTML Report', icon: 'html' },
  { number: 8, name: 'Infographic', icon: 'image' },
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
  { number: 1, name: 'Company Research', costHint: '0.5 cr' },
  { number: 2, name: 'Market Analysis', costHint: '0.5 cr' },
  { number: 3, name: 'Financial Modeling', costHint: '1.5 cr' },
  { number: 4, name: 'Risk Assessment', costHint: '2 cr' },
  { number: 5, name: 'Comparable Deals', costHint: '0.5 cr' },
  { number: 6, name: 'Investor Memo', costHint: '2.5 cr' },
  { number: 7, name: 'HTML Report', costHint: '0.2 cr', requires: [6] },
  { number: 8, name: 'Infographic', costHint: '0.3 cr', requires: [6] },
];
