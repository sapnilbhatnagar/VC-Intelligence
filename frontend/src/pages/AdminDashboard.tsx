import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Tooltip,
  alpha,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  getAdminStats,
  getAdminUsers,
  getAdminAnalyses,
  setUserCredits,
  grantUserCredits,
  adminUpdateUser,
  adminCreateUser,
  adminDeleteUser,
} from '../api/client';
import type { AdminUser, AdminAnalysis, AdminStats, RecommendationType } from '../types';

// ============================================================
// Recommendation colors
// ============================================================
const RECO_COLOR: Record<RecommendationType, string> = {
  'STRONG BUY': '#10B981',
  BUY: '#3B82F6',
  HOLD: '#F59E0B',
  PASS: '#EF4444',
  'STRONG PASS': '#7F1D1D',
};

// ============================================================
// Stat card
// ============================================================
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  loading: boolean;
  color: string;
}

function StatCard({ icon, label, value, loading, color }: StatCardProps) {
  return (
    <Card sx={{ flex: '1 1 180px' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              backgroundColor: alpha(color, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={60} height={28} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {value?.toLocaleString() ?? '—'}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Add Credits Dialog
// ============================================================
interface AddCreditsDialogProps {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AddCreditsDialog({ user, onClose, onSuccess }: AddCreditsDialogProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>('10');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ userId, amt }: { userId: string; amt: number }) =>
      grantUserCredits(userId, amt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = () => {
    const parsed = parseInt(amount, 10);
    if (!parsed || parsed < 1) {
      setError('Enter a positive amount');
      return;
    }
    if (!user) return;
    setError(null);
    mutation.mutate({ userId: user.id, amt: parsed });
  };

  return (
    <Dialog
      open={user !== null}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="add-credits-title"
    >
      <DialogTitle id="add-credits-title">
        Add Credits — {user?.email}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <TextField
          label="Credits to add"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          autoFocus
          inputProps={{ min: 1, step: 1 }}
          sx={{ mt: 1 }}
        />
        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1, display: 'block' }}>
          Current balance: {user?.credits ?? 0} credits
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Adding...' : 'Add Credits'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// Delete user confirmation dialog
// ============================================================
interface DeleteUserDialogProps {
  user: AdminUser | null;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}

function DeleteUserDialog({ user, onClose, onConfirm, deleting }: DeleteUserDialogProps) {
  return (
    <Dialog
      open={user !== null}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="delete-user-title"
    >
      <DialogTitle id="delete-user-title">Delete User</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Permanently delete <strong>{user?.email}</strong>? This cannot be undone and will remove all their data.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={deleting}
          aria-label="Confirm delete user"
        >
          {deleting ? 'Deleting...' : 'Delete User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// Create user dialog
// ============================================================
interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateUserDialog({ open, onClose, onSuccess }: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [credits, setCredits] = useState<string>('5');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      adminCreateUser({
        email: email.trim(),
        password,
        role,
        credits: parseInt(credits, 10) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      onSuccess();
      onClose();
      setEmail('');
      setPassword('');
      setRole('user');
      setCredits('5');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="create-user-title"
    >
      <DialogTitle id="create-user-title">Create New User</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ 'aria-label': 'User email address' }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            helperText="Minimum 6 characters"
            inputProps={{ 'aria-label': 'User password' }}
          />
          <FormControl fullWidth>
            <InputLabel id="create-role-label">Role</InputLabel>
            <Select
              labelId="create-role-label"
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Starting credits"
            type="number"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            fullWidth
            inputProps={{ min: 0, step: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          startIcon={<AddIcon />}
        >
          {mutation.isPending ? 'Creating...' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// Inline editable credit cell
// ============================================================
interface CreditCellProps {
  user: AdminUser;
  onSaved: () => void;
}

function CreditCell({ user, onSaved }: CreditCellProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(String(user.credits));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (credits: number) => setUserCredits(user.id, credits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditing(false);
      onSaved();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSave = () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      setError('Invalid value');
      return;
    }
    setError(null);
    mutation.mutate(parsed);
  };

  if (!editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {user.credits}
        </Typography>
        <Tooltip title="Edit credits" arrow>
          <IconButton
            size="small"
            onClick={() => {
              setValue(String(user.credits));
              setEditing(true);
            }}
            aria-label={`Edit credits for ${user.email}`}
          >
            <EditIcon sx={{ fontSize: '0.875rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="number"
        size="small"
        error={!!error}
        inputProps={{ min: 0, style: { width: 70, padding: '4px 8px' } }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setEditing(false);
        }}
        autoFocus
        aria-label="Credit amount"
      />
      <Tooltip title="Save" arrow>
        <IconButton
          size="small"
          onClick={handleSave}
          disabled={mutation.isPending}
          color="primary"
          aria-label="Save credits"
        >
          <SaveIcon sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Cancel" arrow>
        <IconButton
          size="small"
          onClick={() => setEditing(false)}
          aria-label="Cancel edit"
        >
          <CloseIcon sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ============================================================
// Inline editable email cell
// ============================================================
interface EmailCellProps {
  user: AdminUser;
  onSaved: () => void;
}

function EmailCell({ user, onSaved }: EmailCellProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.email);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (email: string) => adminUpdateUser(user.id, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditing(false);
      onSaved();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSave = () => {
    if (!value.trim() || !value.includes('@')) {
      setError('Invalid email');
      return;
    }
    setError(null);
    mutation.mutate(value.trim());
  };

  if (!editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {user.email}
        </Typography>
        <Tooltip title="Edit email" arrow>
          <IconButton
            size="small"
            onClick={() => {
              setValue(user.email);
              setEditing(true);
            }}
            aria-label={`Edit email for ${user.email}`}
          >
            <EditIcon sx={{ fontSize: '0.875rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="email"
        size="small"
        error={!!error}
        helperText={error ?? undefined}
        inputProps={{ style: { padding: '4px 8px' }, 'aria-label': 'Email address' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setEditing(false);
        }}
        autoFocus
        sx={{ minWidth: 200 }}
      />
      <Tooltip title="Save" arrow>
        <IconButton
          size="small"
          onClick={handleSave}
          disabled={mutation.isPending}
          color="primary"
          aria-label="Save email"
        >
          <SaveIcon sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Cancel" arrow>
        <IconButton size="small" onClick={() => setEditing(false)} aria-label="Cancel edit">
          <CloseIcon sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ============================================================
// Role selector cell
// ============================================================
interface RoleCellProps {
  user: AdminUser;
  onSaved: () => void;
}

function RoleCell({ user, onSaved }: RoleCellProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (role: string) => adminUpdateUser(user.id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSaved();
    },
  });

  const handleChange = (newRole: string) => {
    mutation.mutate(newRole);
  };

  return (
    <Select
      value={user.role}
      onChange={(e) => handleChange(e.target.value)}
      size="small"
      disabled={mutation.isPending}
      aria-label={`Role for ${user.email}`}
      sx={{ minWidth: 100, fontSize: '0.8rem' }}
      renderValue={(val) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {val === 'admin' ? (
            <AdminPanelSettingsIcon sx={{ fontSize: '0.875rem', color: 'info.main' }} />
          ) : (
            <PersonIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
          )}
          <Chip
            label={val.toUpperCase()}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.6rem',
              fontWeight: 700,
              backgroundColor: (t) =>
                val === 'admin'
                  ? alpha(t.palette.info.main ?? '#0288d1', 0.15)
                  : alpha(t.palette.text.primary, 0.08),
              color: val === 'admin' ? 'info.main' : 'text.secondary',
            }}
          />
        </Box>
      )}
    >
      <MenuItem value="user">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          User
        </Box>
      </MenuItem>
      <MenuItem value="admin">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminPanelSettingsIcon fontSize="small" sx={{ color: 'info.main' }} />
          Admin
        </Box>
      </MenuItem>
    </Select>
  );
}

// ============================================================
// Users Table
// ============================================================
interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  onAddCredits: (user: AdminUser) => void;
  onDeleteUser: (user: AdminUser) => void;
  onCreditSaved: () => void;
}

function UsersTable({ users, loading, onAddCredits, onDeleteUser, onCreditSaved }: UsersTableProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={52} />
        ))}
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small" aria-label="Users table">
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Credits</TableCell>
            <TableCell>Joined</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <EmailCell user={u} onSaved={onCreditSaved} />
                </TableCell>
                <TableCell>
                  <RoleCell user={u} onSaved={onCreditSaved} />
                </TableCell>
                <TableCell>
                  <CreditCell user={u} onSaved={onCreditSaved} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {new Date(u.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="Add credits" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onAddCredits(u)}
                        aria-label={`Add credits to ${u.email}`}
                        color="primary"
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete user" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onDeleteUser(u)}
                        aria-label={`Delete user ${u.email}`}
                        sx={{
                          color: 'text.disabled',
                          '&:hover': { color: 'error.main' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ============================================================
// Analyses Table (collapsible section)
// ============================================================
interface AnalysesTableProps {
  analyses: AdminAnalysis[];
  loading: boolean;
}

function AnalysesTable({ analyses, loading }: AnalysesTableProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  return (
    <Box>
      {/* Section toggle header */}
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
          px: 0,
          userSelect: 'none',
        }}
        role="button"
        aria-expanded={expanded}
        aria-controls="analyses-table-collapse"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ textTransform: 'none', letterSpacing: 0 }}>
            All Analyses
          </Typography>
          <Chip
            label={loading ? '…' : analyses.length}
            size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
          />
        </Box>
        {expanded ? (
          <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        ) : (
          <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        )}
      </Box>

      <Collapse in={expanded} id="analyses-table-collapse">
        <TableContainer sx={{ mt: 1 }}>
          <Table size="small" aria-label="All analyses table">
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Recommendation</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">View</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton variant="text" />
                    </TableCell>
                  </TableRow>
                ))
              ) : analyses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                    No analyses found.
                  </TableCell>
                </TableRow>
              ) : (
                analyses.map((a) => (
                  <TableRow key={a.job_id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {a.company_input}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.status}
                        size="small"
                        color={
                          a.status === 'completed'
                            ? 'success'
                            : a.status === 'failed'
                            ? 'error'
                            : 'primary'
                        }
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {a.current_stage}/8
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {a.recommendation ? (
                        <Chip
                          label={a.recommendation}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            backgroundColor: RECO_COLOR[a.recommendation],
                            color: '#fff',
                          }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {new Date(a.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View job" arrow>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/job/${a.job_id}`)}
                          aria-label={`View analysis for ${a.company_input}`}
                        >
                          <OpenInNewIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Box>
  );
}

// ============================================================
// Page
// ============================================================
export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [addCreditsTarget, setAddCreditsTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    staleTime: 30_000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    staleTime: 30_000,
  });

  const { data: analyses = [], isLoading: analysesLoading } = useQuery<AdminAnalysis[]>({
    queryKey: ['admin-analyses'],
    queryFn: getAdminAnalyses,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeleteTarget(null);
      setSuccessMsg('User deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  const handleCreditSaved = () => {
    setSuccessMsg('Changes saved successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleAddCreditsSuccess = () => {
    setSuccessMsg('Credits added successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const handleCreateSuccess = () => {
    setSuccessMsg('User created successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ mb: 0.5 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Platform-wide management: users, credits, and analyses.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          aria-label="Create new user"
        >
          Create User
        </Button>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* ── Stats row ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
        <StatCard
          icon={<PeopleIcon />}
          label="Total Users"
          value={stats?.total_users ?? null}
          loading={statsLoading}
          color="#3B82F6"
        />
        <StatCard
          icon={<AnalyticsIcon />}
          label="Total Analyses"
          value={stats?.total_analyses ?? null}
          loading={statsLoading}
          color="#6366F1"
        />
        <StatCard
          icon={<CheckCircleIcon />}
          label="Completed"
          value={stats?.completed_analyses ?? null}
          loading={statsLoading}
          color="#10B981"
        />
      </Box>

      {/* ── Users table ───────────────────────────────────────── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PeopleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="h6" sx={{ textTransform: 'none', letterSpacing: 0 }}>
              Users
            </Typography>
            <Chip
              label={usersLoading ? '…' : users.length}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
            />
          </Box>
          <UsersTable
            users={users}
            loading={usersLoading}
            onAddCredits={(u) => setAddCreditsTarget(u)}
            onDeleteUser={(u) => setDeleteTarget(u)}
            onCreditSaved={handleCreditSaved}
          />
        </CardContent>
      </Card>

      {/* ── Analyses section ──────────────────────────────────── */}
      <Card>
        <CardContent>
          <AnalysesTable analyses={analyses} loading={analysesLoading} />
        </CardContent>
      </Card>

      {/* ── Dialogs ───────────────────────────────────────────── */}
      <AddCreditsDialog
        user={addCreditsTarget}
        onClose={() => setAddCreditsTarget(null)}
        onSuccess={handleAddCreditsSuccess}
      />

      <DeleteUserDialog
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        deleting={deleteMutation.isPending}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
}
