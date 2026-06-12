import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Paper,
  LinearProgress,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AnalysisForm from '../components/analysis/AnalysisForm';
import { getHistory } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { RECOMMENDATION_COLORS, riskColor, riskLabel, TOKENS, MONO } from '../theme';
import type { HistoryItem } from '../types';

// ============================================================
// Dashboard — the deal desk.
//
// What a diligence desk wants at a glance: how much of the
// pipeline is covered, how the verdicts lean, where the risk
// sits, what is running right now, and the deal flow itself.
// ============================================================

const VERDICT_ORDER = ['STRONG BUY', 'BUY', 'HOLD', 'PASS', 'STRONG PASS'] as const;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================================
// KPI tile — white tile with a mono figure; one featured ink tile.
// ============================================================
interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  loading: boolean;
  featured?: boolean;
  pulse?: boolean;
  graphic?: React.ReactNode;
}

function KpiTile({ label, value, hint, loading, featured = false, pulse = false, graphic }: KpiTileProps) {
  return (
    <Box
      sx={{
        height: '100%',
        p: 2.5,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: featured ? 'transparent' : 'divider',
        backgroundColor: featured ? '#10151C' : 'background.paper',
        color: featured ? '#FFFFFF' : 'text.primary',
        boxShadow: featured ? '0 16px 40px rgba(16,21,28,0.24)' : '0 1px 3px rgba(22,27,34,0.05)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: featured ? '0 22px 52px rgba(16,21,28,0.30)' : '0 10px 26px rgba(22,27,34,0.10)',
        },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: '0.64rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: featured ? 'rgba(255,255,255,0.66)' : 'text.secondary',
          }}
        >
          {label}
        </Typography>
        {pulse && (
          <Box
            aria-hidden="true"
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: featured ? '#FFFFFF' : TOKENS.brand,
              ml: 'auto',
              '@media (prefers-reduced-motion: no-preference)': {
                animation: 'kpiPulse 1.6s ease-in-out infinite',
                '@keyframes kpiPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              },
            }}
          />
        )}
      </Box>
      {loading ? (
        <Skeleton width={64} height={38} sx={{ bgcolor: featured ? 'rgba(255,255,255,0.18)' : undefined }} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '1.9rem', lineHeight: 1 }}>
              {value}
            </Typography>
            {hint && (
              <Typography variant="caption" sx={{ color: featured ? 'rgba(255,255,255,0.6)' : 'text.secondary', display: 'block', mt: 0.75 }}>
                {hint}
              </Typography>
            )}
          </Box>
          {graphic}
        </Box>
      )}
    </Box>
  );
}

// ============================================================
// Verdict mix — stacked distribution bar with legend
// ============================================================
function VerdictMix({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) {
      if (it.status === 'completed' && it.recommendation) c[it.recommendation] = (c[it.recommendation] ?? 0) + 1;
    }
    return c;
  }, [items]);
  const total = VERDICT_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0);

  return (
    <Box sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
        Verdict mix
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={14} sx={{ borderRadius: 7 }} />
      ) : total === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Verdicts land here once a memo completes.
        </Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', gap: '2px' }} role="img" aria-label="Verdict distribution">
            {VERDICT_ORDER.map((k) => {
              const n = counts[k] ?? 0;
              if (n === 0) return null;
              return <Box key={k} sx={{ flex: n, backgroundColor: RECOMMENDATION_COLORS[k].bg }} title={`${k}: ${n}`} />;
            })}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
            {VERDICT_ORDER.filter((k) => (counts[k] ?? 0) > 0).map((k) => (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '3px', backgroundColor: RECOMMENDATION_COLORS[k].bg }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                  {k} &middot; {counts[k]}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// ============================================================
// Risk profile — SVG histogram of completed risk scores
// ============================================================
function RiskProfile({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const buckets = useMemo(() => {
    const b = [0, 0, 0, 0, 0]; // 0–2, 2–4, 4–6, 6–8, 8–10
    for (const it of items) {
      if (it.status === 'completed' && it.risk_score !== null) {
        b[Math.min(4, Math.floor(it.risk_score / 2))] += 1;
      }
    }
    return b;
  }, [items]);
  const max = Math.max(1, ...buckets);
  const total = buckets.reduce((a, n) => a + n, 0);
  const bucketColor = (i: number) => riskColor(i * 2 + 1);

  return (
    <Box sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
        Risk profile
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={72} />
      ) : total === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          The risk distribution of your completed analyses plots here.
        </Typography>
      ) : (
        <svg viewBox="0 0 220 84" width="100%" role="img" aria-label="Distribution of risk scores across completed analyses">
          {buckets.map((n, i) => {
            const h = n === 0 ? 2 : (n / max) * 56;
            return (
              <g key={i}>
                <rect
                  x={10 + i * 42}
                  y={64 - h}
                  width={30}
                  height={h}
                  rx={3}
                  fill={n === 0 ? TOKENS.border : bucketColor(i)}
                  opacity={n === 0 ? 0.8 : 0.9}
                />
                <text x={25 + i * 42} y={78} textAnchor="middle" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fill={TOKENS.textSecondary}>
                  {i * 2}&ndash;{i * 2 + 2}
                </text>
                {n > 0 && (
                  <text x={25 + i * 42} y={58 - h} textAnchor="middle" fontSize="9" fontWeight="600" fontFamily="JetBrains Mono, monospace" fill={TOKENS.textPrimary}>
                    {n}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </Box>
  );
}

// ============================================================
// Pipeline activity — runs currently in flight
// ============================================================
function PipelineActivity({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const navigate = useNavigate();
  const active = items.filter((i) => i.status === 'running' || i.status === 'paused' || i.status === 'pending');

  return (
    <Box sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="overline">Pipeline activity</Typography>
        {active.length > 0 && (
          <Chip
            label={active.length}
            size="small"
            sx={{ ml: 'auto', height: 18, fontSize: '0.65rem', fontWeight: 700, backgroundColor: TOKENS.brandSoft, color: 'primary.main' }}
          />
        )}
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={52} sx={{ borderRadius: 2.5 }} />)}
        </Box>
      ) : active.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', py: 1 }}>
          Nothing in flight. Start an analysis and watch the agents move through the stages here.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {active.map((item) => (
            <Box key={item.job_id} sx={{ p: 1.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 650, color: 'text.primary', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.company_input}
                </Typography>
                <Chip
                  label={item.status}
                  size="small"
                  color={item.status === 'running' ? 'primary' : item.status === 'paused' ? 'warning' : 'default'}
                  sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }}
                />
                <Button
                  size="small"
                  variant="text"
                  endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />}
                  onClick={() => navigate(`/job/${item.job_id}`)}
                  sx={{ fontSize: '0.7rem', py: 0, px: 0.75, minWidth: 0, flexShrink: 0 }}
                >
                  Open
                </Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={(item.current_stage / 8) * 100}
                  sx={{ flex: 1, height: 5 }}
                  aria-label={`${item.company_input} progress`}
                />
                <Typography variant="caption" sx={{ fontFamily: MONO, fontSize: '0.62rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  Stage {item.current_stage} of 8
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ============================================================
// Deal flow table
// ============================================================
function DealFlowTable({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const navigate = useNavigate();
  const recent = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
    [items],
  );

  const statusColor = (s: string) =>
    (s === 'completed' ? 'success' : s === 'failed' ? 'error' : s === 'running' ? 'primary' : s === 'paused' ? 'warning' : 'default') as
      | 'success' | 'error' | 'primary' | 'warning' | 'default';

  if (!loading && recent.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '16px', backgroundColor: 'background.paper' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Your deal flow builds here. Run the first analysis above.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', backgroundColor: 'background.paper', borderRadius: '16px' }}>
      <Table size="small" aria-label="Deal flow">
        <TableHead>
          <TableRow>
            {['Company', 'Verdict', 'Risk', 'Status', 'Date', ''].map((col) => (
              <TableCell
                key={col}
                sx={{ fontSize: '0.66rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', borderColor: 'divider', py: 1.25, px: 2, whiteSpace: 'nowrap' }}
              >
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <TableCell key={j} sx={{ py: 1.25, px: 2 }}><Skeleton height={20} /></TableCell>
                  ))}
                </TableRow>
              ))
            : recent.map((item) => {
                const verdict = item.recommendation ? RECOMMENDATION_COLORS[item.recommendation] : null;
                return (
                  <TableRow
                    key={item.job_id}
                    hover
                    onClick={() => navigate(`/job/${item.job_id}`)}
                    sx={{ cursor: 'pointer', '&:last-child td': { border: 0 }, '&:hover': { backgroundColor: TOKENS.brandSoft } }}
                  >
                    <TableCell sx={{ py: 1.25, px: 2, maxWidth: 200, borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 650, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {item.company_input}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, borderColor: 'divider' }}>
                      {verdict && item.recommendation ? (
                        <Chip label={item.recommendation} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: verdict.bg, color: verdict.text }} />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>&mdash;</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, borderColor: 'divider', whiteSpace: 'nowrap' }}>
                      {item.risk_score !== null ? (
                        <Typography variant="caption" sx={{ fontFamily: MONO, fontWeight: 700, color: riskColor(item.risk_score) }}>
                          {item.risk_score.toFixed(1)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>&mdash;</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, borderColor: 'divider' }}>
                      <Chip label={item.status} size="small" color={statusColor(item.status)} variant={item.status === 'completed' ? 'filled' : 'outlined'} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, whiteSpace: 'nowrap', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, borderColor: 'divider' }}>
                      <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.disabled' }} aria-hidden="true" />
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ============================================================
// Page
// ============================================================
export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: history = [], isLoading } = useQuery({ queryKey: ['history'], queryFn: getHistory, staleTime: 30_000 });

  const totalCount = history.length;
  const completed = history.filter((i) => i.status === 'completed');
  const buyCount = completed.filter((i) => i.recommendation === 'BUY' || i.recommendation === 'STRONG BUY').length;
  const activeCount = history.filter((i) => i.status === 'running' || i.status === 'paused' || i.status === 'pending').length;
  const medianRisk = median(completed.map((i) => i.risk_score).filter((s): s is number => s !== null));

  const greeting = getGreeting();
  const userName = user?.name?.trim() || user?.username?.trim() || user?.email?.split('@')[0] || null;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Box sx={{ maxWidth: 1320, mx: 'auto' }}>
      {/* ── Desk header ─────────────────────────────────────── */}
      <Box sx={{ mb: 3.5, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' }, mb: 0.5 }}>
            Deal desk
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {greeting}{userName ? `, ${userName}` : ''} &middot; {today}
          </Typography>
        </Box>
        {history.length > 0 && (
          <Button variant="outlined" size="small" endIcon={<ArrowForwardIcon fontSize="small" />} onClick={() => navigate('/history')}>
            Full history
          </Button>
        )}
      </Box>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} lg={3}>
          <KpiTile
            label="Companies analyzed"
            value={totalCount}
            hint={`${completed.length} completed`}
            loading={isLoading}
            featured
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <KpiTile
            label="Buy signals"
            value={buyCount}
            hint={completed.length > 0 ? `of ${completed.length} verdicts` : 'no verdicts yet'}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <KpiTile
            label="Median risk"
            value={
              medianRisk === null ? (
                <Typography component="span" sx={{ fontFamily: MONO, fontSize: '1.1rem', color: 'text.disabled' }}>&mdash;</Typography>
              ) : (
                <Box component="span" sx={{ color: riskColor(medianRisk) }}>{medianRisk.toFixed(1)}</Box>
              )
            }
            hint={medianRisk === null ? 'scored on completion' : `${riskLabel(medianRisk)} risk / 10`}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <KpiTile
            label="In pipeline"
            value={activeCount}
            hint={activeCount > 0 ? 'agents running now' : 'no runs in flight'}
            loading={isLoading}
            pulse={activeCount > 0}
          />
        </Grid>
      </Grid>

      {/* ── Desk grid: form + intelligence column ───────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <AnalysisForm />
        </Grid>
        <Grid item xs={12} lg={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <PipelineActivity items={history} loading={isLoading} />
            <VerdictMix items={history} loading={isLoading} />
            <RiskProfile items={history} loading={isLoading} />
          </Box>
        </Grid>
      </Grid>

      {/* ── Deal flow ───────────────────────────────────────── */}
      <Box sx={{ mt: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h3" sx={{ fontSize: '1.05rem' }}>Deal flow</Typography>
          {history.length > 8 && (
            <Button size="small" endIcon={<ArrowForwardIcon fontSize="small" />} onClick={() => navigate('/history')} sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
              View all {history.length}
            </Button>
          )}
        </Box>
        <DealFlowTable items={history} loading={isLoading} />
      </Box>
    </Box>
  );
}
