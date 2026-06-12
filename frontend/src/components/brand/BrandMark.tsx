import { TOKENS } from '../../theme';

// ============================================================
// BrandMark — the VC Intelligence mark: a cobalt tile holding
// three ascending bars under a reading line. Inline SVG so it
// scales crisply at any size and inherits no font dependencies.
// ============================================================
interface BrandMarkProps {
  size?: number;
  /** Tile fill; defaults to the brand cobalt. */
  fill?: string;
  /** Glyph color; defaults to white. */
  glyph?: string;
}

export default function BrandMark({ size = 32, fill = TOKENS.brand, glyph = '#FFFFFF' }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="VC Intelligence"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="8" fill={fill} />
      <rect x="7" y="17" width="4" height="8" rx="1.5" fill={glyph} opacity="0.55" />
      <rect x="14" y="13" width="4" height="12" rx="1.5" fill={glyph} opacity="0.8" />
      <rect x="21" y="9" width="4" height="16" rx="1.5" fill={glyph} />
      <path d="M7 11 L14.5 7.5 L21 9.5 L25 6" stroke={glyph} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
