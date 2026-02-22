import {
  Box,
  Button,
  Typography,
  Tooltip,
  alpha,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ArticleIcon from '@mui/icons-material/Article';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { getReportUrl, getOnePagerUrl } from '../../api/client';

// ============================================================
// Download action definitions
// ============================================================
interface DownloadAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  getUrl: (jobId: string) => string;
  variant: 'contained' | 'outlined';
  tooltip: string;
}

const DOWNLOADS: DownloadAction[] = [
  {
    label: 'Investor Report',
    description: 'Full printable analysis document',
    icon: <ArticleIcon fontSize="small" />,
    getUrl: getReportUrl,
    variant: 'contained',
    tooltip: 'Download the complete investor due diligence report (HTML)',
  },
  {
    label: 'Visual One-Pager',
    description: 'Executive summary — presentation ready',
    icon: <SummarizeIcon fontSize="small" />,
    getUrl: getOnePagerUrl,
    variant: 'outlined',
    tooltip: 'Download the visual one-pager executive summary (HTML)',
  },
];

// ============================================================
// Component
// ============================================================
interface DownloadSectionProps {
  jobId: string | null;
  isCompleted: boolean;
}

export default function DownloadSection({ jobId, isCompleted }: DownloadSectionProps) {
  const handleDownload = (getUrl: (id: string) => string) => {
    if (!jobId) return;
    window.open(getUrl(jobId), '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      role="region"
      aria-label="Download analysis outputs"
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isCompleted ? (t) => alpha(t.palette.success.main, 0.25) : 'divider',
        backgroundColor: isCompleted
          ? (t) => alpha(t.palette.success.main, 0.04)
          : (t) => alpha(t.palette.text.primary, 0.02),
        transition: 'all 0.3s ease',
      }}
    >
      {/* Section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <DownloadIcon
          fontSize="small"
          sx={{ color: isCompleted ? 'success.main' : 'text.disabled' }}
        />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: isCompleted ? 'text.primary' : 'text.disabled',
            fontSize: '0.875rem',
          }}
        >
          Downloads
        </Typography>
        {isCompleted && (
          <Box
            sx={{
              ml: 'auto',
              px: 1,
              py: 0.25,
              borderRadius: 0.5,
              backgroundColor: (t) => alpha(t.palette.success.main, 0.12),
              border: '1px solid',
              borderColor: (t) => alpha(t.palette.success.main, 0.25),
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'success.main', fontSize: '0.6rem', fontWeight: 700 }}
            >
              READY
            </Typography>
          </Box>
        )}
      </Box>

      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', display: 'block', mb: 2, fontSize: '0.7rem' }}
      >
        {isCompleted
          ? 'Your analysis deliverables are ready to download.'
          : 'Downloads unlock when the analysis pipeline completes.'}
      </Typography>

      {/* Download buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {DOWNLOADS.map((dl) => (
          <Tooltip
            key={dl.label}
            title={isCompleted ? dl.tooltip : 'Available after analysis completes'}
            arrow
            placement="left"
          >
            <span style={{ display: 'block' }}>
              <Button
                variant={dl.variant}
                size="small"
                fullWidth
                disabled={!isCompleted || !jobId}
                startIcon={dl.icon}
                endIcon={<DownloadIcon fontSize="small" />}
                onClick={() => handleDownload(dl.getUrl)}
                aria-label={`${dl.label} — ${dl.description}`}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.25,
                  fontSize: '0.8125rem',
                  ...(dl.variant === 'contained' && isCompleted
                    ? {
                        animation: 'subtlePulse 3s ease-in-out infinite',
                        '@keyframes subtlePulse': {
                          '0%, 100%': { boxShadow: '0 2px 8px rgba(59,130,246,0.3)' },
                          '50%': { boxShadow: '0 4px 20px rgba(59,130,246,0.55)' },
                        },
                      }
                    : {}),
                }}
              >
                <Box sx={{ flex: 1, textAlign: 'left' }}>
                  {dl.label}
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ display: 'block', opacity: 0.65, fontSize: '0.65rem' }}
                  >
                    {dl.description}
                  </Typography>
                </Box>
              </Button>
            </span>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
