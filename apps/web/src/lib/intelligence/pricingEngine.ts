/**
 * Freight Rate Estimation — web entry point.
 * Logic lives in `@lorrycarry/shared`; re-exported here for existing imports.
 */
export { calculateGeoDistance, estimateFreightRate, normalizeTruckType } from '@lorrycarry/shared'
export type {
  PricingInput,
  PricingTruckType,
  LongHaulAdjustment,
  TruckTypeAdjustment,
  PriceSensitivityPoint,
  PriceSensitivity,
  RouteComparisonOption,
  FreightEstimate,
} from '@lorrycarry/shared'
