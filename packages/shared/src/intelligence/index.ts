/**
 * LorryCarry shared intelligence layer.
 *
 * Pure, deterministic, explainable logistics rules shared by the API, web,
 * admin and mobile apps so every surface computes the same numbers.
 *
 * Rules for this directory:
 * - No DOM / window / React / Next.js imports.
 * - No Prisma / Node-only APIs (fs, crypto, ...).
 * - Functions must be deterministic for a given input.
 * - Presentation concerns (Tailwind classes, icons) stay in the consuming app;
 *   expose neutral tokens (e.g. `tone`, `badgeVariant`) instead.
 */
export * from './geo'
export * from './pricingEngine'
export * from './matchingEngine'
export * from './shipmentIntelligence'
export * from './actionCenterEngine'
