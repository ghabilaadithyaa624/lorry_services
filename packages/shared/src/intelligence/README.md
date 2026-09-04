# Shared intelligence layer

`@lorrycarry/shared` (`packages/shared/src/intelligence`) is the single source
of truth for LorryCarry's deterministic logistics rules. API, web, admin and
mobile all import from here so every surface computes the same numbers.

```ts
import {
  calculateGeoDistance,
  estimateFreightRate,
  calculateMatchScore,
  sortMarketplaceItems,
  evaluateBackhaulOpportunities,
  assessShipmentIntelligence,
  summarizeActiveShipmentsControlTower,
  deriveOperationalTasks,
} from '@lorrycarry/shared'
```

| Module | Exports |
| --- | --- |
| `geo.ts` | `calculateGeoDistance` (Haversine × 1.3 road factor) |
| `pricingEngine.ts` | `estimateFreightRate`, `normalizeTruckType`, pricing types |
| `matchingEngine.ts` | `calculateMatchScore`, `sortMarketplaceItems`, `evaluateBackhaulOpportunities`, `evaluateBudgetFit`, `rateMatchScore`, matching types |
| `shipmentIntelligence.ts` | `assessShipmentIntelligence`, `summarizeActiveShipmentsControlTower` |
| `actionCenterEngine.ts` | `deriveOperationalTasks` |

## Rules for this directory

- **Pure only.** No DOM / `window`, React, Next.js, Prisma, or Node-only APIs.
  Everything must run identically in a browser, React Native and Node.
- **Deterministic.** Same input ⇒ same output (results are memoised per object
  identity via `WeakMap`).
- **No presentation.** Tailwind classes, icons and copy layout stay in the app.
  Expose neutral tokens instead — e.g. `MatchResult.tone`
  (`success | primary | warning | danger`) which `apps/web` maps to classes in
  `apps/web/src/lib/intelligence/matchingEngine.ts` (`getMatchColorClasses`).
- Tests live next to the code (`*.spec.ts`) and run with
  `npm run test --workspace=@lorrycarry/shared`.

## Match scoring options

`calculateMatchScore(load, truck, options?)` always produces the 100-point
breakdown (capacity 35 · body type 25 · proximity 20 · verification 15 ·
corridor 5). `MatchScoringOptions` lets a caller layer contextual gates on top:

| Option | Default | Purpose |
| --- | --- | --- |
| `distanceKm` | `truck.distanceKm` → lat/lng → 15 km | Explicit truck→pickup distance (e.g. PostGIS `ST_Distance`). |
| `maxProximityKm` | off | Hard radius ceiling. Aligns the proximity factor with a query-side radius filter. |
| `budget` | off | Budget compatibility gate (see below). |

### Budget compatibility — why the API adds a server-side gate

Budget is a **commercial gate, not a scored factor**. When enabled,
`evaluateBudgetFit` compares the shipper's `maxPrice` against the shared
`estimateFreightRate(...).recommendedTarget`; if the budget is more than 15%
below the benchmark the score is capped at 65 and a warning is emitted. Loads
with no `maxPrice` always pass. The gate config lives in
`DEFAULT_BUDGET_GATE` / `BudgetGateConfig` so both sides share one definition.

The **API always enables it** (`apps/api/src/matching/matching.service.ts`
passes `{ budget: true, maxProximityKm: 50 }`) because the API is the system of
record for persisted `matches.budget_compatible` and drives the WhatsApp
notifications sent to transporters — we must not push loads to drivers whose
budgets are clearly unviable. Its `MatchResult` therefore always includes
`factors.budget`.

The **web/mobile clients leave it off by default** so shippers browsing the
marketplace still see physically compatible trucks ranked on the pure
100-point score even when their stated budget is below benchmark. Any client
that wants server parity can pass `{ budget: true }` — the caching key includes
the options, so both variants can coexist.

## Adding a new rule

1. Add a pure function + types in a new file under this directory.
2. Export it from `intelligence/index.ts`.
3. Add a `*.spec.ts` beside it.
4. Consume it via `@lorrycarry/shared` (web re-exports live under
   `apps/web/src/lib/intelligence/*` for existing import paths).
