import { describe, it, expect } from 'vitest';
import {
  createAppTheme,
  theme,
  TOKENS,
  RECOMMENDATION_COLORS,
  CHART_COLORS,
  riskColor,
} from './theme';

// Colors the product has deliberately retired: emerald + electric blue.
// Used across these tests to guarantee the new identity replaced the old one.
const BANNED = ['#10B981', '#0E7C5A', '#06120D', '#5B9DF9', '#2BE0A0', '#0FBF85', '#ECFDF5'];

function relativeLuminance(hex: string): number {
  const m = hex.replace('#', '');
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(m.slice(0, 2), 16));
  const g = channel(parseInt(m.slice(2, 4), 16));
  const b = channel(parseInt(m.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('design system: single light theme', () => {
  it('exposes exactly one light theme (no dark/advanced modes)', () => {
    expect(theme.palette.mode).toBe('light');
    expect(createAppTheme().palette.mode).toBe('light');
  });

  it('uses the #0E0E52 navy as the primary accent', () => {
    expect(theme.palette.primary.main.toUpperCase()).toBe('#0E0E52');
  });

  it('renders on a light mint canvas, not a dark background', () => {
    // Light backgrounds have high luminance; the old dark theme was ~0.01.
    expect(relativeLuminance(theme.palette.background.default)).toBeGreaterThan(0.8);
    expect(theme.palette.background.paper.toUpperCase()).toBe('#FFFFFF');
  });
});

describe('design system: retired the emerald + blue identity', () => {
  it('contains none of the banned brand colors in its tokens', () => {
    const serialized = JSON.stringify(TOKENS).toUpperCase();
    for (const c of BANNED) expect(serialized).not.toContain(c.toUpperCase());
  });

  it('contains none of the banned brand colors in the MUI palette', () => {
    const serialized = JSON.stringify(theme.palette).toUpperCase();
    for (const c of BANNED) expect(serialized).not.toContain(c.toUpperCase());
  });

  it('never uses electric blue for financial chart series', () => {
    const series = [CHART_COLORS.bear, CHART_COLORS.base, CHART_COLORS.bull].map((c) =>
      c.toUpperCase(),
    );
    expect(series).not.toContain('#5B9DF9');
  });
});

describe('design system: accessible recommendation colors', () => {
  const grades = ['STRONG BUY', 'BUY', 'HOLD', 'PASS', 'STRONG PASS'] as const;

  it('defines a bg + text pair for every recommendation grade', () => {
    for (const g of grades) {
      expect(RECOMMENDATION_COLORS[g]).toBeDefined();
      expect(RECOMMENDATION_COLORS[g].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(RECOMMENDATION_COLORS[g].text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('every recommendation chip meets WCAG AA contrast (>= 4.5:1)', () => {
    for (const g of grades) {
      const { bg, text } = RECOMMENDATION_COLORS[g];
      expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('design system: risk score color scale', () => {
  it('maps low risk to success, mid to caution, high to danger', () => {
    expect(riskColor(2)).toBe(theme.palette.success.main);
    expect(riskColor(5)).toBe(theme.palette.warning.main);
    expect(riskColor(9)).toBe(theme.palette.error.main);
  });
});
