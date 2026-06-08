import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  alpha,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Paper,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AnalysisForm from '../components/analysis/AnalysisForm';
import { getHistory } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { RECOMMENDATION_COLORS, riskColor, TOKENS, MONO } from '../theme';
import type { HistoryItem } from '../types';

const PIPELINE_STAGES = [
  'Company research',
  'Market analysis',
  'Financial model',
  'Risk assessment',
  'Comparable deals',
  'Investor memo',
  'Investor report',
  'Visual summary',
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================
// Apple-style stat tile (one can be a featured navy tile)
// ============================================================
interface StatTileProps {
  icon: React.ReactElement;
  label: string;
  value: React.ReactNode;
  color: string;
  loading: boolean;
  featured?: boolean;
  pulse?: boolean;
}

function StatTile({ icon, label, value, color, loading, featured = false, pulse = false }: StatTileProps) {
  return (
    <Box
      sx={{
        height: '100%',
        p: 2.5,
        borderRadius: '20px',
        border: '1px solid',
        borderColor: featured ? 'transparent' : 'divider',
        background: featured
          ? 'linear-gradient(150deg, #14146A 0%, #0E0E52 60%, #0B0B40 100%)'
          : (t) => t.palette.background.paper,
        color: featured ? '#FFFFFF' : 'inherit',
        boxShadow: featured ? '0 16px 40px rgba(14,14,82,0.30)' : '0 1px 3px rgba(19,33,27,0.05)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: featured ? '0 22px 52px rgba(14,14,82,0.36)' : '0 10px 26px rgba(19,33,27,0.10)' },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {featured && (
        <Box
          aria-hidden="true"
          sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 70% at 85% 10%, rgba(28,124,84,0.34) 0%, transparent 70%)', pointerEvents: 'none' }}
        />
      )}
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: featured ? 'rgba(255,255,255,0.14)' : alpha(color, 0.12),
            color: featured ? '#FFFFFF' : color,
          }}
          aria-hidden="true"
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: '0.64rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: featured ? 'rgba(255,255,255,0.7)' : 'text.secondary',
          }}
        >
          {label}
        </Typography>
        {pulse && (
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: featured ? '#FFFFFF' : color,
              ml: 'auto',
              animation: 'statPulse 1.6s ease-in-out infinite',
              '@keyframes statPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
            }}
          />
        )}
      </Box>
      {loading ? (
        <Skeleton width={56} height={36} sx={{ bgcolor: featured ? 'rgba(255,255,255,0.18)' : undefined }} />
      ) : (
        <Typography sx={{ position: 'relative', fontFamily: MONO, fontWeight: 650, fontSize: '2rem', lineHeight: 1 }}>
          {value}
        </Typography>
      )}
    </Box>
  );
}

// ============================================================
// Futuristic navy pipeline feature card
// ============================================================
function FeaturePipelineCard() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        p: 3,
        color: '#FFFFFF',
        background: 'linear-gradient(160deg, #15156E 0%, #0E0E52 55%, #0B0B3E 100%)',
        boxShadow: '0 18px 48px rgba(14,14,82,0.30)',
      }}
      role="region"
      aria-label="8-stage AI pipeline"
    >
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(55% 50% at 90% 0%, rgba(28,124,84,0.34) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <AutoAwesomeIcon sx={{ fontSize: 16, color: '#7CE0B0' }} />
          <Typography sx={{ fontFamily: MONO, fontSize: '0.64rem', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.7)' }}>
            8-STAGE AI PIPELINE
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em', mb: 2 }}>
          Institutional diligence, automated.
        </Typography>

        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {PIPELINE_STAGES.map((name, i) => (
            <Box key={name} component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.4 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '7px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  fontFamily: MONO,
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  color: '#9FE8C4',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </Box>
              <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.92)' }}>{name}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 2, pt: 1.75, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>Full 5 cr</Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>Quick 1 cr</Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>Custom 1–4 cr</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ============================================================
// Recommendation mix — stacked distribution bar
// ============================================================
function RecommendationMix({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const order = ['STRONG BUY', 'BUY', 'HOLD', 'PASS', 'STRONG PASS'] as const;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) {
      if (it.status === 'completed' && it.recommendation) c[it.recommendation] = (c[it.recommendation] ?? 0) + 1;
    }
    return c;
  }, [items]);
  const total = order.reduce((s, k) => s + (counts[k] ?? 0), 0);

  return (
    <Box sx={{ p: 2.5, borderRadius: '20px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
        Recommendation mix
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={14} sx={{ borderRadius: 7 }} />
      ) : total === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          No completed verdicts yet.
        </Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', gap: '2px' }}>
            {order.map((k) => {
              const n = counts[k] ?? 0;
              if (n === 0) return null;
              return (
                <Box
                  key={k}
                  sx={{ flex: n, backgroundColor: RECOMMENDATION_COLORS[k].bg }}
                  aria-label={`${k}: ${n}`}
                  title={`${k}: ${n}`}
                />
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
            {order.filter((k) => (counts[k] ?? 0) > 0).map((k) => (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '3px', backgroundColor: RECOMMENDATION_COLORS[k].bg }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                  {k} · {counts[k]}
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
// Active jobs panel
// ============================================================
function ActiveJobsPanel({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const navigate = useNavigate();
  const active = items.filter((i) => i.status === 'running' || i.status === 'paused' || i.status === 'pending');

  return (
    <Box sx={{ p: 2.5, borderRadius: '20px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <AutorenewIcon fontSize="small" sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Active jobs</Typography>
        {active.length > 0 && (
          <Chip label={active.length} size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem', fontWeight: 700, backgroundColor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main' }} />
        )}
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: 2.5 }} />)}
        </Box>
      ) : active.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', py: 2 }}>
          No active jobs
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {active.map((item) => (
            <Box key={item.job_id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.company_input}
                </Typography>
                <Chip label={item.status} size="small" color={item.status === 'running' ? 'primary' : item.status === 'paused' ? 'warning' : 'default'} sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, mt: 0.25 }} />
              </Box>
              <Button size="small" variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />} onClick={() => navigate(`/job/${item.job_id}`)} sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 0, flexShrink: 0 }}>
                View
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ============================================================
// Recent analyses table
// ============================================================
function RecentAnalysesTable({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const navigate = useNavigate();
  const recent = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    [items],
  );

  const statusColor = (s: string) => (s === 'completed' ? 'success' : s === 'failed' ? 'error' : s === 'running' ? 'info' : s === 'paused' ? 'warning' : 'default');

  if (!loading && recent.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '20px', backgroundColor: 'background.paper' }}>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>No analyses yet — start your first above.</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', backgroundColor: 'background.paper', borderRadius: '20px' }}>
      <Table size="small" aria-label="Recent analyses">
        <TableHead>
          <TableRow>
            {['Company', 'Status', 'Recommendation', 'Risk', 'Date', ''].map((col) => (
              <TableCell key={col} sx={{ fontSize: '0.66rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', borderColor: 'divider', py: 1.25, px: 2, whiteSpace: 'nowrap' }}>
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5].map((j) => <TableCell key={j} sx={{ py: 1.25, px: 2 }}><Skeleton height={20} /></TableCell>)}
                </TableRow>
              ))
            : recent.map((item) => {
                const recoStyle = item.recommendation ? RECOMMENDATION_COLORS[item.recommendation] : null;
                return (
                  <TableRow key={item.job_id} hover onClick={() => navigate(`/job/${item.job_id}`)} sx={{ cursor: 'pointer', '&:last-child td': { border: 0 }, '&:hover': { backgroundColor: (t) => alpha(t.palette.primary.main, 0.04) } }}>
                    <TableCell sx={{ py: 1.25, px: 2, maxWidth: 180, borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {item.company_input}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, borderColor: 'divider' }}>
                      <Chip label={item.status} size="small" color={statusColor(item.status) as 'success' | 'error' | 'info' | 'warning' | 'default'} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, borderColor: 'divider' }}>
                      {recoStyle && item.recommendation ? (
                        <Chip label={item.recommendation} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: recoStyle.bg, color: recoStyle.text }} />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, borderColor: 'divider' }}>
                      {item.risk_score !== null ? (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: riskColor(item.risk_score) }}>
                          {item.risk_score.toFixed(1)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, whiteSpace: 'nowrap', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
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
  const completedCount = history.filter((i) => i.status === 'completed').length;
  const runningCount = history.filter((i) => i.status === 'running').length;

  const topPick = useMemo<string>(() => {
    const completed = history.filter((i) => i.status === 'completed' && i.recommendation);
    if (completed.length === 0) return 'None yet';
    const freq: Record<string, number> = {};
    for (const item of completed) if (item.recommendation) freq[item.recommendation] = (freq[item.recommendation] ?? 0) + 1;
    return Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0];
  }, [history]);

  const greeting = getGreeting();
  const userName = user?.name?.trim() || user?.username?.trim() || user?.email?.split('@')[0] || null;

  return (
    <Box sx={{ maxWidth: 1320, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: '0.12em' }}>Dashboard</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.1rem' }, mb: 0.5 }}>
          {greeting}
          {userName && (<>, <Box component="span" sx={{ color: 'primary.main' }}>{userName}</Box></>)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Turn a company name into an institutional-grade due-diligence package.
        </Typography>
      </Box>

      {/* Stat tiles */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} lg={3}>
          <StatTile icon={<StorageIcon fontSize="small" />} label="Total analyses" value={totalCount} color={TOKENS.info} loading={isLoading} />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatTile icon={<CheckCircleOutlineIcon fontSize="small" />} label="Completed" value={completedCount} color={TOKENS.success} loading={isLoading} />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatTile icon={<AutorenewIcon fontSize="small" />} label="Running now" value={runningCount} color={TOKENS.warning} loading={isLoading} pulse={runningCount > 0} />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatTile
            icon={<TrendingUpIcon fontSize="small" />}
            label="Top pick"
            featured
            color={TOKENS.brand}
            loading={isLoading}
            value={
              topPick === 'None yet'
                ? <Typography component="span" sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontFamily: MONO }}>None yet</Typography>
                : <Typography component="span" sx={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: MONO, color: '#9FE8C4' }}>{topPick}</Typography>
            }
          />
        </Grid>
      </Grid>

      {/* Main grid */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <AnalysisForm />
        </Grid>
        <Grid item xs={12} lg={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FeaturePipelineCard />
            <RecommendationMix items={history} loading={isLoading} />
            <ActiveJobsPanel items={history} loading={isLoading} />
          </Box>
        </Grid>
      </Grid>

      {/* Recent analyses */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: '0.12em' }}>Recent analyses</Typography>
          {history.length > 6 && (
            <Button size="small" endIcon={<ArrowForwardIcon fontSize="small" />} onClick={() => navigate('/history')} sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
              View all
            </Button>
          )}
        </Box>
        <RecentAnalysesTable items={history} loading={isLoading} />
      </Box>
    </Box>
  );
}
