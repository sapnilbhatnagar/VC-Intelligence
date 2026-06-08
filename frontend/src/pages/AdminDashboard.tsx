import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Tooltip, Alert, Skeleton, Badge,
} from '@mui/material';
import {
  People, BarChart, CheckCircle, Error, Pause, CreditCard,
  Warning, TrendingUp, Add, Edit, Delete, Refresh,
  PersonAdd, AdminPanelSettings, Timeline, MonetizationOn,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminStats, getAdminUsers, getAdminAnalyses, getAdminCreditTransactions,
  grantUserCredits, adminUpdateUser, adminCreateUser, adminDeleteUser, deleteAnalysis,
} from '../api/client';
import type { AdminUser, AdminAnalysis, CreditTransaction, AdminStats } from '../types';
import { TOKENS, RECOMMENDATION_COLORS } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_COLORS: Record<string, string> = {
  completed: TOKENS.success, running: TOKENS.info, paused: TOKENS.warning,
  failed: TOKENS.error, pending: '#9A9388',
};

const REC_COLORS: Record<string, string> = {
  'STRONG BUY': RECOMMENDATION_COLORS['STRONG BUY'].bg,
  'BUY': RECOMMENDATION_COLORS.BUY.bg,
  'HOLD': RECOMMENDATION_COLORS.HOLD.bg,
  'PASS': RECOMMENDATION_COLORS.PASS.bg,
  'STRONG PASS': RECOMMENDATION_COLORS['STRONG PASS'].bg,
};

const TX_COLORS: Record<string, string> = {
  purchase: TOKENS.success, admin_grant: TOKENS.info, admin_set: TOKENS.brand,
  usage: TOKENS.error, signup_bonus: TOKENS.warning,
};

// ── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  subtitle?: string;
}

function StatCard({ label, value, icon, color, loading, subtitle }: StatCardProps) {
  return (
    <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={40} />
            ) : (
              <Typography variant="h4" fontWeight={700} color="text.primary" mt={0.5}>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, color, width: 44, height: 44 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Tab Panel ──────────────────────────────────────────────────────────────

function TabPanel({
  children, value, index,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
}) {
  return value === index ? <Box pt={3}>{children}</Box> : null;
}

// ── Create User Dialog ─────────────────────────────────────────────────────

function CreateUserDialog({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [credits, setCredits] = useState(5);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminCreateUser({ email, password, role, credits }),
    onSuccess: () => {
      onCreated();
      onClose();
      setEmail('');
      setPassword('');
      setRole('user');
      setCredits(5);
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="create-user-title">
      <DialogTitle id="create-user-title">Create User</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          fullWidth
          size="small"
          type="email"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          size="small"
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Role</InputLabel>
          <Select
            value={role}
            label="Role"
            onChange={e => setRole(e.target.value as 'user' | 'admin')}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Initial Credits"
          type="number"
          value={credits}
          onChange={e => setCredits(Number(e.target.value))}
          fullWidth
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={!email || !password || mutation.isPending}
        >
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Grant Credits Dialog ───────────────────────────────────────────────────

function GrantCreditsDialog({
  user, open, onClose, onDone,
}: {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(10);
  const mutation = useMutation({
    mutationFn: () => grantUserCredits(user!.id, amount),
    onSuccess: () => { onDone(); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="grant-credits-title">
      <DialogTitle id="grant-credits-title">Grant Credits — {user?.email}</DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <TextField
          label="Credits to Add"
          type="number"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          fullWidth
          size="small"
          inputProps={{ min: 1 }}
        />
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Current balance: {user?.credits ?? 0} credits
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={amount < 1 || mutation.isPending}
        >
          {mutation.isPending ? 'Granting…' : `Grant ${amount} Credits`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete User Dialog ─────────────────────────────────────────────────────

function DeleteUserDialog({
  user, open, onClose, onDone,
}: {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => adminDeleteUser(user!.id),
    onSuccess: () => { onDone(); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="delete-user-title">
      <DialogTitle id="delete-user-title">Delete User?</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete <strong>{user?.email}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({
  stats, statsLoading, users, usersLoading,
}: {
  stats?: AdminStats;
  statsLoading: boolean;
  users: AdminUser[];
  usersLoading: boolean;
}) {
  const recentLogins = [...users]
    .filter(u => u.last_login_at)
    .sort((a, b) => new Date(b.last_login_at!).getTime() - new Date(a.last_login_at!).getTime())
    .slice(0, 8);

  const lowCreditUsers = users.filter(u => u.role === 'user' && u.credits <= 2).slice(0, 8);

  return (
    <Box>
      {/* Primary stats row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="Total Users"
            value={stats?.total_users ?? 0}
            icon={<People fontSize="small" />}
            color={TOKENS.info}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="New Today"
            value={stats?.new_users_today ?? 0}
            icon={<PersonAdd fontSize="small" />}
            color={TOKENS.success}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="Total Analyses"
            value={stats?.total_analyses ?? 0}
            icon={<BarChart fontSize="small" />}
            color={TOKENS.brand}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="Completed"
            value={stats?.completed_analyses ?? 0}
            icon={<CheckCircle fontSize="small" />}
            color={TOKENS.success}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="Credits in Use"
            value={stats?.total_credits_in_circulation ?? 0}
            icon={<CreditCard fontSize="small" />}
            color={TOKENS.warning}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="Low Credit Users"
            value={stats?.users_low_credits ?? 0}
            icon={<Warning fontSize="small" />}
            color={TOKENS.error}
            loading={statsLoading}
            subtitle="2 credits or fewer"
          />
        </Grid>
      </Grid>

      {/* Pipeline status row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Running Now"
            value={stats?.running_analyses ?? 0}
            icon={<Timeline fontSize="small" />}
            color={TOKENS.info}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Paused"
            value={stats?.paused_analyses ?? 0}
            icon={<Pause fontSize="small" />}
            color={TOKENS.warning}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Failed"
            value={stats?.failed_analyses ?? 0}
            icon={<Error fontSize="small" />}
            color={TOKENS.error}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Analyses Today"
            value={stats?.analyses_today ?? 0}
            icon={<TrendingUp fontSize="small" />}
            color={TOKENS.brand}
            loading={statsLoading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Logins */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Recent Logins
              </Typography>
              {usersLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} height={40} sx={{ mb: 1 }} />)
              ) : recentLogins.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No logins recorded yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small" aria-label="Recent logins">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          User
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Last Seen
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Credits
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentLogins.map(u => (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{u.email}</Typography>
                              {u.name && (
                                <Typography variant="caption" color="text.secondary">{u.name}</Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={fmtDate(u.last_login_at)}>
                              <Typography variant="body2" color="text.secondary">
                                {timeAgo(u.last_login_at)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.credits}
                              size="small"
                              color={u.credits <= 2 ? 'error' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Low Credit Users */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>Low Credit Users</Typography>
                <Chip label="Need top-up" size="small" color="warning" />
              </Box>
              {usersLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} height={40} sx={{ mb: 1 }} />)
              ) : lowCreditUsers.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No users with low credits.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small" aria-label="Low credit users">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          User
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Credits
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Last Active
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lowCreditUsers.map(u => (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{u.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${u.credits} left`}
                              size="small"
                              color={u.credits === 0 ? 'error' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {timeAgo(u.last_login_at)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab({
  users, loading, onRefresh,
}: {
  users: AdminUser[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [editingCredits, setEditingCredits] = useState<{ id: string; val: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ email: string; role: string; credits: number }> }) =>
      adminUpdateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const saveCredits = (user: AdminUser) => {
    const val = parseInt(editingCredits?.val ?? '0');
    if (!isNaN(val) && val >= 0) {
      updateMutation.mutate({ id: user.id, data: { credits: val } });
    }
    setEditingCredits(null);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>All Users ({users.length})</Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={onRefresh} size="small" aria-label="Refresh users">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            size="small"
            onClick={() => setCreateOpen(true)}
          >
            Create User
          </Button>
        </Box>
      </Box>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table size="small" aria-label="Users management table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Credits</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Login</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        sx={{
                          width: 32, height: 32,
                          bgcolor: user.role === 'admin' ? `${TOKENS.info}20` : `${TOKENS.textSecondary}20`,
                          color: user.role === 'admin' ? TOKENS.info : TOKENS.textSecondary,
                          fontSize: '0.75rem', fontWeight: 700,
                        }}
                      >
                        {user.email[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{user.email}</Typography>
                        {(user.name || user.username) && (
                          <Typography variant="caption" color="text.secondary">
                            {user.name || user.username}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      icon={
                        user.role === 'admin'
                          ? <AdminPanelSettings sx={{ fontSize: '14px !important' }} />
                          : undefined
                      }
                      sx={{
                        bgcolor: user.role === 'admin' ? `${TOKENS.info}20` : `${TOKENS.textSecondary}20`,
                        color: user.role === 'admin' ? TOKENS.info : TOKENS.textSecondary,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {editingCredits?.id === user.id ? (
                      <Box display="flex" gap={0.5} alignItems="center">
                        <TextField
                          size="small"
                          value={editingCredits.val}
                          onChange={e => setEditingCredits({ id: user.id, val: e.target.value })}
                          sx={{ width: 70 }}
                          inputProps={{ min: 0, 'aria-label': 'Credits amount' }}
                          type="number"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveCredits(user);
                            if (e.key === 'Escape') setEditingCredits(null);
                          }}
                        />
                        <Button size="small" onClick={() => saveCredits(user)}>Save</Button>
                        <Button size="small" onClick={() => setEditingCredits(null)}>Cancel</Button>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Chip
                          label={user.credits === 999999 ? 'Unlimited' : user.credits}
                          size="small"
                          color={user.credits === 0 ? 'error' : user.credits <= 2 ? 'warning' : 'default'}
                        />
                        {user.role !== 'admin' && (
                          <IconButton
                            size="small"
                            onClick={() => setEditingCredits({ id: user.id, val: String(user.credits) })}
                            aria-label={`Edit credits for ${user.email}`}
                          >
                            <Edit sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={fmtDate(user.last_login_at)}>
                      <Typography variant="body2" color="text.secondary">
                        {timeAgo(user.last_login_at)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {fmtDate(user.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Grant Credits">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setGrantUser(user)}
                          aria-label={`Grant credits to ${user.email}`}
                        >
                          <MonetizationOn sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      {user.role !== 'admin' && (
                        <Tooltip title="Delete User">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteUser(user)}
                            aria-label={`Delete user ${user.email}`}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
      />
      <GrantCreditsDialog
        user={grantUser}
        open={!!grantUser}
        onClose={() => setGrantUser(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          queryClient.invalidateQueries({ queryKey: ['admin-credit-transactions'] });
        }}
      />
      <DeleteUserDialog
        user={deleteUser}
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }}
      />
    </Box>
  );
}

// ── Analyses Tab ───────────────────────────────────────────────────────────

function AnalysesTab({
  analyses, loading, onRefresh,
}: {
  analyses: AdminAnalysis[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => deleteAnalysis(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-analyses'] }),
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>All Analyses ({analyses.length})</Typography>
        <IconButton onClick={onRefresh} size="small" aria-label="Refresh analyses">
          <Refresh />
        </IconButton>
      </Box>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table size="small" aria-label="All analyses table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recommendation</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Risk</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6, 7].map(j => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : analyses.map(a => (
                <TableRow key={a.job_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{a.company_input}</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {a.job_id.slice(0, 8)}…
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={a.status}
                      size="small"
                      sx={{
                        bgcolor: `${STATUS_COLORS[a.status] || '#6B7280'}20`,
                        color: STATUS_COLORS[a.status] || '#6B7280',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {a.recommendation ? (
                      <Chip
                        label={a.recommendation}
                        size="small"
                        sx={{
                          bgcolor: `${REC_COLORS[a.recommendation] || '#6B7280'}20`,
                          color: REC_COLORS[a.recommendation] || '#6B7280',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                        }}
                      />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {a.risk_score != null ? (
                      <Chip
                        label={`${a.risk_score}/10`}
                        size="small"
                        color={a.risk_score >= 7 ? 'error' : a.risk_score >= 5 ? 'warning' : 'success'}
                      />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{a.current_stage}/8</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {timeAgo(a.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Delete Analysis">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteMutation.mutate(a.job_id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete analysis for ${a.company_input}`}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

// ── Credit Activity Tab ────────────────────────────────────────────────────

function CreditActivityTab({
  transactions, loading, onRefresh,
}: {
  transactions: CreditTransaction[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const totalGranted = transactions
    .filter(t => ['admin_grant', 'purchase', 'signup_bonus'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0);

  const totalUsed = transactions
    .filter(t => t.type === 'usage')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const purchases = transactions.filter(t => t.type === 'purchase');

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Credit Activity</Typography>
        <IconButton onClick={onRefresh} size="small" aria-label="Refresh credit transactions">
          <Refresh />
        </IconButton>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Total Transactions"
            value={transactions.length}
            icon={<Timeline fontSize="small" />}
            color={TOKENS.brand}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Credits Issued"
            value={totalGranted}
            icon={<Add fontSize="small" />}
            color={TOKENS.success}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Credits Used"
            value={totalUsed}
            icon={<TrendingUp fontSize="small" />}
            color={TOKENS.error}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Purchases"
            value={purchases.length}
            icon={<MonetizationOn fontSize="small" />}
            color={TOKENS.warning}
          />
        </Grid>
      </Grid>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table size="small" aria-label="Credit transactions table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5].map(j => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No credit transactions recorded yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : transactions.map(tx => (
                <TableRow key={tx.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {tx.user_email || tx.user_id.slice(0, 8)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tx.type.replace(/_/g, ' ')}
                      size="small"
                      sx={{
                        bgcolor: `${TX_COLORS[tx.type] || '#6B7280'}20`,
                        color: TX_COLORS[tx.type] || '#6B7280',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color={tx.amount > 0 ? 'success.main' : 'error.main'}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {tx.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={fmtDate(tx.created_at)}>
                      <Typography variant="body2" color="text.secondary">
                        {timeAgo(tx.created_at)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState(0);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30000,
  });

  const {
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    refetchInterval: 30000,
  });

  const {
    data: analyses = [],
    isLoading: analysesLoading,
    refetch: refetchAnalyses,
  } = useQuery({
    queryKey: ['admin-analyses'],
    queryFn: getAdminAnalyses,
    refetchInterval: 30000,
  });

  const {
    data: transactions = [],
    isLoading: txLoading,
    refetch: refetchTx,
  } = useQuery({
    queryKey: ['admin-credit-transactions'],
    queryFn: getAdminCreditTransactions,
    refetchInterval: 30000,
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Avatar sx={{ bgcolor: `${TOKENS.info}20`, color: TOKENS.info, width: 48, height: 48 }}>
          <AdminPanelSettings />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>Admin Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users, credits, and platform activity
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        aria-label="Admin dashboard sections"
      >
        <Tab label="Overview" id="admin-tab-0" aria-controls="admin-tabpanel-0" />
        <Tab
          id="admin-tab-1"
          aria-controls="admin-tabpanel-1"
          label={
            <Badge badgeContent={stats?.users_low_credits || 0} color="warning" max={99}>
              <Box sx={{ pr: stats?.users_low_credits ? 1.5 : 0 }}>Users</Box>
            </Badge>
          }
        />
        <Tab
          id="admin-tab-2"
          aria-controls="admin-tabpanel-2"
          label={
            <Badge badgeContent={stats?.running_analyses || 0} color="primary" max={99}>
              <Box sx={{ pr: stats?.running_analyses ? 1.5 : 0 }}>Analyses</Box>
            </Badge>
          }
        />
        <Tab label="Credit Activity" id="admin-tab-3" aria-controls="admin-tabpanel-3" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <OverviewTab
          stats={stats}
          statsLoading={statsLoading}
          users={users}
          usersLoading={usersLoading}
        />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <UsersTab
          users={users}
          loading={usersLoading}
          onRefresh={() => refetchUsers()}
        />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <AnalysesTab
          analyses={analyses}
          loading={analysesLoading}
          onRefresh={() => refetchAnalyses()}
        />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <CreditActivityTab
          transactions={transactions}
          loading={txLoading}
          onRefresh={() => refetchTx()}
        />
      </TabPanel>
    </Box>
  );
}
