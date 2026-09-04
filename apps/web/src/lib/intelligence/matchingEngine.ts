/**
 * Smart Matching Engine — web entry point.
 *
 * The scoring logic lives in `@lorrycarry/shared` so API, web, admin and mobile
 * share one source of truth. This module re-exports it and adds the
 * browser/Tailwind presentation helpers that must stay out of the shared package.
 */
export {
  calculateMatchScore,
  sortMarketplaceItems,
  evaluateBackhaulOpportunities,
  evaluateBudgetFit,
  rateMatchScore,
  MATCH_SCORE_WEIGHTS,
  DEFAULT_MATCH_DISTANCE_KM,
  DEFAULT_SERVICEABLE_RADIUS_KM,
  DEFAULT_BUDGET_GATE,
} from '@lorrycarry/shared'
export type {
  LoadItem,
  TruckItem,
  MatchFactorKey,
  MatchFactorDetail,
  MatchFactors,
  MatchRating,
  MatchTone,
  MatchResult,
  MatchSortOption,
  MatchScoringOptions,
  BudgetGateConfig,
  BudgetFitResult,
  BackhaulOpportunity,
} from '@lorrycarry/shared'

import type { MatchTone } from '@lorrycarry/shared'

/** Tailwind classes for each presentation-neutral match tone. */
export const MATCH_TONE_CLASSES: Record<MatchTone, string> = {
  success:
    'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  primary:
    'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 border-primary-200 dark:border-primary-800',
  warning:
    'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  danger:
    'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/40 border-danger-200 dark:border-danger-800',
}

/** Returns the Tailwind colour classes for a match result (badge / chip styling). */
export function getMatchColorClasses(match: { tone: MatchTone }): string {
  return MATCH_TONE_CLASSES[match.tone] ?? MATCH_TONE_CLASSES.danger
}
