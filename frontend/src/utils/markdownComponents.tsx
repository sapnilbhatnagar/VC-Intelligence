/**
 * Shared MUI-themed component overrides for react-markdown.
 * Used by MarketSummary, RiskAssessmentPanel, and other analytics panels.
 *
 * Each override extracts only `children` to avoid passing react-markdown's
 * `node`, `ref`, and HTML-specific props into MUI components (which causes
 * TypeScript ref-incompatibility errors).
 */
import type { Components } from 'react-markdown';
import { Typography, Box } from '@mui/material';

export const mdComponents: Components = {
  h1: ({ children }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2.5, mb: 0.75 }}>{children}</Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>{children}</Typography>
  ),
  h3: ({ children }) => (
    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, mt: 1.5, mb: 0.5, color: 'primary.main' }}>{children}</Typography>
  ),
  h4: ({ children }) => (
    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, mt: 1, mb: 0.25, color: 'text.primary' }}>{children}</Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', lineHeight: 1.65, mb: 1 }}>{children}</Typography>
  ),
  strong: ({ children }) => (
    <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{children}</Box>
  ),
  em: ({ children }) => (
    <Box component="em" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{children}</Box>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 2, my: 0.5 }}>{children}</Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 2, my: 0.5 }}>{children}</Box>
  ),
  li: ({ children }) => (
    <Typography component="li" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.6, mb: 0.25 }}>{children}</Typography>
  ),
  table: ({ children }) => (
    <Box component="table" sx={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', my: 1 }}>{children}</Box>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <Box component="th" sx={{ textAlign: 'left', fontWeight: 600, p: 0.75, borderBottom: '2px solid', borderColor: 'divider', fontSize: '0.75rem' }}>{children}</Box>
  ),
  td: ({ children }) => (
    <Box component="td" sx={{ p: 0.75, borderBottom: '1px solid', borderColor: 'divider', color: 'text.secondary', fontSize: '0.75rem' }}>{children}</Box>
  ),
  hr: () => (
    <Box component="hr" sx={{ border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 1.5 }} />
  ),
  blockquote: ({ children }) => (
    <Box sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.5, ml: 0, my: 1, opacity: 0.85 }}>
      {children}
    </Box>
  ),
};
