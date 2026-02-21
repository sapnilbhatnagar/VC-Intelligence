import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Skeleton,
  Fade,
  alpha,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShieldIcon from '@mui/icons-material/Shield';
import CalculateIcon from '@mui/icons-material/Calculate';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { ResultsResponse } from '../../types';

// ============================================================
// Tab configuration
// ============================================================
interface TabConfig {
  label: string;
  icon: React.ReactElement;
  field: keyof ResultsResponse;
  emptyText: string;
}

const TABS: TabConfig[] = [
  {
    label: 'Investor Memo',
    icon: <ArticleIcon fontSize="small" />,
    field: 'investor_memo',
    emptyText: 'Investor memo not yet generated.',
  },
  {
    label: 'Company Info',
    icon: <BusinessIcon fontSize="small" />,
    field: 'company_info',
    emptyText: 'Company research not yet available.',
  },
  {
    label: 'Market Analysis',
    icon: <TrendingUpIcon fontSize="small" />,
    field: 'market_analysis',
    emptyText: 'Market analysis not yet available.',
  },
  {
    label: 'Risk Assessment',
    icon: <ShieldIcon fontSize="small" />,
    field: 'risk_assessment',
    emptyText: 'Risk assessment not yet available.',
  },
  {
    label: 'Financial Model',
    icon: <CalculateIcon fontSize="small" />,
    field: 'financial_model_text',
    emptyText: 'Financial model not yet available.',
  },
];

// ============================================================
// Metric highlight — wraps $X.XM / XX% / $X.XX in styled spans
// Uses fresh regex each call (no stale lastIndex from g flag)
// ============================================================
function highlightMetrics(text: string): React.ReactNode {
  const pattern = /(\$[\d,.]+[MBK]?|[\d.]+%|\$[\d,.]+)/g;
  const parts = text.split(pattern);
  if (parts.length === 1) return text;
  // Build a fresh test regex each time to avoid stale g-flag lastIndex
  const testPattern = /^(\$[\d,.]+[MBK]?|[\d.]+%|\$[\d,.]+)$/;
  return (
    <>
      {parts.map((part, i) =>
        testPattern.test(part) ? (
          <Box
            key={i}
            component="span"
            sx={{
              display: 'inline',
              px: 0.5,
              py: 0,
              borderRadius: 0.5,
              fontSize: '0.85em',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'primary.main',
              backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
              mx: 0.25,
            }}
          >
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ============================================================
// Custom react-markdown components (MUI styled)
// ============================================================
const markdownComponents: Components = {
  h1: ({ children }) => (
    <Typography
      variant="h4"
      sx={{ mt: 2.5, mb: 0.75, fontSize: '1.1rem', color: 'text.primary', fontWeight: 700 }}
    >
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography
      variant="h5"
      sx={{ mt: 2, mb: 0.5, fontSize: '0.9375rem', color: 'text.primary', fontWeight: 600 }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography
      variant="h6"
      sx={{ mt: 1.5, mb: 0.25, color: 'primary.main', textTransform: 'none', fontSize: '0.875rem' }}
    >
      {children}
    </Typography>
  ),
  h4: ({ children }) => (
    <Typography
      sx={{ mt: 1.25, mb: 0.25, fontWeight: 600, fontSize: '0.8125rem', color: 'text.primary' }}
    >
      {children}
    </Typography>
  ),
  p: ({ children }) => {
    // If children is a single string, apply metric highlighting
    if (typeof children === 'string') {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.75, mb: 0.5 }}>
          {highlightMetrics(children)}
        </Typography>
      );
    }
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.75, mb: 0.5 }}>
        {children}
      </Typography>
    );
  },
  strong: ({ children }) => (
    <Box component="strong" sx={{ color: 'text.primary', fontWeight: 600 }}>
      {typeof children === 'string' ? highlightMetrics(children) : children}
    </Box>
  ),
  em: ({ children }) => <em>{children}</em>,
  hr: () => <Divider sx={{ my: 1.5 }} />,
  blockquote: ({ children }) => (
    <Box
      sx={{
        borderLeft: '3px solid',
        borderColor: 'primary.main',
        pl: 1.5,
        py: 0.5,
        my: 0.75,
        borderRadius: '0 4px 4px 0',
        backgroundColor: (t) => alpha(t.palette.primary.main, 0.06),
      }}
    >
      {children}
    </Box>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 0.5, '& li': { mb: 0.25 } }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ m: 0, pl: 2.5, mb: 0.5, '& li': { mb: 0.25 } }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ color: 'text.secondary' }}>
      <Typography variant="body2" component="span" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
        {children}
      </Typography>
    </Box>
  ),
  table: ({ children }) => (
    <Box
      sx={{
        overflowX: 'auto',
        my: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Table size="small" aria-label="Rendered table">
        {children}
      </Table>
    </Box>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow hover>{children}</TableRow>,
  th: ({ children }) => (
    <TableCell
      sx={{
        fontWeight: 700,
        color: 'text.primary',
        fontSize: '0.75rem',
        backgroundColor: (t) => alpha(t.palette.text.primary, 0.04),
        whiteSpace: 'nowrap',
      }}
    >
      {typeof children === 'string' ? highlightMetrics(children) : children}
    </TableCell>
  ),
  td: ({ children }) => (
    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
      {typeof children === 'string' ? highlightMetrics(children) : children}
    </TableCell>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <Box
          component="pre"
          sx={{
            p: 1.5,
            my: 1,
            borderRadius: 1,
            backgroundColor: (t) => alpha(t.palette.text.primary, 0.04),
            overflowX: 'auto',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            color: 'text.secondary',
          }}
        >
          <code>{children}</code>
        </Box>
      );
    }
    return (
      <Box
        component="code"
        sx={{
          px: 0.5,
          py: 0.125,
          borderRadius: 0.5,
          backgroundColor: (t) => alpha(t.palette.text.primary, 0.06),
          fontSize: '0.8em',
          fontFamily: 'monospace',
        }}
      >
        {children}
      </Box>
    );
  },
};

// ============================================================
// Skeleton loader for loading state
// ============================================================
function ContentSkeleton() {
  return (
    <Box sx={{ py: 2 }}>
      <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width="100%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="100%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="85%" height={16} sx={{ mb: 2 }} />
      <Skeleton variant="text" width="45%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="100%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="92%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="100%" height={16} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 1, mb: 2 }} />
      <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="100%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="78%" height={16} />
    </Box>
  );
}

// ============================================================
// Copy button — copies raw text, shows brief checkmark
// ============================================================
interface CopyButtonProps {
  text: string | null;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — fail silently
    }
  }, [text]);

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy text'} arrow>
      <span>
        <IconButton
          size="small"
          onClick={handleCopy}
          disabled={!text}
          aria-label="Copy tab content to clipboard"
          sx={{
            color: copied ? 'success.main' : 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          {copied ? (
            <CheckIcon sx={{ fontSize: '0.9rem' }} />
          ) : (
            <ContentCopyIcon sx={{ fontSize: '0.9rem' }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

// ============================================================
// Main component
// ============================================================
interface ResultsPanelProps {
  resultsData: ResultsResponse | null;
  isRunning?: boolean;
}

export default function ResultsPanel({ resultsData, isRunning }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState(0);

  const currentTab = TABS[activeTab];
  const content = resultsData
    ? (resultsData[currentTab.field] as string | null)
    : null;

  // Memoize markdown content to avoid re-renders
  const markdownContent = useMemo(() => content, [content]);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="region"
      aria-label="Analysis results"
    >
      {/* Tabs header */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: (t) => alpha(t.palette.text.primary, 0.02),
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Analysis result tabs"
          sx={{ minHeight: 44, flex: 1 }}
        >
          {TABS.map((tab, i) => (
            <Tab
              key={tab.label}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              id={`results-tab-${i}`}
              aria-controls={`results-panel-${i}`}
              sx={{ minHeight: 44 }}
            />
          ))}
        </Tabs>

        {/* Copy button in header — copies the active tab's raw text */}
        <Box sx={{ pr: 1, pl: 0.5, flexShrink: 0 }}>
          <CopyButton text={content} />
        </Box>
      </Box>

      {/* Tab content */}
      <Box
        id={`results-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`results-tab-${activeTab}`}
        sx={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: { xs: '60vh', md: '70vh' },
          p: 2.5,
        }}
      >
        {!resultsData && !isRunning ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: (t) => alpha(t.palette.text.primary, 0.05),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              {currentTab.icon}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              Analysis in progress...
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Results will appear here when the pipeline completes.
            </Typography>
          </Box>
        ) : !content && isRunning ? (
          /* Skeleton loader while pipeline is running but content not yet available */
          <ContentSkeleton />
        ) : content ? (
          <Fade in timeout={400}>
            <Box
              sx={{
                '& > *:first-of-type': { mt: 0 },
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {markdownContent ?? ''}
              </ReactMarkdown>
            </Box>
          </Fade>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            {currentTab.emptyText}
          </Typography>
        )}
      </Box>

      {/* Chip legend for metric highlights */}
      {content && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            px: 2,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              px: 0.75,
              py: 0.125,
              borderRadius: 0.5,
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'primary.main',
              backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
            }}
            aria-hidden="true"
          >
            $1.2M
          </Box>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
            Monetary and percentage values are highlighted automatically.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
