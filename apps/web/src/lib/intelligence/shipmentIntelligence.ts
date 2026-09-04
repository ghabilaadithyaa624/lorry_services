/**
 * Shipment & Transit Intelligence — web entry point.
 * Logic lives in `@lorrycarry/shared`; re-exported here for existing imports.
 */
export { assessShipmentIntelligence, summarizeActiveShipmentsControlTower } from '@lorrycarry/shared'
export type {
  CheckpointData,
  BookingData,
  ShipmentRiskAssessment,
  ControlTowerSummary,
} from '@lorrycarry/shared'
