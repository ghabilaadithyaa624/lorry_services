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
  rankReturnLoadOpportunities,
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
| `returnLoadEngine.ts` | `rankReturnLoadOpportunities`, `scoreReturnLoadOpportunity`, `RETURN_LOAD_RANK_WEIGHTS`, return-load types |
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

## Return-load ranking

`evaluateBackhaulOpportunities` (matchingEngine) answers *which* open loads can
become a return haul for a lorry; `rankReturnLoadOpportunities`
(returnLoadEngine) answers *in which order* a driver should see them, on its own
deterministic 100-point scale:

| Factor | Weight | Meaning |
| --- | ---: | --- |
| `matchScore` | 55 | The shared 100-point truck↔load compatibility score |
| `pickupProximity` | 15 | Deadhead km from the drop-off hub to the return pickup, normalised over the discovery radius |
| `payload` | 12 | Return tonnage as a share of the lorry's capacity (0 when it does not fit) |
| `bodyType` | 6 | Exact body match > compatible open configuration > mismatch |
| `rate` | 7 | Offered freight vs the `estimateFreightRate` benchmark (0 when the budget gate fails) |
| `corridor` | 5 | Load delivers into a declared preferred corridor |

Ordering is stable: `rankScore` desc → shorter deadhead → higher match score →
`loadId`. The API serves this through
`GET /matching/truck/:truckId/return-loads` (also aliased under `/matches`,
with the API's usual `/api/v1` prefix). The owned-truck service
(`apps/api/src/matching/return-loads.service.ts`) defaults to a **50 km** radius
and rejects values outside 1–50 km. It passes the measured database pickup
`distanceKm` to `evaluateBackhaulOpportunities` for each candidate, so matching
and backhaul ranking use the same spherical proximity rather than recomputing a
rounded road estimate. Zero coordinates/distances are valid.

The web dashboard, booking detail page and AI assistant consume this endpoint
without substituting client estimates on failure. Candidate discovery,
ownership, paid-subscription contact masking, and query limits stay in the API;
the pure shared functions do not perform authorization or database filtering.
See [the return-load API contract](../../../../docs/return-loads-api.md).

## Adding a new rule

1. Add a pure function + types in a new file under this directory.
2. Export it from `intelligence/index.ts`.
3. Add a `*.spec.ts` beside it.
4. Consume it via `@lorrycarry/shared` (web re-exports live under
   `apps/web/src/lib/intelligence/*` for existing import paths).
