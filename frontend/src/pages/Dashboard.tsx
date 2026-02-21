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
  Card,
  CardContent,
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
import SearchIcon from '@mui/icons-material/Search';
import CalculateIcon from '@mui/icons-material/Calculate';
import ShieldIcon from '@mui/icons-material/Shield';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AnalysisForm from '../components/analysis/AnalysisForm';
import { getHistory } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { HistoryItem, RecommendationType } from '../types';

// ============================================================
// Constants
// ============================================================
const RECO_STYLE: Record<RecommendationType, { bg: string; text: string }> = {
  'STRONG BUY': { bg: '#10B981', text: '#fff' },
  BUY: { bg: '#3B82F6', text: '#fff' },
  HOLD: { bg: '#F59E0B', text: '#000' },
  PASS: { bg: '#EF4444', text: '#fff' },
  'STRONG PASS': { bg: '#7F1D1D', text: '#fff' },
};

const PIPELINE_STAGES = [
  { icon: <SearchIcon sx={{ fontSize: 14 }} />, name: 'Company Research', desc: 'Web scraping & data extraction' },
  { icon: <TrendingUpIcon sx={{ fontSize: 14 }} />, name: 'Market Analysis', desc: 'TAM/SAM/SOM + trends' },
  { icon: <CalculateIcon sx={{ fontSize: 14 }} />, name: 'Financial Modeling', desc: 'Revenue projections & metrics' },
  { icon: <ShieldIcon sx={{ fontSize: 14 }} />, name: 'Risk Assessment', desc: 'Risk scoring & mitigation' },
  { icon: <CompareArrowsIcon sx={{ fontSize: 14 }} />, name: 'Comparable Deals', desc: 'Peer benchmarking' },
  { icon: <DescriptionIcon sx={{ fontSize: 14 }} />, name: 'Investor Memo', desc: 'IC-ready investment thesis' },
  { icon: <StorageIcon sx={{ fontSize: 14 }} />, name: 'HTML Report', desc: 'Full formatted report' },
  { icon: <TrendingUpIcon sx={{ fontSize: 14 }} />, name: 'Infographic', desc: 'Visual deal summary' },
];

// ============================================================
// Greeting helper
// ============================================================
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ============================================================
// Hero Stat Card
// ============================================================
interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: React.ReactNode;
  accentColor: string;
  loading: boolean;
  pulse?: boolean;
}

function StatCard({ icon, label, value, accentColor, loading, pulse = false }: StatCardProps) {
  return (
    <Box
      sx={{
        height: '100%',
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.8),
        borderTop: `3px solid ${accentColor}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: accentColor,
          opacity: 0.05,
          transform: 'translate(20px, -20px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1.5,
          color: accentColor,
        }}
        aria-hidden="true"
      >
        {icon}
        {pulse && (
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: accentColor,
              ml: 'auto',
              animation: 'statPulse 1.4s ease-in-out infinite',
              '@keyframes statPulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.4, transform: 'scale(0.8)' },
              },
            }}
          />
        )}
      </Box>
      {loading ? (
        <Skeleton width={48} height={36} />
      ) : (
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1.75rem', lineHeight: 1 }}
        >
          {value}
        </Typography>
      )}
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', mt: 0.5, display: 'block', fontSize: '0.75rem' }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ============================================================
// Active Jobs Panel (right column)
// ============================================================
interface ActiveJobsPanelProps {
  items: HistoryItem[];
  loading: boolean;
}

function ActiveJobsPanel({ items, loading }: ActiveJobsPanelProps) {
  const navigate = useNavigate();
  const activeItems = items.filter(
    (i) => i.status === 'running' || i.status === 'paused' || i.status === 'pending',
  );

  return (
    <Card
      variant="outlined"
      sx={{ borderColor: 'divider', backgroundColor: (t) => alpha(t.palette.background.paper, 0.6), flexShrink: 0 }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <AutorenewIcon fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Active Jobs
          </Typography>
          {activeItems.length > 0 && (
            <Chip
              label={activeItems.length}
              size="small"
              sx={{
                ml: 'auto',
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: (t) => alpha(t.palette.primary.main, 0.15),
                color: 'primary.main',
              }}
            />
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} sx={{ borderRadius: 1.5 }} />
            ))}
          </Box>
        ) : activeItems.length === 0 ? (
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', py: 2 }}
          >
            No active jobs
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activeItems.map((item) => (
              <Box
                key={item.job_id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: (t) => alpha(t.palette.text.primary, 0.02),
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.company_input}
                  </Typography>
                  <Chip
                    label={item.status}
                    size="small"
                    color={
                      item.status === 'running'
                        ? 'primary'
                        : item.status === 'paused'
                        ? 'warning'
                        : 'default'
                    }
                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, mt: 0.25 }}
                  />
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />}
                  onClick={() => navigate(`/job/${item.job_id}`)}
                  aria-label={`View job for ${item.company_input}`}
                  sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 0, flexShrink: 0 }}
                >
                  View
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Platform Capabilities Card (right column)
// ============================================================
function PlatformCard() {
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: 'divider',
        overflow: 'hidden',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.6),
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Gradient header */}
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1a1f35 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}
        >
          8-Stage AI Pipeline
        </Typography>
        <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), fontSize: '0.7rem' }}>
          Full institutional-grade due diligence
        </Typography>
      </Box>

      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          component="ol"
          sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}
          aria-label="8-stage AI analysis pipeline"
        >
          {PIPELINE_STAGES.map((stage, idx) => (
            <Box
              key={stage.name}
              component="li"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 0.75,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: (t) => alpha(t.palette.text.primary, 0.03),
                },
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'primary.main',
                }}
                aria-hidden="true"
              >
                <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'inherit' }}>
                  {idx + 1}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.primary', display: 'block', lineHeight: 1.2 }}
                >
                  {stage.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', fontSize: '0.65rem', lineHeight: 1.2 }}
                >
                  {stage.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
            Full analysis costs 5 credits · Quick screen costs 1 credit
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Recent Analyses Table (left column)
// ============================================================
interface RecentTableProps {
  items: HistoryItem[];
  loading: boolean;
}

function RecentAnalysesTable({ items, loading }: RecentTableProps) {
  const navigate = useNavigate();
  const recent = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [items],
  );

  const statusColor = (status: string) => {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'running') return 'primary';
    if (status === 'paused') return 'warning';
    return 'default';
  };

  if (!loading && recent.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: (t) => alpha(t.palette.text.primary, 0.01),
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          No analyses yet — start your first below
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderColor: 'divider',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.5),
        borderRadius: 2,
      }}
    >
      <Table size="small" aria-label="Recent analyses">
        <TableHead>
          <TableRow>
            {['Company', 'Status', 'Recommendation', 'Risk', 'Date', ''].map((col) => (
              <TableCell
                key={col}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'text.disabled',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1,
                  px: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <TableCell key={j} sx={{ py: 1, px: 1.5 }}>
                      <Skeleton height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : recent.map((item) => {
                const recoStyle = item.recommendation ? RECO_STYLE[item.recommendation] : null;
                return (
                  <TableRow
                    key={item.job_id}
                    hover
                    onClick={() => navigate(`/job/${item.job_id}`)}
                    sx={{
                      cursor: 'pointer',
                      '&:last-child td': { border: 0 },
                      '&:hover': {
                        backgroundColor: (t) => alpha(t.palette.primary.main, 0.04),
                      },
                    }}
                    aria-label={`View analysis for ${item.company_input}`}
                  >
                    {/* Company */}
                    <TableCell sx={{ py: 1, px: 1.5, maxWidth: 160 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {item.company_input}
                      </Typography>
                    </TableCell>

                    {/* Status */}
                    <TableCell sx={{ py: 1, px: 1.5 }}>
                      <Chip
                        label={item.status}
                        size="small"
                        color={statusColor(item.status) as 'success' | 'error' | 'primary' | 'warning' | 'default'}
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                      />
                    </TableCell>

                    {/* Recommendation */}
                    <TableCell sx={{ py: 1, px: 1.5 }}>
                      {recoStyle && item.recommendation ? (
                        <Chip
                          label={item.recommendation}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            backgroundColor: recoStyle.bg,
                            color: recoStyle.text,
                          }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Risk */}
                    <TableCell sx={{ py: 1, px: 1.5 }}>
                      {item.risk_score !== null ? (
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color:
                              item.risk_score <= 3
                                ? 'success.main'
                                : item.risk_score <= 6
                                ? 'warning.main'
                                : 'error.main',
                          }}
                        >
                          {item.risk_score.toFixed(1)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell sx={{ py: 1, px: 1.5, whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </TableCell>

                    {/* Action */}
                    <TableCell sx={{ py: 1, px: 1.5 }}>
                      <ArrowForwardIcon
                        sx={{ fontSize: 14, color: 'text.disabled' }}
                        aria-hidden="true"
                      />
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

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: getHistory,
    staleTime: 30_000,
  });

  // Derived stats
  const totalCount = history.length;
  const completedCount = history.filter((i) => i.status === 'completed').length;
  const runningCount = history.filter((i) => i.status === 'running').length;

  const topPick = useMemo<string>(() => {
    const completed = history.filter((i) => i.status === 'completed' && i.recommendation);
    if (completed.length === 0) return 'None yet';
    const freq: Record<string, number> = {};
    for (const item of completed) {
      if (item.recommendation) {
        freq[item.recommendation] = (freq[item.recommendation] ?? 0) + 1;
      }
    }
    return Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0];
  }, [history]);

  const greeting = getGreeting();
  // Prefer name > username > email prefix
  const userName = user?.name?.trim() || user?.username?.trim() || user?.email?.split('@')[0] || null;

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
      {/* ── Welcome Header ─────────────────────────────────── */}
      <Box sx={{ mb: 4 }} role="banner" aria-label="Dashboard welcome header">
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.12em' }}
        >
          Dashboard
        </Typography>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700, mb: 0.5, lineHeight: 1.2 }}
        >
          {greeting}
          {userName && (
            <>
              {', '}
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(90deg, #3B82F6 0%, #6366F1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {userName}
              </Box>
            </>
          )}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Your AI-powered venture capital due diligence platform
        </Typography>
      </Box>

      {/* ── Hero Stat Cards ─────────────────────────────────── */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 4 }}
        role="region"
        aria-label="Analysis statistics"
      >
        {[
          {
            icon: <StorageIcon fontSize="small" />,
            label: 'Total Analyses',
            value: totalCount,
            accentColor: '#3B82F6',
          },
          {
            icon: <CheckCircleOutlineIcon fontSize="small" />,
            label: 'Completed',
            value: completedCount,
            accentColor: '#10B981',
          },
          {
            icon: <AutorenewIcon fontSize="small" />,
            label: 'Running Now',
            value: runningCount,
            accentColor: '#6366F1',
            pulse: runningCount > 0,
          },
          {
            icon: <TrendingUpIcon fontSize="small" />,
            label: 'Top Pick',
            value:
              topPick === 'None yet' ? (
                <Typography component="span" sx={{ fontSize: '0.9rem', color: 'text.disabled', fontWeight: 500 }}>
                  None yet
                </Typography>
              ) : (
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: topPick.includes('BUY') ? '#10B981' : topPick === 'HOLD' ? '#F59E0B' : '#EF4444',
                  }}
                >
                  {topPick}
                </Typography>
              ),
            accentColor: '#F59E0B',
          },
        ].map((card) => (
          <Grid key={card.label} item xs={6} lg={3}>
            <StatCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              accentColor={card.accentColor}
              loading={isLoading}
              pulse={card.pulse}
            />
          </Grid>
        ))}
      </Grid>

      {/* ── Two-Column Grid ─────────────────────────────────── */}
      <Grid container spacing={3} alignItems="stretch">
        {/* Left column: Form + Table */}
        <Grid item xs={12} lg={8} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="overline"
            sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.12em', display: 'block', mb: 1.5 }}
          >
            New Analysis
          </Typography>

          {/* Analysis form — fills full column width */}
          <AnalysisForm />

          {/* Recent Analyses */}
          <Box sx={{ mt: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
              }}
            >
              <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.12em' }}>
                Recent Analyses
              </Typography>
              {history.length > 5 && (
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon fontSize="small" />}
                  onClick={() => navigate('/history')}
                  sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  View All
                </Button>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <RecentAnalysesTable items={history} loading={isLoading} />
            </Box>
          </Box>
        </Grid>

        {/* Right column: Active Jobs + Platform card — stretches to match left */}
        <Grid item xs={12} lg={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="overline"
            sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.12em', display: 'block', mb: 1.5 }}
          >
            Activity
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}>
            <ActiveJobsPanel items={history} loading={isLoading} />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <PlatformCard />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
