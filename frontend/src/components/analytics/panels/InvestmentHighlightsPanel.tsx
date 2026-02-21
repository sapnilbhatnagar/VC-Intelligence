import { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Fade,
  alpha,
} from '@mui/material';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// ============================================================
// Accent palette cycling through multiple colors
// ============================================================
const ACCENT_COLORS = [
  '#6366F1', // indigo
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EC4899', // pink
];

// Icon pool — cycles with accent colors
const ICONS = [
  LightbulbOutlinedIcon,
  TrendingUpIcon,
  AccountBalanceOutlinedIcon,
  CheckCircleOutlineIcon,
  StarBorderIcon,
];

// ============================================================
// Helpers
// ============================================================

/**
 * Extract the "Key Investment Highlights" section from an investor memo.
 * Tries the labeled section first, then falls back to extracting numbered
 * items or bullet points from the full text.
 */
function extractHighlights(memoText: string): Array<{ title: string; description: string }> {
  // Strategy 1: find the dedicated section
  const sectionMatch = memoText.match(
    /Key Investment Highlights?[\s\S]*?(?=\n#{1,3}\s|\n[A-Z][^a-z\n]{5,}:|\n---|\n\*\*\*|$)/i,
  );

  const source = sectionMatch ? sectionMatch[0] : memoText;

  // Extract numbered or bulleted items with a strong title pattern:
  // e.g.  "1. **Large TAM**: description" or "- Strong growth:  ..."
  const itemRegex =
    /(?:^|\n)\s*(?:\d+[\.\)]|\*|\-|•)\s+\*{0,2}([^:\n*]{5,60})\*{0,2}[:\s–-]+([^\n]{20,})/gm;

  const highlights: Array<{ title: string; description: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(source)) !== null && highlights.length < 5) {
    highlights.push({
      title: match[1].trim().replace(/\*+/g, ''),
      description: match[2].trim().replace(/\*+/g, ''),
    });
  }

  if (highlights.length >= 2) return highlights;

  // Strategy 2: fall back to splitting by sentences / paragraphs
  const sentences = source
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 40 && l.length < 280 && !/^#+/.test(l))
    .slice(0, 5);

  return sentences.map((s) => {
    // Try to split on first colon as title / description
    const colonIdx = s.indexOf(':');
    if (colonIdx > 5 && colonIdx < 60) {
      return {
        title: s.slice(0, colonIdx).replace(/\*+|[-•*\d.]+\s*/g, '').trim(),
        description: s.slice(colonIdx + 1).trim(),
      };
    }
    // No natural split — use first 6 words as pseudo-title
    const words = s.split(/\s+/);
    return {
      title: words.slice(0, 6).join(' '),
      description: words.slice(6).join(' ') || s,
    };
  });
}

// ============================================================
// Skeleton placeholder
// ============================================================
function HighlightSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[80, 65, 90, 70].map((w, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 1.5,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: '4px solid',
            borderLeftColor: alpha('#6366F1', 0.3),
          }}
        >
          <Skeleton variant="circular" width={24} height={24} sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={`${w}%`} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================
// Props
// ============================================================
interface InvestmentHighlightsPanelProps {
  memoText: string | null;
}

// ============================================================
// Component
// ============================================================
export default function InvestmentHighlightsPanel({ memoText }: InvestmentHighlightsPanelProps) {
  const highlights = useMemo(
    () => (memoText ? extractHighlights(memoText) : []),
    [memoText],
  );

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: 'divider',
        backgroundColor: alpha('#ffffff', 0.03),
      }}
      role="region"
      aria-label="Investment highlights"
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <StarBorderIcon fontSize="small" sx={{ color: '#F59E0B' }} aria-hidden="true" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Key Investment Highlights
          </Typography>
        </Box>

        {/* Content */}
        {!memoText ? (
          <HighlightSkeleton />
        ) : highlights.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Investor memo not yet generated.
          </Typography>
        ) : (
          <Box
            component="ul"
            sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5 }}
            aria-label="Investment highlights list"
          >
            {highlights.map((item, i) => {
              const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
              const IconComp = ICONS[i % ICONS.length];

              return (
                <Fade key={i} in timeout={300 + i * 80}>
                  <Box
                    component="li"
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: `4px solid ${accent}`,
                      backgroundColor: alpha(accent, 0.04),
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: alpha(accent, 0.08),
                      },
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(accent, 0.12),
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                      aria-hidden="true"
                    >
                      <IconComp sx={{ fontSize: 16, color: accent }} />
                    </Box>

                    {/* Text */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontWeight: 700,
                          color: 'text.primary',
                          fontSize: '0.78rem',
                          mb: 0.25,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          lineHeight: 1.55,
                          fontSize: '0.73rem',
                        }}
                      >
                        {item.description}
                      </Typography>
                    </Box>
                  </Box>
                </Fade>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
