/**
 * useCreditsConversion
 *
 * Converts an Anthropic API token count to a display-friendly credits string
 * using the VC Intelligence credit pricing formula:
 *
 *   < $0.50   → "1.5 credits"
 *   $0.50–$0.80 → "2 credits"
 *   +$0.30 each → +1 credit (rounded up)
 *
 * Token cost model: $0.002 per 1 000 tokens (blended Haiku/Sonnet average).
 */

const COST_PER_1K_TOKENS = 0.002;

export function tokensToUsd(totalTokens: number): number {
  return (totalTokens / 1000) * COST_PER_1K_TOKENS;
}

export function usdToCredits(usd: number): string {
  if (usd < 0.5) return '1.5';
  if (usd <= 0.8) return '2';
  const extra = Math.ceil((usd - 0.8) / 0.3);
  return String(2 + extra);
}

/**
 * Returns a display string like "1.5 credits" or "3 credits",
 * or null when totalTokens is not yet available.
 */
export function useCreditsConversion(totalTokens: number | null | undefined): string | null {
  if (totalTokens == null) return null;
  const usd = tokensToUsd(totalTokens);
  return `${usdToCredits(usd)} credits`;
}
