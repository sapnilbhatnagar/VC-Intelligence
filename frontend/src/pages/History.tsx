import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Alert,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryTable from '../components/history/HistoryTable';
import { getMyAnalyses, deleteAnalysis } from '../api/client';
import type { JobStatus } from '../types';

const STATUS_OPTIONS: Array<{ value: JobStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
];

// ============================================================
// Delete confirmation dialog
// ============================================================
interface DeleteDialogProps {
  jobId: string | null;
  companyName: string;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}

function DeleteDialog({ jobId, companyName, onClose, onConfirm, deleting }: DeleteDialogProps) {
  return (
    <Dialog
      open={jobId !== null}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="delete-analysis-title"
    >
      <DialogTitle id="delete-analysis-title">Delete Analysis</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Delete the analysis for <strong>{companyName}</strong>? This cannot be undone.
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
          aria-label="Confirm delete"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// Page
// ============================================================
export default function History() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ jobId: string; company: string } | null>(null);

  const {
    data: history = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-analyses'],
    queryFn: getMyAnalyses,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => deleteAnalysis(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-analyses'] });
      setDeleteTarget(null);
    },
  });

  // Filtered history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.company_input.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [history, searchQuery, statusFilter]);

  const handleDeleteClick = (jobId: string, company: string) => {
    setDeleteTarget({ jobId, company });
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.jobId);
    }
  };

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
      {/* ── Page Header ───────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HistoryIcon sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h2" sx={{ fontSize: '1.375rem' }}>
              Analysis History
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {isLoading
                ? 'Loading...'
                : `${filteredHistory.length} of ${history.length} ${history.length === 1 ? 'analysis' : 'analyses'}`}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => refetch()}
            aria-label="Refresh history"
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => navigate('/')}
            aria-label="Start new analysis"
          >
            New Analysis
          </Button>
        </Box>
      </Box>

      {/* ── Search + Filter bar ───────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          placeholder="Search by company name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: '1 1 240px', maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          inputProps={{ 'aria-label': 'Search analyses by company name' }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="status-filter-label">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FilterListIcon sx={{ fontSize: '0.875rem' }} />
              Status
            </Box>
          </InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FilterListIcon sx={{ fontSize: '0.875rem' }} />
                Status
              </Box>
            }
            onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'all')}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* ── Error state ───────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load history. Is the backend running at localhost:8000?
        </Alert>
      )}

      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to delete analysis. Please try again.
        </Alert>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      <HistoryTable
        rows={filteredHistory}
        loading={isLoading}
        onDelete={handleDeleteClick}
      />

      {/* ── Delete confirmation dialog ─────────────────────── */}
      <DeleteDialog
        jobId={deleteTarget?.jobId ?? null}
        companyName={deleteTarget?.company ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        deleting={deleteMutation.isPending}
      />
    </Box>
  );
}
