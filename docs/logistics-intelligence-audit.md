# LorryCarry — Logistics Platform Intelligence Audit

**Version:** 1.0.0  
**Architect:** Principal Product Engineer & Logistics Platform Architect  
**Status:** Approved for Implementation  

---

## 1. Executive Summary

LorryCarry is an open, direct truck-load marketplace for Indian freight connecting cargo owners (shippers/traders) and verified lorry operators (truck drivers/fleet operators) without broker commissions. 

The core infrastructure—including PostGIS geospatial indexing, SMS/WhatsApp OTP authentication, AWS S3 KYC verification, Cashfree subscription payments, and 5-stage checkpoint tracking—is solid and operationally stable. However, the application currently functions primarily as a transactional CRUD tool.

This audit establishes the blueprint for evolving LorryCarry into a **Logistics Intelligence Platform**, empowering participants with:
- Deterministic, explainable matching algorithms
- Dynamic freight rate estimation
- Return load & empty-run minimization
- Real-time shipment risk intelligence
- Role-specific operational action centers

---

## 2. Existing Data Available in Database

Based on our inspection of `packages/database/prisma/schema.prisma`:

| Model | Available Fields & Capabilities | Intelligence Potential |
|---|---|---|
| **User** | `id`, `phone`, `name`, `role` (`factory_owner`, `truck_driver`, `admin`), timestamps | Role-based permissioning, user identity verification, account maturity. |
| **Load** | `tonnageRequired`, `loadingAddress`, `loadingPin`, `loadingLat`, `loadingLng`, `loadingPoint` (PostGIS), `unloadingAddress`, `unloadingPin`, `unloadingLat`, `unloadingLng`, `unloadingPoint` (PostGIS), `truckType`, `minLengthFt`, `minHeightFt`, `urgent`, `maxPrice`, `advancePayable`, `expectedDeliveryAt`, `status` (`Open`, `Matched`, `InTransit`, `Completed`, `Cancelled`) | Distance calculations, vehicle compatibility, budget constraints, urgency matching, delivery timeline adherence. |
| **Truck** | `registrationNumber`, `bodyType` (`Open`, `Container`, `OpenBody`), `lengthFt`, `heightFt`, `tonnageCapacity`, `currentLat`, `currentLng`, `currentLocation` (PostGIS), `serviceableRadiusKm`, `preferredDestinations` (JSON array of cities), `verificationStatus` (`Pending`, `Verified`, `Rejected`), `verifiedAt` | Proximity scoring, route matching, capacity utilization, compliance scoring, return-corridor matching. |
| **Document** | `truckId`, `type` (`RC`, `Insurance`), `docNumber`, `s3Url`, `verificationStatus`, `verifiedAt`, `verifiedBy` | KYC completeness index, vehicle compliance verification badge. |
| **Booking** | `loadId`, `truckId`, `factoryOwnerId`, `truckDriverId`, `agreedPrice`, `advanceConfirmed`, `balanceConfirmed`, `ewayBillNumber`, `liabilityAccepted`, `status` (`Pending`, `Confirmed`, `InTransit`, `Completed`, `Cancelled`), `startedAt`, `completedAt` | Commercial terms tracking, payment milestone state, E-Way bill compliance, transit duration analytics. |
| **Checkpoint** | `bookingId`, `seq` (1 to 5), `name`, `lat`, `lng`, `radiusM`, `crossedAt`, `crossedBy`, `etaMinutes`, `notifiedAt` | Milestone progression, transit delay detection, geofenced ETA tracking, shipment risk scoring. |
| **Payment** | `amount`, `currency`, `purpose` (`subscription`, `booking_advance`, `booking_balance`), `status` (`Success`, `Pending`, `Failed`), `providerOrderId`, `providerTxnId`, `paymentMethod`, `paidAt` | Revenue analytics, subscription monetization, cashflow health. |
| **Subscription** | `plan`, `status` (`active`, `expired`, `cancelled`), `startedAt`, `expiresAt` | Paywall status, feature access gating, transporter contact reveal eligibility. |

---

## 3. Existing APIs Available

| Route | Method | Access | Functionality |
|---|---|---|---|
| `/search/trucks` | `GET` | Authenticated | PostGIS radius search for verified trucks (`lat`, `lng`, `radiusKm`, `truckType`, `minTonnage`). Returns distance in km. |
| `/search/loads` | `GET` | Authenticated | PostGIS radius search for open freight loads (`lat`, `lng`, `radiusKm`, `truckType`, `maxTonnage`). |
| `/search/:type/:id/reveal` | `POST` | Authenticated + Subscribed | Unlocks transporter/shipper phone and direct WhatsApp contact. |
| `/search/subscription-status` | `GET` | Authenticated | Checks if requesting user has an active contact reveal subscription. |
| `/loads/my-loads` | `GET` | Factory Owner | Fetches all posted loads created by current user with status and booking counts. |
| `/loads/:id` | `GET` | Factory Owner | Fetches single load details with contact info. |
| `/loads` | `POST` | Factory Owner | Creates new load with automated MapmyIndia geocoding & PostGIS point generation. |
| `/trucks/my-trucks` | `GET` | Truck Driver | Fetches registered trucks with document KYC statuses. |
| `/trucks` | `POST` | Truck Driver | Registers truck with geocoding, PostGIS location, and preferred destination corridors. |
| `/trucks/:id/documents` | `POST` | Truck Driver | Uploads RC / Insurance documents to AWS S3 private bucket. |
| `/bookings` | `POST` | Factory Owner | Creates formal commercial booking (50/50 terms, liability, E-Way bill). |
| `/bookings/:id` | `GET` | Authenticated Party | Returns booking details, 5-stage checkpoints, agreed price, payment flags. |
| `/bookings/:id/confirm-advance` | `PATCH` | Factory Owner | Confirms 50% loading advance release. |
| `/bookings/:id/confirm-balance` | `PATCH` | Factory Owner | Confirms 50% delivery balance release on POD receipt. |
| `/matches/truck/:truckId` | `GET` | Authenticated | Open loads matching a vehicle within the 50 km live-match filter (shared match engine). |
| `/matches/truck/:truckId/return-loads` | `GET` | Authenticated | **Return-load (backhaul) discovery.** Resolves the drop-off hub (destination override → latest booking destination → truck GPS → preferred corridor), queries open loads around it (PostGIS `ST_DWithin`, ≤300 km) and ranks them with the shared return-load engine. Shipper contacts masked without an active subscription/trial. |
| `/admin/stats` | `GET` | Admin | Real database aggregates for total users, loads, trucks, bookings, revenue, and pending KYC. |
| `/admin/analytics` | `GET` | Admin | Trip completion trend, earnings breakdown, active booking pipeline and route efficiency heatmap (`range` = 30/90/180/365 days). |
| `/admin/documents/pending` | `GET` | Admin | Fetches list of unverified vehicle documents. |
| `/admin/documents/:id/verify` | `PATCH` | Admin | Approves or rejects RC/Insurance documents. |

---

## 4. Missing Intelligence Capabilities

1. **Deterministic Match Scoring Engine**: No structured score evaluating vehicle capacity fit, body type, proximity radius, preferred corridors, and verification status.
2. **Transparent Freight Rate Estimator**: No rule-based calculation estimating price bands based on distance, tonnage, truck type, and fuel benchmarks.
3. **Empty-Run & Return Load Intelligence** *(delivered)*: Transporters dropping off cargo in destination cities could not see incoming loads available for their return trip. Now served end-to-end by `GET /matches/truck/:truckId/return-loads` (`apps/api/src/matching/return-loads.service.ts`) on top of the shared `evaluateBackhaulOpportunities` + `rankReturnLoadOpportunities` engines, and consumed by the truck-driver dashboard, the booking detail return-load section and the AI Freight Assistant.
4. **Shipment Risk & Attention Analyzer**: Bookings lack risk classification (e.g. `ON TRACK`, `DELAYED`, `MISSING E-WAY BILL`, `PENDING ADVANCE`).
5. **Operational Action Center**: No unified notification/action drawer highlighting required user actions (e.g. KYC missing, payment confirmation pending, unverified documents).
6. **Smart Empty State Guidance**: Default views showed simple "No data" texts without interactive steps on how to initiate freight matching.

---

## 5. Features Implementable Immediately (Without Database Schema Changes)

Using existing database fields and REST endpoints:

1. **Smart Truck Match Scoring Engine (Client & Shared Library)**:
   - Calculate deterministic scores (0%–100%) based on:
     - Capacity Match: `truck.tonnageCapacity >= load.tonnageRequired`
     - Body Type Match: `truck.bodyType === load.truckType`
     - Proximity Match: Normalized distance from loading coordinates vs `serviceableRadiusKm`
     - Verification Match: `truck.verificationStatus === 'Verified'` (+15% boost)
     - Corridor Match: `truck.preferredDestinations` contains unloading city (+15% boost)
   - Generate explainable reasons array (e.g., "Capacity compatible", "Verified transporter", "Within 12km").

2. **Freight Rate Estimator (Client & Shared Engine)**:
   - Calculate estimated market range and recommended target price using Indian logistics formulas:
     - Base rate per ton-km based on truck body type (`Open`: ₹3.2–₹4.0/ton-km, `Container`: ₹3.8–₹4.6/ton-km, `OpenBody`/Trailer: ₹3.0–₹3.7/ton-km).
     - Fixed loading/unloading terminal fee component.
     - Distance derived from coordinates or MapmyIndia routing.
     - Display transparent breakdown and explicit "Estimated rate" badge.

3. **Transporter Empty-Run & Return Load Scanner** *(delivered as a backend API)*:
   - Filter available open loads whose `loadingPoint` is within the discovery radius (default 150 km, max 300 km) of the truck's drop-off hub — the latest booking destination, the truck's current location, or a declared preferred corridor.
   - Rank deterministically on match score (55) · pickup deadhead (15) · payload utilisation (12) · body type (6) · rate vs benchmark (7) · preferred corridor (5).
   - Exclude the operator's own freight and mask shipper contact details behind the subscription/trial paywall.

4. **Shipment Risk & Attention Classifier**:
   - Compute real-time operational risk status for active bookings:
     - `ACTION REQUIRED`: Advance payment pending (`advanceConfirmed === false`), or missing E-Way bill for high-value loads.
     - `ON TRACK`: All milestones crossed on schedule.
     - `ATTENTION REQUIRED`: More than 6 hours since last checkpoint update while in-transit.
     - `COMPLETED`: 5/5 checkpoints crossed and balance confirmed.

5. **Operational Action Center**:
   - Aggregate pending tasks from real models (truck document status, pending booking payments, open unassigned loads).

6. **Enhanced Admin & Operations Intelligence**:
   - Display verified vs pending ratio, conversion velocity, and real payment breakdowns.

---

## 6. Features Requiring Future Backend / Schema Changes (Roadmap)

| Feature | Required Changes | Reason |
|---|---|---|
| **Multi-Driver Live Telematics** | Continuous IoT / GPS stream table, Redis geospatial geofencing stream. | Existing model uses 5 static checkpoints triggered on geofence entry rather than real-time GPS coordinates. |
| **Automated Vahan API Scraper** | Integration with Ministry of Road Transport (Parivahan/ULIP API). | Currently verified manually by Admin via S3 document upload. |
| **Escrow Smart Payouts** | Cashfree Payouts / Auto-split API integration. | Current model records peer-to-peer 50/50 commercial confirmations. |
| **Automated E-Way Bill Verification** | NIC E-Way bill GSP API connection. | Currently recorded as a string field `ewayBillNumber`. |

---

## 7. Recommended Implementation Order

1. **Step 1: Logistics Intelligence Utilities Engine (`src/lib/intelligence/`)**
   - Implement `matchingEngine.ts` (Deterministic match score & explanation generator).
   - Implement `pricingEngine.ts` (Rule-based rate estimator & market range generator).
   - Implement `shipmentIntelligence.ts` (Shipment health, risk classifier & milestone analytics).
   - Implement `actionCenterEngine.ts` (Dynamic operational task aggregator).

2. **Step 2: Factory Owner Freight Intelligence Dashboard**
   - Upgrade `apps/web/src/app/dashboard/factory-owner/page.tsx` with live matching trucks feed, match scores, rate benchmarks, and intelligent workflow empty states.

3. **Step 3: Truck Driver Earnings & Return-Load Intelligence Dashboard**
   - Upgrade `apps/web/src/app/dashboard/truck-driver/page.tsx` with "Where to earn next", nearby matching freight, return-load opportunities, and compliance reminders.

4. **Step 4: Smart Marketplace Search & Bid Intelligence**
   - Upgrade `apps/web/src/app/search/page.tsx` with match score badges, explainable match dropdowns, rate comparisons, and transporter recommendations.

5. **Step 5: Shipment & Booking Risk Intelligence**
   - Upgrade `apps/web/src/app/booking/[id]/page.tsx` with operational health badges (`ON TRACK`, `ACTION REQUIRED`), automated action alerts, and milestone timeline analytics.

6. **Step 6: Operational Action Center**
   - Inject the Action Center into the shared dashboard shell and navbar.

7. **Step 7: Admin Operations Intelligence Upgrade**
   - Upgrade `apps/web/src/app/admin/page.tsx` with live conversion metrics and compliance health indicators.

8. **Step 8: Verification & Production Gate**
   - Run typecheck, lint, Next.js 15 production build, and live test on port 3010.
