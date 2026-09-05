# LorryCarry — Logistics Platform Intelligence Audit

**Version:** 3.0.0  
**Architect:** Principal Product Engineer & Logistics Platform Architect  
**Status:** Final implementation audit — Implemented / Partial / External-Provider-Dependent / Roadmap  

**Status legend used throughout this document:**
- `[Implemented]` — shipped and verified in the monorepo.
- `[Implemented — Partial]` — core flow shipped, but a documented part of the capability is not yet present.
- `[Implemented — External Provider Dependent]` — the code path ships and works in sandbox/mock mode, but production-grade behaviour requires live third-party credentials.
- `[Roadmap]` — designed, not implemented.

---

## 1. Executive Summary

LorryCarry is an open, direct freight marketplace connecting Indian cargo owners (shippers, factories, traders), verified lorry operators (truck drivers, fleet owners) and transporters (who operate on both sides of the marketplace — posting loads and listing trucks from a unified workspace) without broker commissions.

This audit documents the transition of LorryCarry from a transactional CRUD application into a **Logistics Intelligence Platform**. The intelligence layer is powered by deterministic algorithms in `@lorrycarry/shared`, dedicated NestJS backend endpoints, and interactive Next.js 15 frontends (the Expo mobile workspace is a thin REST client and does not import the shared intelligence engines).

**Transporter unified workspace.** The `transporter` role operates on both sides of the marketplace: it can post freight loads (like a `factory_owner`) and list trucks (like a `truck_driver`), all from a single dashboard at `/dashboard/transporter`. Write access remains ownership-scoped — a transporter can only edit or delete its own loads and trucks — enforced by the service layer regardless of the broader `@Roles` route grant. Each listing is owned by a single user, so only the owner (or an admin) can modify it.

---

## 2. Intelligence Capabilities Status Matrix

| Capability | Scope | Status | Implementation Details |
|---|---|---|---|
| **Deterministic Match Scoring** | Shared + API + Web | `[Implemented]` | 100-pt compatibility scoring — capacity 35 · body 25 · proximity 20 · verification 15 · corridor 5 (`matchingEngine.ts`, `/api/v1/matches/*`, `/search`); server enables the optional budget gate and a 50 km proximity cap |
| **Freight Rate Estimator** | Shared + API + Web | `[Implemented]` | Rule-based rate estimator (`pricingEngine.ts`, `POST /api/v1/pricing/estimate` and its `/intelligence/pricing/estimate` alias) |
| **Return-Load (Backhaul) Radar** | Shared + API + Web | `[Implemented]` | Drop-off hub backhaul engine (`returnLoadEngine.ts`, `GET /api/v1/matching/truck/:truckId/return-loads`, `/matches` alias retained) |
| **Shipment Risk & Attention Analyzer**| Shared + Web + Admin | `[Implemented]` | Booking risk tiers from domain state (`shipmentIntelligence.ts`, `/booking/[id]`, `/tracking`, `/admin/risk`) |
| **Operational Action Center** | Shared + Web + Admin | `[Implemented]` | Dynamic multi-source operational task aggregator (`actionCenterEngine.ts`) on the Web dashboard shell and the Next.js Admin console (`/admin/dashboard`) |
| **Vahan RC Validation** | API + Web + Admin | `[Implemented — External Provider Dependent]` | Provider adapter + deterministic sandbox fallback (`/api/v1/compliance/trucks/:id/validate-rc`); `Unavailable` is explicit when no provider credentials exist; real verification requires Parivahan/ULIP access |
| **FASTag Readiness & E-Way Bill** | API + Web + Admin | `[Implemented]` | 12-digit E-Way Bill lifecycle validation & FASTag state tracking (`/api/v1/compliance/*`). FASTag status is owner/admin-reported (Vahan does not expose it); automated EWB sync is Roadmap |
| **7-Stage Booking Document Chain** | API + Web + Admin | `[Implemented — External Provider Dependent]` | Pre-signed S3/MinIO upload/download chain (`/api/v1/bookings/:id/documents/*`, `/api/v1/admin/booking-documents`) |
| **Booking Dispute Resolution** | API + Web + Admin | `[Implemented]` | Counterparty dispute filing & priority-sorted admin queue (`/api/v1/admin/disputes`) |
| **Subscription Paywall & 90-Day Trial**| API + Web | `[Implemented — External Provider Dependent]`| Expiry gate + one-time 90-day trial (auto-granted at registration); trial unlocks search contact reveals, booking creation requires an active paid subscription; Cashfree/Razorpay/Stripe checkout & webhooks |
| **Multi-Driver Live IoT Telematics** | Backend + Stream | `[Roadmap]` | Requires continuous streaming GPS & Redis time-series stream |
| **Direct ULIP / Parivahan API Bridge**| Integration | `[Roadmap]` | Direct government ULIP portal bridge to replace the sandbox adapter |
| **Automated Escrow Smart Payouts** | Payment Engine | `[Roadmap]` | Automated milestone disbursement via Cashfree Payouts API (today's milestones are confirmed in-app, not auto-disbursed) |
| **Direct NIC E-Way Bill GSP Fetch** | Compliance | `[Roadmap]` | Direct GSP gateway connection for automatic EWB status syncing |

---

## 3. Database Models & Intelligence Assets

Inspected from `packages/database/prisma/schema.prisma`:

| Model | Fields & Key Capabilities | Intelligence Asset & Usage |
|---|---|---|
| **User** | `id`, `phone`, `name`, `role` (`factory_owner`, `truck_driver`, `transporter`, `admin`), `trialStartedAt`, `trialEndsAt`, `trialConvertedAt` | Identity verification, paywall gating, 90-day free trial entitlement tracking. `factory_owner` posts loads; `truck_driver` lists trucks; `transporter` posts both from a unified workspace; `admin` oversees the platform. |
| **UserPreference** | `theme`, `language`, `currency`, `distanceUnit`, `notifyWhatsapp`, `notifySms`, `notifyPush`, `defaultRadiusKm`, `preferredBodyType` | User-tailored search radius, notification preferences, UI localization. |
| **NotificationReceipt** | `userId`, `notificationKey`, `readAt` | Unified read tracking across stored and dynamically derived notifications. |
| **Load** | `tonnageRequired`, `loadingAddress`, `loadingPin`, `loadingLat`, `loadingLng`, `loadingPoint` (PostGIS), `unloadingAddress`, `unloadingPin`, `unloadingLat`, `unloadingLng`, `unloadingPoint` (PostGIS), `truckType`, `minLengthFt`, `minHeightFt`, `urgent`, `maxPrice`, `advancePayable`, `expectedDeliveryAt`, `status` | Spatial radius matching (`ST_DWithin`), budget ceiling comparison, urgency matching, tonnage fit. |
| **Truck** | `registrationNumber`, `bodyType` (`Open`, `Container`, `OpenBody`), `lengthFt`, `heightFt`, `tonnageCapacity`, `currentLat`, `currentLng`, `currentLocation` (PostGIS), `serviceableRadiusKm`, `preferredDestinations`, `verificationStatus`, `vahanStatus`, `vahanDetails`, `fastagStatus` | Proximity scoring, route matching, capacity utilization, return-corridor matching, Vahan compliance badges. |
| **Document** | `truckId`, `type` (`RC`, `Insurance`), `docNumber`, `s3Url`, `s3Key`, `verificationStatus`, `isVerified`, `expiryDate`, `verifiedAt`, `verifiedBy` | Document-level KYC verification, expiring document warnings. |
| **Booking** | `loadId`, `truckId`, `loadOwnerId`, `truckOwnerId`, `agreedPrice`, `advanceConfirmed`, `balanceConfirmed`, `ewayBillNumber`, `ewayBillStatus`, `ewayBillValidUpto`, `liabilityAccepted`, `status`, `whatsappTriggerStatus` | Milestone payment tracking (50/50), E-Way bill lifecycle, WhatsApp delivery tracking, trip transit duration. |
| **BookingDocument** | `bookingId`, `stage` (7 stages), `docNumber`, `s3Key`, `signedBy`, `uploadedById`, `verificationStatus`, `verifiedById` | 7-stage digital freight document audit trail with pre-signed private storage. |
| **BookingDispute** | `bookingId`, `raisedById`, `category`, `priority`, `status`, `description`, `resolution`, `resolvedById` | Commercial dispute management, cargo damage tracking, transit delay resolution. |
| **Checkpoint** | `bookingId`, `seq` (1..5), `name`, `lat`, `lng`, `radiusM`, `crossedAt`, `crossedBy`, `etaMinutes`, `notifiedAt` | Milestone progression, delay detection, geofenced ETA tracking, shipment health classifier. |
| **Match** | `loadId`, `truckId`, `loadOwnerId`, `truckOwnerId`, `bookingId`, `status`, `distanceKm`, `matchScore`, `tonnageCompatible`, `routeCompatible`, `budgetCompatible` | Persisted algorithmic matching pairs and WhatsApp notification trigger state. |
| **Payment** | `amount`, `currency`, `purpose` (`subscription`, `booking_advance`, `booking_balance`), `status`, `provider`, `providerOrderId`, `providerTxnId`, `paymentMethod`, `paidAt` | Platform financial ledger, transaction tracking, subscription revenue metrics. |
| **Subscription** | `plan` (`monthly`/`quarterly`/`annual`), `status` (`active`, `expired`, `cancelled`), `startedAt`, `expiresAt`, `autoRenew`, `providerOrderId` | Expiry-driven access control: contact reveal is gated on subscription **or** trial; booking creation and return-load contact reveal require an active paid subscription. |
| **Rating** | `bookingId`, `raterId`, `ratedUserId`, `rating`, `review`, `category` (`driver_service`, `factory_payment`, `overall`) | Post-trip counterparty trust scoring and review aggregation. |
| **Notification** | `userId`, `channel` (`whatsapp`, `sms`, `push`), `template`, `variables`, `recipient`, `content`, `status`, `providerMsgId` | Granular per-recipient communication log and audit trail. |

---

## 4. Live Backend APIs

All endpoints are hosted under `/api/v1`:

| Route | Method | Access | Functionality | Status |
|---|---|---|---|---|
| `/search/trucks` | `GET` | Authenticated | PostGIS radius search for **verified** trucks (`lat`, `lng`, `radius`, `truckType`, `minTonnage`); contact/registration fields masked. | `[Implemented]` |
| `/search/loads` | `GET` | Authenticated | PostGIS radius search for **open** freight loads (`lat`, `lng`, `radius`, `truckType`, `maxTonnage`); contact fields masked. | `[Implemented]` |
| `/search/:type/:id/reveal` | `POST` | Subscribed / Trial | Unlocks direct phone & WhatsApp contact details behind the paywall. | `[Implemented]` |
| `/pricing/estimate` | `POST` | Public | **Freight Rate Estimator**: Indicative rate range, ton-km calculation, and sensitivity breakdown. | `[Implemented]` |
| `/intelligence/pricing/estimate` | `POST` | Public | Pricing estimator alias endpoint. | `[Implemented]` |
| `/matches/my-matches` | `GET` | Authenticated | Algorithmic match pairings for the authenticated party. | `[Implemented]` |
| `/matches/load/:loadId` | `GET` | Authenticated | Matching trucks for a load posting within ≤50 km. | `[Implemented]` |
| `/matches/truck/:truckId` | `GET` | Authenticated | Matching open loads for a vehicle within ≤50 km. | `[Implemented]` |
| `/matching/truck/:truckId/return-loads` | `GET` | Truck owner | **Return-load discovery**: Ranked opportunities within 50 km; active subscription required for contacts. | `[Implemented]` |
| `/matches/truck/:truckId/return-loads` | `GET` | Truck owner | Compatibility alias of the canonical return-load endpoint. | `[Implemented]` |
| `/matches/evaluate` | `POST` | Authenticated | Evaluates candidate pairs and persists match records. | `[Implemented]` |
| `/compliance/trucks/:id` | `GET` | Owner / Admin | Complete truck compliance checklist (RC, insurance, fitness, permit, FASTag). | `[Implemented]` |
| `/compliance/trucks/:id/validate-rc` | `POST` | Truck Driver / Admin | Provider-backed Vahan RC validation with deterministic sandbox fallback; `Unavailable` surfaced when no credentials are configured. | `[Implemented — External Provider Dependent]` |
| `/compliance/trucks/:id/fastag` | `PATCH` | Truck Driver / Admin | Report FASTag readiness (`Active`, `LowBalance`, `Inactive`, `Unknown`). | `[Implemented]` |
| `/compliance/bookings/:id` | `GET` | Booking Party / Admin | Trip compliance checklist including E-Way Bill validity. | `[Implemented]` |
| `/compliance/bookings/:id/eway-bill` | `POST` | Factory Owner / Admin | Attach or update 12-digit GSTN E-Way Bill number and expiry. | `[Implemented]` |
| `/bookings/:id/documents` | `GET` | Booking Parties | List documents attached to the 7-stage document chain. | `[Implemented]` |
| `/bookings/:id/documents/upload-url` | `POST` | Booking Parties | Issue 5-minute pre-signed S3/MinIO PUT URL for direct upload. | `[Implemented]` |
| `/bookings/:id/documents` | `POST` | Booking Parties | Register uploaded trip document with metadata. | `[Implemented]` |
| `/bookings/:id/documents/:docId/download-url` | `GET` | Booking Parties | Generate 1-hour pre-signed secure download URL. | `[Implemented]` |
| `/bookings/:id/confirm-advance` | `PATCH` | Factory Owner | Confirm 50% loading advance release milestone. | `[Implemented]` |
| `/bookings/:id/confirm-balance` | `PATCH` | Factory Owner | Confirm 50% delivery balance release milestone upon POD. | `[Implemented]` |
| `/bookings/:id/disputes` | `POST` | Authenticated Party | Raise a counterparty commercial/transit dispute. | `[Implemented]` |
| `/admin/stats` | `GET` | Admin | Real-time platform aggregates (users, trucks, loads, bookings, revenue, KYC). | `[Implemented]` |
| `/admin/analytics` | `GET` | Admin | Time-scoped trip completion trend, revenue, and route efficiency heatmap. | `[Implemented]` |
| `/admin/intelligence` | `GET` | Admin | National Logistics Intelligence console backed by real DB aggregates (users, loads, trucks, bookings, payments, subscriptions, disputes, KYC docs, Vahan/FASTag/E-Way Bill). | `[Implemented]` |
| `/admin/disputes` | `GET` | Admin | Priority-sorted counterparty dispute queue. | `[Implemented]` |
| `/admin/disputes/:id/resolve` | `PATCH` | Admin | Resolve or reject counterparty dispute with audit notes. | `[Implemented]` |
| `/admin/booking-documents` | `GET` | Admin | Review queue of all trip documents across the marketplace. | `[Implemented]` |
| `/admin/booking-documents/:id/verify` | `PATCH` | Admin | Verify or reject trip document with reviewer notes. | `[Implemented]` |

---

## 5. Detailed Intelligence Engines

### 5.1 Deterministic Match Scoring Engine (`matchingEngine.ts`)
Calculates a 0–100 compatibility score between a `Load` and a `Truck` (weights from `MATCH_SCORE_WEIGHTS` in the shared package):
- **Capacity Compatibility (35 pts)**: Vehicle payload capacity vs required freight tonnage. A ≥70% load-to-truck utilisation scores the full 35; an oversized-but-fitting lorry scores 25.
- **Body Type Fit (25 pts)**: Exact match (`Open` vs `Open`, `Container` vs `Container`) or a compatible configuration.
- **Proximity Score (20 pts)**: Distance-based decay inside the discovery radius (server enforces a 50 km cap via `maxProximityKm`).
- **KYC & Verification Boost (15 pts)**: Verified vehicles receive trust score elevation.
- **Corridor Preference Boost (5 pts)**: Alignment with the driver's `preferredDestinations`.
- **Budget gate (optional, not a score component)**: when enabled, a shipper budget more than 15% below the shared benchmark estimate caps the score at 65 and emits a warning. The API passes `budget: true` so persisted matches and WhatsApp alerts only fire for commercially viable pairs.

### 5.2 Freight Rate Estimator (`pricingEngine.ts`)
Exposed via `POST /api/v1/pricing/estimate` and `POST /api/v1/intelligence/pricing/estimate`:
- **Base Ton-Km Economics** (base rate + loading/unloading buffer):
  - `Open` standard lorry: ₹3.40 / ton-km, handling ₹2,500
  - `Container`: ₹4.10 / ton-km, handling ₹3,500
  - `OpenBody` (heavy flatbed trailer): ₹3.15 / ton-km, handling ₹3,000
- **Distance Scaling**:
  - `> 500 km`: 6% regional long-haul discount
  - `> 1000 km`: 12% ultra-long-haul scale discount
- **Output Metrics**: target recommended price (rounded to the nearest ₹100), min/max range bounds (−10% / +15%), price sensitivity table (±10% tonnage variance with cost-per-additional-ton), alternative body-type comparison, long-haul adjustment, and a transparent explanation string.
- **Confidence label**: `HIGH` when a distance is supplied, `MEDIUM` when coordinates are supplied, otherwise `BENCHMARK`.

### 5.3 Return-Load & Backhaul Discovery (`returnLoadEngine.ts` & `ReturnLoadsService`)
Exposed via `GET /api/v1/matching/truck/:truckId/return-loads`:
- **Drop-Off Hub Resolution**:
  1. Explicit query coordinates (`destinationLat`, `destinationLng`)
  2. Valid unloading point of the latest completed booking for the truck and its current owner
  3. Current truck GPS position (`currentLat`, `currentLng`)
  4. Unresolved hub: empty opportunities, no load query (preferred destination names inform ranking only)
- **Spatial Discovery**: Queries positive, capacity-fitting open loads within a default/max **50 km** spherical pickup radius. PostGIS `ST_DWithin` and its numeric-coordinate fallback both filter before limiting to the nearest 100 candidates. A partial GiST expression index supports pickup proximity.
- **Safe UI Integration**: Driver dashboard truck/radius selection, rank explanations and explicit loading/empty/error states; booking/assistant API failures never substitute sample trucks or unbounded local recommendations.
- **Ranking Weights**:
  - Match score compatibility: 55 pts
  - Pickup deadhead distance from drop-off hub: 15 pts
  - Payload capacity utilization: 12 pts
  - Truck body type fit: 6 pts
  - Price rate vs benchmark: 7 pts
  - Preferred return corridor: 5 pts
- **Paywall Protection**: Shipper `name` and `phone` are masked (`locked: true`) unless the requesting user holds an active, started and unexpired subscription. Trial-only accounts remain masked on this endpoint. The truck must belong to the caller regardless of subscription status. See [return-loads-api.md](return-loads-api.md) for the full contract.

### 5.4 Shipment Risk & Attention Classifier (`shipmentIntelligence.ts`)
Classifies booking journeys into operational health states. Conditions are evaluated in priority order (highest first), and the winning tier always carries an explicit `whyReason`:

1. **`COMPLETED`** — Booking completed and POD balance confirmed.
2. **`ACTION REQUIRED`** — Completed but delivery balance not confirmed, or the 50% loading advance is unconfirmed after the booking reached `Confirmed`/`InTransit`.
3. **`DELAYED`** — `expectedDeliveryAt` passed while the booking is not completed, or an `InTransit` vehicle whose latest checkpoint `crossedAt` (falling back to `startedAt` while no checkpoint has been crossed) is strictly older than 6 hours.
4. **`ATTENTION REQUIRED`** — WhatsApp dispatch trigger `Failed`, E-Way Bill number missing on an active booking, or an attached E-Way Bill whose lifecycle has lapsed (`ewayBillStatus` Expired/Invalid or `ewayBillValidUpto` in the past).
5. **`LOW RISK`** — Booking cancelled, still `Pending` counterparty confirmation, or `Confirmed` awaiting the first checkpoint check-in.
6. **`ON TRACK`** — Checkpoints progressing on schedule with advance confirmed.

Every assessment exposes `statusTier`, `badgeVariant`, `whyReason`, `riskSummary`, `requiredActions` (urgency + typed action: `CONFIRM_ADVANCE`, `CONFIRM_BALANCE`, `EWAY_BILL`, `WHATSAPP_RETRY`, `DELAY_INVESTIGATION`, `OVERDUE_DELIVERY`, `LIABILITY`), the 50/50 commercial milestone split, delay magnitudes (`lastCheckpointAgeHours`, `deliveryOverdueHours`, `isEwayBillExpired`), and corridor milestone progress (`crossedCount`/`totalCheckpoints`, current location, next milestone, indicative ETA). `summarizeActiveShipmentsControlTower` aggregates the tiers for the Shipment Control Tower (`/tracking`) and booking deal room (`/booking/[id]`).

### 5.5 Operational Action Center (`actionCenterEngine.ts`)
Shared task derivation engine rendered by `ActionCenterCard` / `ActionCenterMenu` on the Web dashboard shell (`/dashboard/*`, `UnifiedDashboard`) and on the Next.js Admin console (`/admin/dashboard`). The standalone Vite admin SPA does not import the shared engine — it reads the same data via `GET /api/v1/admin/*`:
- **Factory Owner Tasks**: Pending loading advance payments, missing E-Way bill assignments, unassigned open freight postings, delivered shipments awaiting balance release, expiring subscriptions/trial.
- **Truck Driver Tasks**: Vehicle KYC document verification pending/rejected, expiring RC/Insurance documents, FASTag low balance alert, confirmed bookings awaiting advance payment from shipper, return-load opportunities.
- **Transporter Tasks** (unified workspace at `/dashboard/transporter`): Combines factory-owner and truck-driver operational tasks — load postings, truck KYC, return-load opportunities and booking milestones — in one dashboard.
- **Admin Tasks**: Pending truck KYC document review queue, unresolved counterparty disputes, pending trip document review queue.

**Owner-only listing management.** Each freight load and truck listing belongs to the user who created it. The `factory_owner` side can manage only its own loads, the `truck_driver` side only its own trucks, and the `transporter` workspace shows both its own loads and its own trucks — but never another user's listings.

- **Priority Sorting**: `HIGH` → `MEDIUM` → `LOW` with direct operational deep-links.

### 5.6 National Admin Intelligence Aggregation (`GET /api/v1/admin/intelligence`)

The admin intelligence console is a real-data dashboard, not a client-side approximation. It is consumed by `apps/web/src/app/admin/intelligence/page.tsx` through `adminApi.getIntelligence()` and is backed by `AdminService.getIntelligence()` in `apps/api/src/admin/admin.service.ts`.

**Real metrics (direct DB measurement):**
- **Users**: total registered platform users.
- **Loads**: total, open, in-transit, and completed postings.
- **Trucks**: total fleet, RTO/RC (`verificationStatus`) verified fleet, Vahan/Parivahan (`vahanStatus = Verified`) fleet, and FASTag (`fastagStatus`) breakdown (active / low-balance / inactive / unknown).
- **Bookings**: total, completed, and in-transit counts plus per-booking E-Way Bill lifecycle (`ewayBillStatus`) as active / expired / invalid / pending and coverage rate.
- **Payments**: gross successful payment volume and successful subscription payment volume.
- **Subscriptions**: total, active, and active trial users.
- **Disputes**: total, open, investigating, resolved, rejected.
- **Documents / KYC**: total, verified, pending, rejected plus aggregate document compliance rate and truck KYC approval rate.

**Estimated metrics (derived benchmarks):** national ₹/ton-km benchmark, on-time transit rate, average transit hours, empty-km saved estimate, and dispute resolution rate.

**Predictive metrics (projected):** projected monthly freight volume, national demand-to-supply index, and empty-run reduction potential per trip.

**Corridor rule:** corridor cards are rendered only with at least 2 matching load/booking records; otherwise the response marks the corridor `INSUFFICIENT_DATA` and the administrator UI keeps the transparency notice without manufacturing a number.

---

## 6. Future Roadmap Items

| Item | Architectural Requirements | Target Milestone |
|---|---|---|
| **Multi-Driver Live IoT Telematics** | Continuous streaming GPS ingestion, Redis geospatial time-series stream, AIS-140 device webhook integration. | Phase 3 |
| **Direct ULIP / Parivahan API Bridge** | Production Ministry of Road Transport & Highways ULIP gateway authentication, automated vehicle RC scraping. | Phase 3 |
| **Escrow Smart Split Payouts** | Cashfree Payouts / Auto-split API integration for programmatic 50/50 advance and balance milestone settlement. | Phase 4 |
| **Automated NIC E-Way Bill GSP Fetch**| Direct GSP connection to auto-fetch EWB data, verify Part-A/Part-B assignments, and alert on validity expiration. | Phase 4 |

---

## 7. Verification & Production Gate Summary

- **TypeScript Typecheck**: All packages (`packages/shared`, `packages/database`, `apps/api`, `apps/web`, `apps/admin`) typecheck cleanly.
- **Unit & Logic Tests**: Matching engine, pricing engine, return-load engine, shipment intelligence, and action center tests verified.
- **Live Server Integration**: All services operational across designated ports (API: 3002, Web: 3010, Admin SPA: 3011).
