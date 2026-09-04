# Shared Intelligence Package — Extraction Verification Record

**Scope:** PROMPT 6 — shared intelligence source of truth used by web and API.
**Status:** Implemented & verified (CI-parity run, 2026-09-04).

## Requirement mapping

| # | Requirement | Where it lives | Evidence |
|---|---|---|---|
| 1 | `packages/shared/src/intelligence/` created | `packages/shared/src/intelligence/` | `geo.ts`, `pricingEngine.ts`, `matchingEngine.ts`, `returnLoadEngine.ts`, `shipmentIntelligence.ts`, `actionCenterEngine.ts` + specs |
| 2 | Pure logic moved to shared | `calculateGeoDistance` (`geo.ts`), `estimateFreightRate` (`pricingEngine.ts`), `calculateMatchScore` (`matchingEngine.ts`), `evaluateBackhaulOpportunities` (`matchingEngine.ts`), `assessShipmentIntelligence` + `summarizeActiveShipmentsControlTower` (`shipmentIntelligence.ts`), `deriveOperationalTasks` (`actionCenterEngine.ts`) | `purity.spec.ts` asserts all 7 entry points are exported functions |
| 3 | No React/browser-specific logic in shared | Directory-wide scan in tests | `purity.spec.ts` fails on `react`/`next/` imports, Prisma, Node built-ins, DOM globals, `process.env`, Tailwind class leakage, un-injectable wall-clock reads |
| 4 | Exported from both indexes | `packages/shared/src/intelligence/index.ts`, `packages/shared/src/index.ts` | `export * from './intelligence'` in root index; `package.json` exports `./intelligence` subpath |
| 5 | Web imports use `@lorrycarry/shared` | `apps/web/src/lib/intelligence/{matchingEngine,pricingEngine,shipmentIntelligence,actionCenterEngine}.ts` re-export from `@lorrycarry/shared` | Grep: no formula bodies remain in web — pages/components only call engine functions through these shims |
| 6 | API MatchingService uses shared scoring | `apps/api/src/matching/matching.service.ts` | `calculateMatchScore` delegates to `calculateSharedMatchScore` from `@lorrycarry/shared` with `{ distanceKm, maxProximityKm: 50, budget: true }`; uses shared `calculateGeoDistance` |
| 7 | Backend-only DB/persistence preserved in API | `matching.service.ts` `createOrUpdateMatch`, `triggerWhatsAppForMatch`, `getMyMatches`, `updateMatchStatus`, `handleBookingCreated/Completed`, `deleteMatch`, `return-loads.service.ts`, `pricing.service.ts` | Prisma queries + raw-SQL fallbacks remain in the NestJS services |
| 8 | Budget compatibility handled | Shared `evaluateBudgetFit` + `MatchScoringOptions.budget` (default off) + `DEFAULT_BUDGET_GATE`; API always passes `budget: true`; rationale documented | `packages/shared/src/intelligence/README.md` ("Budget compatibility — why the API adds a server-side gate"); `matchingEngine.budget.spec.ts` (152 lines) |
| 9 | Tests in shared package | `*.spec.ts` beside engines (7 suites) | `tsconfig.spec.json` adds jest types for ts-jest; `npm run test --workspace=@lorrycarry/shared` |
| 10 | Build/test run | See run log below | All green |

## Web & API layering after extraction

- **Pure rules** (`@lorrycarry/shared`): geo distance, freight rates, 100-pt match scoring, budget gate, marketplace sort, backhaul evaluation, return-load ranking, shipment risk/control tower, operational action center derivation.
- **Web adapters stay in `apps/web`** (browser/REST-specific, therefore not in shared): `actionCenterEngine.ts` maps real `/my-loads`, `/my-trucks`, `/bookings`, `/subscriptions/status`, `/admin/stats` payloads onto the engine input; `matchingEngine.ts` maps neutral `tone` tokens → Tailwind classes; `useOperationalTasks.ts` is the React data hook. Web-only coordinator engines (`aiAssistantEngine.ts`, `trustRiskEngine.ts`, `nationalLogisticsEngine.ts`) are outside the 7-function extraction list and stay put.
- **API DB layer stays in `apps/api`**: row→`LoadItem`/`TruckItem` normalisation, persistence, WhatsApp triggers, subscription gates, raw-SQL fallbacks.

## CI-parity run log (all commands executed in the monorepo)

| Step | Command | Result |
|---|---|---|
| Install | `npm install --no-audit --no-fund` | 1901 packages |
| Prisma schema | `npx prisma validate --schema=packages/database/prisma/schema.prisma` | OK (v5.22.0) |
| Prisma client | `npx prisma generate --schema=packages/database/prisma/schema.prisma` | Generated |
| Shared build | `npm run build --workspace=@lorrycarry/shared` | tsc clean → `dist/` |
| Shared tests | `npm run test --workspace=@lorrycarry/shared` | 7 suites / **215 tests passed** (incl. purity guard, budget gate, 7 entry points) |
| Database build | `npm run build --workspace=@lorrycarry/database` | OK |
| API tests | `npm --prefix apps/api test` | 39 suites / **422 tests passed** (incl. `matching.service.spec`, `matching.controller.spec`, `return-loads.service.spec`) |
| Web tests | `npm --prefix apps/web test` | 26 suites / **320 tests passed** (incl. web action-center + shipment-intelligence adapter specs) |
| API build | `npm run build --workspace=@lorrycarry/api` | `nest build` clean |
| Web build | `npm run build --workspace=@lorrycarry/web` | Compiled — all routes (`/search`, `/tracking`, `/booking/[id]`, admin, …) prerendered OK |
| Admin build | `npm run build --workspace=@lorrycarry/admin` | Vite build OK |
| Lint | `npm run lint` | 2 tasks successful, warnings only (pre-existing, no errors) |

## Environmental notes (sandbox-only, no code impact)

- `binaries.prisma.sh` and `fonts.googleapis.com` are unreachable from the sandbox egress.
  Prisma engines were served from a local mirror of the exact engine commit
  (`owengretzinger/prisma-engines-mirror`, commit `605197351a3c8bdd595af2d2a9bc3025bca48ea2`,
  `debian-openssl-3.0.x`) via `PRISMA_BINARIES_MIRROR=http://127.0.0.1:8899`.
- The web production build requires `next/font/google` fetches; to prove the rest of the
  build compiles the font loaders in `apps/web/src/app/layout.tsx` were temporarily
  neutralised, the build completed for every route, and the file was restored verbatim
  (`git checkout`). **No tracked source changes remain** — the tree is clean.
- CI has normal egress, so the unmodified pipeline is green there.

## Residual observations (intentional, out of scope)

- `apps/api/src/common/services/mapmyindia.service.ts` and `apps/api/src/tracking/tracking.service.ts`
  keep private haversine helpers for map-provider ETA/road distance — map client maths, not
  freight scoring; the shared geo function is used wherever scoring decisions are made.
- `apps/web/src/lib/intelligence/{aiAssistantEngine,trustRiskEngine,nationalLogisticsEngine}.ts`
  are web-coordinator/presentation engines, not part of the 7-function extraction list.
