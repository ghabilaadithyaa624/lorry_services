# LorryCarry — Logistics Platform Intelligence Audit

**Version:** 2.0.0  
**Architect:** Principal Product Engineer & Logistics Platform Architect  
**Status:** Implemented & Verified in Monorepo  

---

## 1. Executive Summary

LorryCarry is an open, direct freight marketplace connecting Indian cargo owners (shippers, factories, traders) and verified lorry operators (truck drivers, fleet owners) without broker commissions.

This audit documents the transition of LorryCarry from a transactional CRUD application into a **Logistics Intelligence Platform**. The intelligence layer is powered by deterministic algorithms in `@lorrycarry/shared`, dedicated NestJS backend endpoints, and interactive Next.js 15 / Vite frontends.

---

## 2. Intelligence Capabilities Status Matrix

| Capability | Scope | Status | Implementation Details |
|---|---|---|---|
| **Deterministic Match Scoring** | Shared + API + Web | `[Implemented]` | 100-pt compatibility scoring (`matchingEngine.ts`, `/api/v1/matches/*`, `/search`) |
| **Freight Rate Estimator** | Shared + API + Web | `[Implemented]` | Rule-based rate estimator (`pricingEngine.ts`, `POST /api/v1/pricing/estimate`) |
| **Return-Load (Backhaul) Radar** | Shared + API + Web | `[Implemented]` | Drop-off hub backhaul engine (`returnLoadEngine.ts`, `GET /api/v1/matching/truck/:truckId/return-loads`) |
| **Shipment Risk & Attention Analyzer**| Shared + Web + Admin | `[Implemented]` | Real-time booking risk status (`shipmentIntelligence.ts`, `/booking/[id]`, `/admin/risk`) |
| **Operational Action Center** | Shared + Web + Admin | `[Implemented]` | Dynamic multi-source operational task aggregator (`actionCenterEngine.ts`) |
| **Vahan RC Validation** | API + Web + Admin | `[Implemented - External Provider Dependent]` | Vahan API adapter with sandbox fallback (`/api/v1/compliance/trucks/:id/validate-rc`) |
| **FASTag Readiness & E-Way Bill** | API + Web + Admin | `[Implemented]` | 12-digit E-Way Bill lifecycle validation & FASTag toll state tracking (`/api/v1/compliance/*`) |
| **7-Stage Booking Document Chain** | API + Web + Admin | `[Implemented]` | Pre-signed S3/MinIO upload/download chain (`/api/v1/bookings/:id/documents/*`) |
| **Booking Dispute Resolution** | API + Web + Admin | `[Implemented]` | Counterparty dispute filing & priority-sorted admin queue (`/api/v1/admin/disputes`) |
| **Subscription Paywall & 90-Day Trial**| API + Web | `[Implemented - External Provider Dependent]`| Expiry gate, 90-day trial lifecycle, Cashfree/Razorpay/Stripe webhooks |
| **Multi-Driver Live IoT Telematics** | Backend + Stream | `[Roadmap]` | Requires continuous streaming GPS & Redis time-series stream |
| **Direct ULIP / Parivahan API Bridge**| Integration | `[Roadmap]` | Direct government ULIP portal bridge to replace sandbox adapter |
| **Automated Escrow Smart Payouts** | Payment Engine | `[Roadmap]` | Automated milestone disbursement via Cashfree Payouts API |
| **Direct NIC E-Way Bill GSP Fetch** | Compliance | `[Roadmap]` | Direct GSP gateway connection for automatic EWB status syncing |

---

## 3. Database Models & Intelligence Assets

Inspected from `packages/database/prisma/schema.prisma`:

| Model | Fields & Key Capabilities | Intelligence Asset & Usage |
|---|---|---|
| **User** | `id`, `phone`, `name`, `role` (`factory_owner`, `truck_driver`, `admin`), `trialStartedAt`, `trialEndsAt`, `trialConvertedAt` | Identity verification, paywall gating, 90-day free trial entitlement tracking. |
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
| **Subscription** | `plan`, `status` (`active`, `expired`, `cancelled`), `startedAt`, `expiresAt`, `autoRenew`, `providerOrderId` | Expiry-driven access control gating contact reveal and booking initiation. |
| **Rating** | `bookingId`, `raterId`, `ratedUserId`, `rating`, `review`, `category` (`driver_service`, `factory_payment`, `overall`) | Post-trip counterparty trust scoring and review aggregation. |
| **Notification** | `userId`, `channel` (`whatsapp`, `sms`, `push`), `template`, `variables`, `recipient`, `content`, `status`, `providerMsgId` | Granular per-recipient communication log and audit trail. |

---

## 4. Live Backend APIs

All endpoints are hosted under `/api/v1`:

| Route | Method | Access | Functionality | Status |
|---|---|---|---|---|
| `/search/trucks` | `GET` | Authenticated | PostGIS radius search for verified trucks (`lat`, `lng`, `radiusKm`, `truckType`, `minTonnage`). | `[Implemented]` |
| `/search/loads` | `GET` | Authenticated | PostGIS radius search for open freight loads (`lat`, `lng`, `radiusKm`, `truckType`, `maxTonnage`). | `[Implemented]` |
| `/search/:type/:id/reveal` | `POST` | Subscribed / Trial | Unlocks direct phone & WhatsApp contact details behind the paywall. | `[Implemented]` |
| `/pricing/estimate` | `POST` | Public | **Freight Rate Estimator**: Indicative rate range, ton-km calculation, and sensitivity breakdown. | `[Implemented]` |
| `/intelligence/pricing/estimate` | `POST` | Public | Pricing estimator alias endpoint. | `[Implemented]` |
| `/matches/my-matches` | `GET` | Authenticated | Algorithmic match pairings for the authenticated party. | `[Implemented]` |
| `/matches/load/:loadId` | `GET` | Authenticated | Matching trucks for a load posting within ≤50 km. | `[Implemented]` |
| `/matches/truck/:truckId` | `GET` | Authenticated | Matching open loads for a vehicle within ≤50 km. | `[Implemented]` |
| `/matching/truck/:truckId/return-loads` | `GET` | Truck owner | **Return-load discovery**: Ranked opportunities within 50 km; active subscription required for contacts. | `[Implemented]` |
| `/matches/truck/:truckId/return-loads` | `GET` | Truck owner | Compatibility alias of the canonical return-load endpoint. | `[Implemented]` |
| `/matches/evaluate` | `POST` | Authenticated | Evaluates candidate pairs and persists match records. | `[Implemented]` |
| `/compliance/trucks/:id` | `GET` | Authenticated | Complete truck compliance checklist (RC, insurance, fitness, permit, FASTag). | `[Implemented]` |
| `/compliance/trucks/:id/validate-rc` | `POST` | Authenticated | Live Vahan RC validation with external API / sandbox fallback. | `[Implemented - External Provider Dependent]` |
| `/compliance/trucks/:id/fastag` | `PATCH` | Authenticated | FASTag status report (`Active`, `LowBalance`, `Inactive`, `Unknown`). | `[Implemented]` |
| `/compliance/bookings/:id` | `GET` | Authenticated | Trip compliance checklist including E-Way Bill validity. | `[Implemented]` |
| `/compliance/bookings/:id/eway-bill` | `POST` | Authenticated Party | Attach or update 12-digit GSTN E-Way Bill number and expiry. | `[Implemented]` |
| `/bookings/:id/documents` | `GET` | Booking Parties | List documents attached to the 7-stage document chain. | `[Implemented]` |
| `/bookings/:id/documents/upload-url` | `POST` | Booking Parties | Issue 5-minute pre-signed S3/MinIO PUT URL for direct upload. | `[Implemented]` |
| `/bookings/:id/documents` | `POST` | Booking Parties | Register uploaded trip document with metadata. | `[Implemented]` |
| `/bookings/:id/documents/:docId/download-url` | `GET` | Booking Parties | Generate 1-hour pre-signed secure download URL. | `[Implemented]` |
| `/bookings/:id/confirm-advance` | `PATCH` | Factory Owner | Confirm 50% loading advance release milestone. | `[Implemented]` |
| `/bookings/:id/confirm-balance` | `PATCH` | Factory Owner | Confirm 50% delivery balance release milestone upon POD. | `[Implemented]` |
| `/bookings/:id/disputes` | `POST` | Authenticated Party | Raise a counterparty commercial/transit dispute. | `[Implemented]` |
| `/admin/stats` | `GET` | Admin | Real-time platform aggregates (users, trucks, loads, bookings, revenue, KYC). | `[Implemented]` |
| `/admin/analytics` | `GET` | Admin | Time-scoped trip completion trend, revenue, and route efficiency heatmap. | `[Implemented]` |
| `/admin/intelligence` | `GET` | Admin | Empirical National Logistics Intelligence console metrics. | `[Implemented]` |
| `/admin/disputes` | `GET` | Admin | Priority-sorted counterparty dispute queue. | `[Implemented]` |
| `/admin/disputes/:id/resolve` | `PATCH` | Admin | Resolve or reject counterparty dispute with audit notes. | `[Implemented]` |
| `/admin/booking-documents` | `GET` | Admin | Review queue of all trip documents across the marketplace. | `[Implemented]` |
| `/admin/booking-documents/:id/verify` | `PATCH` | Admin | Verify or reject trip document with reviewer notes. | `[Implemented]` |

---

## 5. Detailed Intelligence Engines

### 5.1 Deterministic Match Scoring Engine (`matchingEngine.ts`)
Calculates a 0–100 compatibility score between a `Load` and a `Truck`:
- **Capacity Compatibility (30 pts)**: Vehicle payload capacity vs required freight tonnage.
- **Body Type Fit (25 pts)**: Exact match (`Open` vs `Open`, `Container` vs `Container`) or compatible configuration.
- **Proximity Score (25 pts)**: Linear decay across vehicle's `serviceableRadiusKm` (default 50 km).
- **KYC & Verification Boost (10 pts)**: Verified vehicles receive trust score elevation.
- **Corridor Preference Boost (10 pts)**: Alignment with driver's `preferredDestinations`.

### 5.2 Freight Rate Estimator (`pricingEngine.ts`)
Exposed via `POST /api/v1/pricing/estimate` and `POST /api/v1/intelligence/pricing/estimate`:
- **Base Ton-Km Economics**:
  - `Open`: ₹3.20 – ₹4.00 / ton-km (base: ₹3.60)
  - `Container`: ₹3.80 – ₹4.60 / ton-km (base: ₹4.20)
  - `OpenBody` / Trailer: ₹3.00 – ₹3.70 / ton-km (base: ₹3.35)
- **Distance Scaling**:
  - `> 500 km`: 5% long-haul scale discount
  - `> 1000 km`: 10% ultra-long-haul scale discount
- **Handling Charges**: Fixed loading/unloading buffer (₹1,500 – ₹2,500 based on body type).
- **Output Metrics**: Target recommended price, min/max range bounds (-10% / +15%), price sensitivity table (±10% weight variance), alternative body type rate comparison, and transparent explanation.

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
Classifies active booking journeys into operational health states:
- `ACTION_REQUIRED`: Advance payment unconfirmed (`advanceConfirmed: false`), missing E-Way bill on active booking, or pending POD balance payment.
- `ATTENTION_REQUIRED`: More than 6 hours without checkpoint update while in transit.
- `ON_TRACK`: Checkpoints progressing on schedule with advance confirmed.
- `COMPLETED`: 5/5 checkpoints crossed, POD verified, and balance confirmed.

### 5.5 Operational Action Center (`actionCenterEngine.ts`)
Shared task derivation engine consumed across Next.js and Vite dashboards:
- **Factory Owner Tasks**: Pending loading advance payments, missing E-Way bill assignments, unassigned open freight postings, delivered shipments awaiting balance release, expiring subscriptions/trial.
- **Truck Driver Tasks**: Vehicle KYC document verification pending/rejected, expiring RC/Insurance documents, FASTag low balance alert, confirmed bookings awaiting advance payment from shipper, return-load opportunities.
- **Admin Tasks**: Pending truck KYC document review queue, unresolved counterparty disputes, pending trip document review queue.
- **Priority Sorting**: `HIGH` → `MEDIUM` → `LOW` with direct operational deep-links.

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
