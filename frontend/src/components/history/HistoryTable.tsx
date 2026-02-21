import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Button,
  Typography,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import type { HistoryItem, JobStatus, RecommendationType } from '../../types';

// ============================================================
// Color helpers
// ============================================================
const STATUS_COLORS: Record<JobStatus, { label: string; color: 'success' | 'primary' | 'error' | 'warning' | 'default' }> = {
  completed: { label: 'Completed', color: 'success' },
  running: { label: 'Running', color: 'primary' },
  failed: { label: 'Failed', color: 'error' },
  paused: { label: 'Paused', color: 'warning' },
  pending: { label: 'Pending', color: 'default' },
};

const RECO_STYLE: Record<
  RecommendationType,
  { bg: string; text: string }
> = {
  'STRONG BUY': { bg: '#10B981', text: '#fff' },
  BUY: { bg: '#3B82F6', text: '#fff' },
  HOLD: { bg: '#F59E0B', text: '#000' },
  PASS: { bg: '#EF4444', text: '#fff' },
  'STRONG PASS': { bg: '#7F1D1D', text: '#fff' },
};

// ============================================================
// Utility
// ============================================================
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function calcDuration(created: string, completed: string | null): string {
  if (!completed) return '—';
  const diffMs = new Date(completed).getTime() - new Date(created).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

// ============================================================
// Column definitions
// ============================================================
function useColumns(
  onView: (jobId: string) => void,
  onDelete?: (jobId: string, company: string) => void
): GridColDef[] {
  return [
    {
      field: 'company_input',
      headerName: 'Company',
      flex: 1.5,
      minWidth: 160,
      renderCell: (params: GridRenderCellParams<HistoryItem, string>) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Date',
      flex: 1.2,
      minWidth: 150,
      valueGetter: (value: string) => new Date(value).getTime(),
      renderCell: (params: GridRenderCellParams<HistoryItem>) => (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatDate(params.row.created_at)}
        </Typography>
      ),
    },
    {
      field: 'duration',
      headerName: 'Duration',
      flex: 0.7,
      minWidth: 90,
      sortable: false,
      renderCell: (params: GridRenderCellParams<HistoryItem>) => (
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
        >
          {calcDuration(params.row.created_at, params.row.completed_at)}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 110,
      renderCell: (params: GridRenderCellParams<HistoryItem, JobStatus>) => {
        const cfg = STATUS_COLORS[params.value as JobStatus] ?? STATUS_COLORS.pending;
        return (
          <Chip
            label={cfg.label}
            color={cfg.color as 'success' | 'primary' | 'error' | 'warning' | 'default'}
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
          />
        );
      },
    },
    {
      field: 'recommendation',
      headerName: 'Recommendation',
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams<HistoryItem, RecommendationType | null>) => {
        if (!params.value) {
          return <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>;
        }
        const style = RECO_STYLE[params.value];
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{
              backgroundColor: style.bg,
              color: style.text,
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        );
      },
    },
    {
      field: 'risk_score',
      headerName: 'Risk',
      flex: 0.5,
      minWidth: 70,
      renderCell: (params: GridRenderCellParams<HistoryItem, number | null>) => {
        const score = params.value;
        if (score == null) {
          return <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>;
        }
        const color = score <= 3 ? '#10B981' : score <= 6 ? '#F59E0B' : '#EF4444';
        return (
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', fontWeight: 700, color }}
          >
            {score.toFixed(1)}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<HistoryItem>) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="View analysis" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onView(params.row.job_id);
              }}
              aria-label={`View analysis for ${params.row.company_input}`}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onDelete && (
            <Tooltip title="Delete analysis" arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(params.row.job_id, params.row.company_input);
                }}
                aria-label={`Delete analysis for ${params.row.company_input}`}
                sx={{
                  color: 'text.disabled',
                  transition: 'color 0.15s ease',
                  '&:hover': { color: 'error.main' },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];
}

// ============================================================
// Main component
// ============================================================
interface HistoryTableProps {
  rows: HistoryItem[];
  loading?: boolean;
  onDelete?: (jobId: string, company: string) => void;
}

export default function HistoryTable({ rows, loading = false, onDelete }: HistoryTableProps) {
  const navigate = useNavigate();
  const theme = useTheme();

  const columns = useColumns((jobId) => navigate(`/job/${jobId}`), onDelete);

  return (
    <Box
      sx={{
        width: '100%',
        '& .MuiDataGrid-root': {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: 'background.paper',
          '--DataGrid-containerBackground': theme.palette.background.paper,
        },
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: (t) => alpha(t.palette.text.primary, 0.03),
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
        '& .MuiDataGrid-columnHeader': {
          color: 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        },
        '& .MuiDataGrid-row': {
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: (t) => alpha(t.palette.text.primary, 0.04),
          },
        },
        '& .MuiDataGrid-cell': {
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
        },
        '& .MuiDataGrid-footerContainer': {
          borderTop: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.job_id}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] },
        }}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/job/${params.row.job_id}`)}
        slots={{
          noRowsOverlay: () => (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                py: 6,
                gap: 1.5,
              }}
              role="status"
              aria-label="No analyses found"
            >
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                No analyses found.
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Start your first analysis from the dashboard.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/')}
                sx={{ mt: 1 }}
              >
                New Analysis
              </Button>
            </Box>
          ),
        }}
        aria-label="Analysis history table"
      />
    </Box>
  );
}
