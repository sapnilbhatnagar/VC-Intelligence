// ============================================================
// Credit cost + custom-stage selection rules.
//
// Single source of truth for the frontend, mirroring the
// authoritative backend formula in storage/database.py so the
// cost shown before a run matches what is actually charged.
// ============================================================

const CREDIT_COST_FULL = 5;
const CREDIT_COST_QUICK = 1;

/** Credit cost for a set of selected stages (null = full 8-stage run). */
export function creditCost(selectedStages: number[] | null): number {
  if (selectedStages === null) return CREDIT_COST_FULL;
  if (selectedStages.length <= 3) return CREDIT_COST_QUICK;
  return Math.max(2, selectedStages.length - 2);
}

/** Human label, correctly pluralized: "5 credits", "1 credit". */
export function creditLabel(selectedStages: number[] | null): string {
  const n = creditCost(selectedStages);
  return `${n} credit${n === 1 ? '' : 's'}`;
}

/** Extra credits to upgrade a partial run to the full 8 stages. */
export function deltaToFull(selectedStages: number[] | null): number {
  return Math.max(0, creditCost(null) - creditCost(selectedStages));
}

// Stage 1 (company research) is always required. Stages 7 (report) and 8
// (visual summary) depend on stage 6 (investor memo).
const REQUIRED_STAGE = 1;
const MEMO_STAGE = 6;
const MEMO_DEPENDENTS = [7, 8];

/**
 * Toggle a stage in a custom selection, enforcing dependencies.
 * Returns a new Set (does not mutate the input).
 */
export function toggleStage(current: Set<number>, stage: number): Set<number> {
  if (stage === REQUIRED_STAGE) return new Set(current); // always on
  const next = new Set(current);
  if (next.has(stage)) {
    next.delete(stage);
    // Removing the memo invalidates the report + visual summary.
    if (stage === MEMO_STAGE) MEMO_DEPENDENTS.forEach((s) => next.delete(s));
  } else {
    next.add(stage);
    // Report / visual summary require the memo.
    if (MEMO_DEPENDENTS.includes(stage)) next.add(MEMO_STAGE);
  }
  return next;
}
