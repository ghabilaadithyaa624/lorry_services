# 🚚 LorryCarry — Direct Freight & Truck Marketplace

LorryCarry is a high-performance freight logistics monorepo platform connecting factory owners (shippers/cargo owners), truck drivers (fleet operators) and transporters (who operate on both sides of the marketplace) directly across India with zero broker commissions. Built with **NestJS**, **Next.js 15 (App Router)**, **PostgreSQL (PostGIS)**, **Redis**, **Cashfree Payments**, **Gupshup WhatsApp API / MSG91**, and **MapmyIndia / Mappls**.

---

## 🚦 Implementation Status Matrix

| Component / Feature | Implementation Status | Provider / Dependency Status |
| :--- | :--- | :--- |
| **Direct Load & Truck Matching** | `[Implemented]` | PostGIS spatial queries + 100-pt deterministic match scoring (capacity 35 · body 25 · proximity 20 · verification 15 · corridor 5), budget-gated server-side, proximity capped at 50 km |
| **Return-Load (Backhaul) Radar** | `[Implemented]` | Drop-off hub resolution + six-factor backhaul rank scoring (match 55 · deadhead 15 · payload 12 · body 6 · rate 7 · corridor 5) |
| **Freight Rate Estimator** | `[Implemented]` | Rule-based Indian freight economics engine (`POST /api/v1/pricing/estimate`) |
| **Operational Action Center** | `[Implemented]` | Dynamic multi-source task aggregator on the Web dashboard shell and the Next.js Admin console |
| **5-Stage Checkpoint Tracking** | `[Implemented]` | Geofenced waypoint logging, ETA calculations, incident reporting — checkpoint based, not continuous GPS |
| **Vahan RC Validation** | `[Implemented — External Provider Dependent]` | Deterministic sandbox fallback in dev/non-prod; production verification requires Parivahan/ULIP provider credentials (`VAHAN_API_KEY`) |
| **FASTag Readiness & E-Way Bill** | `[Implemented]` | FASTag state is owner/admin-reported (Vahan does not expose it); 12-digit E-Way Bill format & lifecycle validation |
| **7-Stage Booking Document Chain** | `[Implemented — External Provider Dependent]` | Direct-to-storage S3/MinIO pre-signed PUT/GET URLs |
| **Booking Dispute Resolution** | `[Implemented]` | Counterparty dispute creation & admin investigation workflow |
| **Subscription Paywall & Free Trial** | `[Implemented — External Provider Dependent]` | 90-day trial auto-granted at registration (unlocks search contact reveals); booking creation requires an active paid subscription; Cashfree/Razorpay/Stripe checkout + webhooks |
| **WhatsApp & SMS Notifications** | `[Implemented — External Provider Dependent]` | Gupshup / MSG91; static console OTP fallback (`123456`) in local development |
| **Live Multi-Driver IoT Telematics** | `[Roadmap]` | Requires continuous streaming GPS & Redis time-series stream |
| **Direct ULIP / Parivahan API Bridge** | `[Roadmap]` | Replaces the sandbox adapter with a direct government ULIP portal bridge |
| **Escrow Smart Split Payouts** | `[Roadmap]` | Automated split disbursement via Cashfree Payouts API |
| **Automated NIC E-Way Bill GSP Fetch** | `[Roadmap]` | Direct GSTN/NIC gateway sync for automatic EWB status updates |

---

## 🌟 Key Features

- **Direct Freight & Truck Matching**: PostGIS-powered geospatial discovery with a default 50 km radius; the persisted algorithmic matching engine enforces a hard 50 km proximity cap (`MAX_PROXIMITY_KM`), evaluated by a deterministic 100-point compatibility algorithm (capacity fit, body type, proximity, verification, and preferred corridors) with an optional budget gate.
- **Return Load (Backhaul) Intelligence**: Truck-owner-only discovery (`GET /api/v1/matching/truck/:truckId/return-loads`, with the existing `/matches` alias retained). Uses the latest completed booking destination or valid truck GPS, with a **50 km default and hard cap**, shared six-factor ranking, and active-subscription-only shipper contacts. Missing coordinates never trigger an unbounded search. The driver dashboard offers truck/radius selection, explanations, and explicit empty/error states. See [the return-load API contract](docs/return-loads-api.md) for overrides, ranking, privacy, and deployment details.
- **Explainable Freight Pricing Engine**: Instant indicative benchmark rate calculation (`POST /api/v1/pricing/estimate`) using ton-km economics across Open, Container, and OpenBody configurations, with distance decay, handling buffers, and ±10% payload sensitivity analysis.
- **Operational Action Center**: Unified task aggregator on the Web dashboard shell (`ActionCenterCard` & `ActionCenterMenu` on `/dashboard/*`) and the Next.js Admin console (`/admin/dashboard`). Dynamically flags unverified KYC documents, pending 50% loading advances, missing E-Way bills, unpaid balance milestones, expiring subscriptions, and WhatsApp delivery alerts.
- **Zero Broker Commissions**: Standardized commercial terms (50% advance at loading, 50% balance upon delivery confirmation) with transparent milestone release controls.
- **5-Stage Trip Tracking**: Geofence checkpoint trail (`seq: 1..5`) with milestone crossing logs, ETA calculations, incident reporting, and Proof of Delivery (POD) image submission.
- **Verification & Compliance (Vahan + FASTag + E-Way Bill)**:
  - **Vahan RC Validation**: Format verification, masked PII (owner/chassis/engine), cached snapshot storage, and automated sandbox fallback (`/compliance/trucks/:id/validate-rc`).
  - **Compliance Checklists**: Truck-level and booking-level verification checklists (`/compliance/trucks/:id`, `/compliance/bookings/:id`) aggregating RC validity, insurance expiry, fitness certificate, FASTag status, and E-Way Bill lifecycle.
  - **Verified Badges**: Search listings and vehicle cards display verified status badges and FASTag readiness indicators.
- **7-Stage Booking Digital Document Chain**: Complete digital freight trail (`BOOKING` → `EWAY_BILL` → `LOADING` → `TRANSIT` → `DELIVERY` → `POD` → `BALANCE`). Documents upload securely to private S3/MinIO via 5-minute pre-signed PUT URLs and download via 1-hour pre-signed GET URLs. Counterparties manage uploads; admins verify or reject via a dedicated review queue.
- **Booking Dispute Management**: In-flight dispute filing (`Payment`, `CargoDamage`, `Delay`, `Document`, `Other`) with priority levels (`Low`, `Medium`, `High`, `Critical`), counterparty evidence, and admin investigation audit trails.
- **Subscription Paywall & 90-Day Free Trial**: Expiry-driven access control. Every new account is auto-granted a one-time **90-day free trial** that unlocks search contact reveals. Booking creation is gated on an **active paid subscription** (`POST /api/v1/bookings` returns `SUBSCRIPTION_REQUIRED` otherwise), and return-load shipper contacts additionally require a paid subscription (trial-only accounts stay masked there). Plans: **Monthly ₹999** · **Quarterly ₹2,499** · **Annual ₹7,999** (all "unlimited"), with Cashfree, Razorpay, and Stripe checkout and HMAC/SDK-verified webhooks.
- **Multi-Channel Notification Center**: Granular delivery logging for WhatsApp, SMS, and push notifications via Gupshup / MSG91, backed by user preferences and in-app notification read receipts.
- **Transporter Unified Workspace**: A dedicated `transporter` role that operates on both sides of the marketplace — posting freight loads (like a `factory_owner`) and listing trucks (like a `truck_driver`) from a single dashboard at `/dashboard/transporter`. Write access remains ownership-scoped: a transporter can only edit or delete its own loads and trucks. Permission helpers `canManageLoads` / `canManageTrucks` (in `apps/api/src/common/utils/roles.util.ts`) centralize the "who may post what" decision.
- **Dual Admin Portals**:
  - **Next.js Admin Console** (`/admin/*` inside the web app): Full-featured operations console with KPI analytics, KYC document queue, listing controls, dispute resolution, time-scoped revenue charts, and empirical national freight intelligence (`/admin/intelligence`, `/admin/risk`).
  - **Vite React Admin SPA** (`apps/admin` on port 3011): Dedicated lightweight admin portal (React Router DOM, Lucide icons, Recharts) mirroring the shared dashboard/KYC/listings/subscriptions/users/bookings/disputes/analytics views; the Next.js console additionally hosts the intelligence and risk monitors.

---

## 📁 Repository Structure

```text
lorry_services/
├── apps/
│   ├── api/          # NestJS 10 backend API service (Port 3002)
│   ├── web/          # Next.js 15 Web Application & Admin Portal (Port 3010)
│   ├── admin/        # Vite 5 + React 18 standalone Admin Dashboard (Port 3011)
│   └── mobile/       # React Native / Expo mobile application workspace
├── packages/
│   ├── database/     # Prisma ORM schema, PostGIS extensions, migrations & seeds
│   └── shared/       # Shared TypeScript types, constants & pure intelligence engines
├── docs/             # Technical architecture & operational documentation
├── docker-compose.yml # PostgreSQL (PostGIS), Redis & MinIO services
├── turbo.json        # Turborepo task pipeline configuration
├── package.json      # Monorepo root workspace configuration
└── README.md         # Project documentation
```

---

## 🧠 Shared Intelligence Layer (`@lorrycarry/shared`)

All deterministic logistics maths lives in **one** place — [`packages/shared/src/intelligence/`](packages/shared/src/intelligence) — so the API, web and admin surfaces can never disagree on a number. (The Expo mobile workspace stays a thin REST client and does not bundle the shared package.)

| Module | Exports |
| :--- | :--- |
| `geo.ts` | `calculateGeoDistance` (Haversine) |
| `pricingEngine.ts` | `estimateFreightRate`, `normalizeTruckType` |
| `matchingEngine.ts` | `calculateMatchScore`, `evaluateBackhaulOpportunities`, `evaluateBudgetFit`, `sortMarketplaceItems`, `rateMatchScore` |
| `returnLoadEngine.ts` | Backhaul / return-load ranking |
| `shipmentIntelligence.ts` | `assessShipmentIntelligence`, `summarizeActiveShipmentsControlTower` |
| `actionCenterEngine.ts` | `deriveOperationalTasks`, `summarizeOperationalTasks` |

**Purity rules** (enforced by review): no DOM/`window`, React, Next.js, Prisma or Node-only APIs; deterministic for a given input; presentation concerns (Tailwind classes, icons) stay in the consuming app, which receives neutral tokens such as `tone` / `badgeVariant` instead.

**Consumers.** `apps/api/src/matching/matching.service.ts` calls `calculateMatchScore` / `calculateGeoDistance` directly and keeps only its Prisma queries, PostGIS radius filtering, persistence and WhatsApp dispatch. The web modules under `apps/web/src/lib/intelligence/` are thin re-export shims plus browser-only adapters (REST payload mapping, Tailwind tone → class), so existing `@/lib/intelligence` imports keep working.

**Budget compatibility.** `calculateMatchScore` scores **Capacity 35 + BodyType 25 + Proximity 20 + Verification 15 + Corridor 5 = 100**. The budget check is an *optional gate* (`MatchScoringOptions.budget`), not a score component:

- **API passes `budget: true`** — it is the system of record for the persisted `matches.budget_compatible` column and for the WhatsApp alerts sent to transporters, so a match must be commercially viable before it is stored or broadcast.
- **Clients default to the ungated score** — a shipper still sees physically compatible trucks when their stated budget is below benchmark, rather than an empty result set. Clients can opt into the same gate by passing `budget: true`.

Both paths run the identical scoring function, so the gate changes *which* matches surface, never *how* they are scored.

Run the suite with `npm test` (Turborepo) or `npm --prefix packages/shared test` — covering scoring weights, budget gating, pricing economics, backhaul ranking, shipment risk and action-center derivation.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | NestJS 10, TypeScript 5, Passport JWT, Swagger / OpenAPI, Throttler, Helmet |
| **Web Frontend** | Next.js 15 (App Router), React 18, Tailwind CSS (dual light/dark semantic tokens), Lucide Icons, Headless UI |
| **Admin SPA (Vite)** | React 18, Vite 5, React Router DOM 6, Recharts, Lucide Icons |
| **Mobile Workspace** | React Native, Expo 51, React Navigation, single-instance MMKV storage (typed auth/session accessors; thin REST client; `apps/mobile` is a workspace, not a build target of the monorepo pipelines) |
| **Database & GIS** | PostgreSQL 15, PostGIS 3.4 spatial queries (`ST_DWithin`, `ST_Distance`), Prisma ORM 5 |
| **Caching & Queue** | Redis 7 / Upstash Redis |
| **Payments & Billing** | Cashfree PG, Razorpay, Stripe (Webhook HMAC verification) |
| **Notifications** | Gupshup (WhatsApp Cloud API), MSG91 (SMS OTP) |
| **Geospatial & Routing**| MapmyIndia / Mappls REST APIs (Geocoding, Reverse Geocoding, Distance) |
| **Object Storage** | AWS S3 / MinIO (Private document storage, Pre-signed URL workflow) |

---

## 🌐 Services, Ports & Dashboard Routes

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **NestJS Backend API** | `http://localhost:3002/api/v1` | REST API service |
| **OpenAPI / Swagger UI** | `http://localhost:3002/api/docs` | Interactive Swagger API documentation |
| **Main Web Portal** | `http://localhost:3010` | SaaS-style public website (homepage, search, corridors, procurement, pricing, request demo, help, security, privacy, terms) |
| **Request Demo Page** | `http://localhost:3010/request-demo` | Public B2B lead form — role-aware demo walkthrough request with WhatsApp hand-off |
| **Unified Dashboard Router** | `http://localhost:3010/dashboard` | Role-aware dashboard dispatcher |
| **Factory Owner Dashboard** | `http://localhost:3010/dashboard/factory-owner` | Canonical shipper dashboard (load management, matching trucks) |
| **Truck Driver Dashboard** | `http://localhost:3010/dashboard/truck-driver` | Canonical fleet-operator dashboard (fleet, return loads, earnings) |
| **Transporter Dashboard** | `http://localhost:3010/dashboard/transporter` | Unified both-sides workspace (freight postings + truck listings in one dashboard) |
| **Next.js Admin Console** | `http://localhost:3010/admin` | Full operational management console |
| **Vite Admin Dashboard** | `http://localhost:3011` | Standalone Vite + React admin interface |
| **Prisma Studio** | `http://localhost:5555` | Database management GUI (`npm run db:studio`) |

### Canonical User Roles & Legacy Route Aliases

The platform operates on a **Factory Owner · Truck Driver · Transporter** model, where the transporter is a both-sides operator who may post freight loads AND list trucks from one workspace:

| Canonical Role (`UserRole`) | Business Persona | Canonical Dashboard Route | Legacy Role Aliases (Normalized) |
| :--- | :--- | :--- | :--- |
| `factory_owner` | Cargo owner / Shipper / Factory — posts freight loads | `/dashboard/factory-owner` | `load_owner` |
| `truck_driver` | Lorry owner-operator / Fleet driver — lists trucks and runs trips | `/dashboard/truck-driver` | `truck_owner`, `driver` |
| `transporter` | Both-sides operator — posts loads AND lists trucks (unified workspace) | `/dashboard/transporter` | — |
| `admin` | Platform operator / KYC verifier | `/admin/dashboard` | — |

**Permissions summary:**
- `factory_owner` may post and manage freight loads; cannot list trucks.
- `truck_driver` may list and manage trucks; cannot post loads.
- `transporter` may post loads **and** list trucks, all from the unified `/dashboard/transporter` workspace; ownership-scoped edits (a transporter may only modify their own loads and trucks).
- `admin` has full platform oversight (KYC verification, dispute resolution, intelligence, user management).

Permission helpers `canManageLoads` / `canManageTrucks` (in `apps/api/src/common/utils/roles.util.ts`) centralize the "who may post what" decision. Write access is always ownership-scoped at the service layer.

**Legacy Route Redirects:**
- `/dashboard/load-owner` → 307 Redirect to `/dashboard/factory-owner`
- `/dashboard/truck-owner` → 307 Redirect to `/dashboard/truck-driver`
- `/dashboard/driver` → 307 Redirect to `/dashboard/truck-driver`

**Database migration path.** The `UserRole` enum contains the four canonical values (`factory_owner`, `truck_driver`, `transporter`, `admin`). The `transporter` role was introduced alongside the canonicalization migration [`20260904000000_canonicalize_user_roles`](packages/database/prisma/migrations/20260904000000_canonicalize_user_roles/migration.sql), which also converted legacy rows: `load_owner` → `factory_owner`, `truck_owner` → `truck_driver`, and `driver` → `truck_driver`. Legacy rows are backfilled *before* the old enum type is dropped, so no row is ever orphaned, and the `CASE` mapping makes the migration re-runnable against a database that skipped the earlier in-place rename.

**Normalization at the boundary.** Deployed clients, cached cookies and long-lived JWTs may still carry a legacy label, so every entry point normalizes before use — `normalizeRole()` in [`apps/web/src/lib/roles.ts`](apps/web/src/lib/roles.ts), [`apps/mobile/src/lib/roles.ts`](apps/mobile/src/lib/roles.ts), [`packages/shared/src/types/index.ts`](packages/shared/src/types/index.ts) and [`apps/api/src/common/utils/roles.util.ts`](apps/api/src/common/utils/roles.util.ts) (used by `RolesGuard`). Legacy labels are **never persisted**: only canonical roles are written to the database, cookies or storage.

> **Note:** the `bookings.load_owner_id` / `bookings.truck_owner_id` **columns** intentionally keep their original names — they are foreign keys, not role values, and are mapped in Prisma via `@relation("LoadOwnerBookings")` / `@relation("TruckOwnerBookings")`.

### Public vs Protected Web Routes

Route visibility is defined **once** in [`apps/web/src/lib/publicRoutes.ts`](apps/web/src/lib/publicRoutes.ts) and enforced by
[`apps/web/src/middleware.ts`](apps/web/src/middleware.ts). `robots.ts` and `sitemap.ts` read the same table so crawlers are
never pointed at a URL that answers with a login redirect.

| Visibility | Routes |
| :--- | :--- |
| **Public** (no session required) | `/`, `/login`, `/role-select`, `/search` (+ `/search/trucks`, `/search/loads`), `/privacy`, `/terms`, `/security`, `/help`, `/subscribe`, `/subscription`, `/request-demo`, `/api/*`, `/images/*`, `/_next/*`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/favicon.ico`, `/icon.png`, `/apple-icon.png` |
| **Protected** (307 → `/login?redirect=<path>`) | `/dashboard/*`, `/admin/*`, `/my-loads`, `/my-trucks`, `/my-listings`, `/bookings`, `/booking/*`, `/documents`, `/notifications`, `/settings`, `/profile` |
| **Default-deny** | Every other path (`/tracking`, `/analytics`, `/post-load`, …) requires a session unless it is added to the public allowlist |

Prefix matching is segment-aware: `/terms` and `/terms/archive` are public, `/terms-of-service` is not.

**Pricing pages are public, checkout is not.** `/subscribe` and `/subscription` render plans, prices, the 90-day free trial terms and what a pass unlocks to anonymous visitors — no authenticated request is made and no private subscription status is rendered until a session exists. Clicking **Subscribe / Upgrade / Pay** without a session redirects to `/login?redirect=/subscribe?plan=<plan>` and returns the user to the pricing page with their plan preselected so they can complete checkout. Payment initiation itself stays protected: `POST /api/v1/subscriptions/initiate` requires a valid bearer token, so the client-side gate is UX only and not the enforcement boundary.

Covered by `publicRoutes.spec.ts`, `middleware.spec.ts` and `seo.spec.ts` (`npm --prefix apps/web test`).

---

## 🛡️ Admin Portal Routes

The Next.js Admin Portal (`http://localhost:3010/admin`) and Vite Admin SPA (`http://localhost:3011`) provide identical administrative management capabilities:

| Route (Next.js) | Route (Vite SPA) | Purpose & Features |
| :--- | :--- | :--- |
| `/admin/dashboard` | `/` | Operational KPI metrics, active trips, dispute counts, recent transactions |
| `/admin/kyc` | `/kyc` | Pending RC and Insurance KYC document queue with Verify/Reject modal and notes |
| `/admin/listings` | `/listings` | Active freight loads and registered trucks directory with direct truck verification |
| `/admin/subscriptions` | `/subscriptions` | Subscription directory with active/expired filtering and manual plan extension |
| `/admin/users` | `/users` | User management directory with role filtering (`factory_owner`, `truck_driver`, `transporter`, `admin`) |
| `/admin/bookings` | `/bookings` | Comprehensive commercial booking records with route details, pricing, and lifecycle state |
| `/admin/disputes` | `/disputes` | Dispute queue sorted by priority (`Critical` → `Low`) with investigation and resolution tools |
| `/admin/analytics` | `/analytics` | Time-scoped trip completion trends, revenue breakdown, and corridor efficiency heatmaps |
| `/admin/intelligence` | — | National Freight Intelligence Console driven by real DB aggregates (users, loads, trucks, bookings, payments, subscriptions, disputes, KYC, Vahan/FASTag/E-Way Bill) with Real, Estimated, and Predictive transparency labels |
| `/admin/risk` | — | Operational risk monitor for in-transit shipments and compliance gaps |

---

## 📡 Comprehensive API Route Reference

All backend REST endpoints are served under the global prefix `/api/v1`.

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/csrf-token` | Public | Fetch CSRF protection token |
| `POST` | `/api/v1/auth/otp/request` | Public | Request SMS/WhatsApp OTP for phone authentication |
| `POST` | `/api/v1/auth/otp/verify` | Public | Verify OTP code, normalize role, and issue JWT access/refresh tokens |
| `POST` | `/api/v1/auth/token/refresh` | Public | Refresh expired JWT access token via the refresh token |
| `POST` | `/api/v1/auth/logout` | Public (refresh token in body) | Revoke the presented refresh token and clear client auth state |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Revoke all active sessions for the current user |

### 2. User Profile & Preferences (`/api/v1/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Authenticated | Retrieve authenticated user profile, active role, and subscription status |
| `PATCH` | `/api/v1/users/me` | Authenticated | Update user display name and profile details |
| `GET` | `/api/v1/users/documents` | Authenticated | List all uploaded documents across user's vehicles |
| `GET` | `/api/v1/users/activity` | Authenticated | Retrieve recent user activity logs |
| `GET` | `/api/v1/users/notifications` | Authenticated | Retrieve in-app notification feed with read states |
| `POST` | `/api/v1/users/notifications/read` | Authenticated | Mark single notification as read |
| `POST` | `/api/v1/users/notifications/read-all` | Authenticated | Mark all notifications as read |
| `GET` | `/api/v1/users/preferences` | Authenticated | Get user preferences (theme, language, distance units, notification opt-ins) |
| `PATCH` | `/api/v1/users/preferences` | Authenticated | Update user preferences |

### 3. Freight Loads (`/api/v1/loads`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/loads` | Factory Owner, Transporter | Post new freight load with automated geocoding & PostGIS points |
| `GET` | `/api/v1/loads/my-loads` | Factory Owner, Transporter | List freight loads posted by authenticated user with booking counts |
| `GET` | `/api/v1/loads/:id` | Authenticated | Retrieve load details, pickup/drop coordinates, and commercial budget |
| `PATCH` | `/api/v1/loads/:id/status` | Factory Owner, Transporter | Update load status (`Open`, `Matched`, `InTransit`, `Completed`, `Cancelled`) |
| `DELETE` | `/api/v1/loads/:id` | Factory Owner, Transporter | Delete load posting (if no active bookings exist) |

### 4. Truck Fleet Management (`/api/v1/trucks`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/trucks` | Truck Driver, Transporter | Register vehicle with capacity, body type, location, and preferred corridors |
| `GET` | `/api/v1/trucks/my-trucks` | Truck Driver, Transporter | List registered trucks with KYC document verification status |
| `GET` | `/api/v1/trucks/:id` | Authenticated | Retrieve truck details, specifications, and compliance checklist |
| `POST` | `/api/v1/trucks/:id/documents/:type`| Truck Driver, Transporter | Upload RC or Insurance document record for a truck |
| `POST` | `/api/v1/documents/generate-upload-url` | Authenticated | Generate a pre-signed S3 upload URL for direct vehicle/KYC document upload |
| `PATCH` | `/api/v1/trucks/:id/location` | Truck Driver, Transporter | Update the truck's current location from an `address` string (server-side Mappls geocode → lat/lng + PostGIS point) and re-evaluate proximity matches |

### 5. Geospatial Search & Contact Reveal (`/api/v1/search`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/search/trucks` | Authenticated | PostGIS radius search for **verified** trucks (`lat`, `lng`, `radius`, `truckType`, `minTonnage`); contact/registration fields masked |
| `GET` | `/api/v1/search/loads` | Authenticated | PostGIS radius search for **open** loads (`lat`, `lng`, `radius`, `truckType`, `maxTonnage`); contact fields masked |
| `POST` | `/api/v1/search/:type/:id/reveal` | Subscribed / Trial | Unlock direct phone and WhatsApp contact details for a load or truck (requires an active paid subscription **or** the active 90-day free trial) |
| `GET` | `/api/v1/search/subscription-status`| Authenticated | Check whether user holds an active paid subscription |
| `GET` | `/api/v1/search/geocode` | Authenticated | Forward geocode address string into latitude/longitude coordinates |
| `GET` | `/api/v1/search/reverse-geocode` | Authenticated | Reverse geocode coordinates into city/state address details |
| `GET` | `/api/v1/search/suggestions` | Authenticated | Autocomplete location suggestions |

### 6. Commercial Bookings & Disputes (`/api/v1/bookings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/bookings` | Factory Owner | Create commercial booking with 50/50 terms (**requires an active paid subscription**; a free trial alone returns `SUBSCRIPTION_REQUIRED`) |
| `GET` | `/api/v1/bookings/my-bookings` | Authenticated Party | List bookings for current user (as factory owner or truck driver) |
| `GET` | `/api/v1/bookings/:id` | Authenticated Party | Get booking details, agreed price, checkpoints, and payment milestones |
| `PATCH` | `/api/v1/bookings/:id/status` | Authenticated Party | Update booking lifecycle status (`Confirmed`, `InTransit`, `Completed`, `Cancelled`) |
| `PATCH` | `/api/v1/bookings/:id/confirm-advance` | Factory Owner | Confirm 50% loading advance release milestone |
| `PATCH` | `/api/v1/bookings/:id/confirm-balance` | Factory Owner | Confirm 50% delivery balance release milestone upon POD sign-off |
| `POST` | `/api/v1/bookings/:id/disputes` | Authenticated Party | Raise a counterparty dispute against a booking |

**Payment milestone rules.** `confirm-advance` / `confirm-balance` are the authoritative way to record the 50/50 split; `PATCH /bookings/:id/status` is retained for lifecycle transitions and backward compatibility. Both milestone endpoints enforce, in order: the caller must be a party to the booking (otherwise `404`, so booking existence is not leaked), the caller must be the **cargo owner** releasing the money (`403` — a truck driver cannot confirm their own payout), the booking must not be `Cancelled` (`400`), the milestone must not already be confirmed (`400`), and the **advance must be confirmed before the balance** (`400`). On success the endpoint sets `advanceConfirmed`/`advanceConfirmedAt` or `balanceConfirmed`/`balanceConfirmedAt`.

### 7. Booking Digital Document Chain (`/api/v1/bookings/:bookingId/documents` & `/api/v1/admin/booking-documents`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/bookings/:bookingId/documents` | Booking Parties | List documents across all 7 stages (`BOOKING`, `EWAY_BILL`, `LOADING`, `TRANSIT`, `DELIVERY`, `POD`, `BALANCE`) |
| `POST` | `/api/v1/bookings/:bookingId/documents/upload-url` | Booking Parties | Request 5-minute pre-signed S3/MinIO upload URL for a document stage |
| `POST` | `/api/v1/bookings/:bookingId/documents` | Booking Parties | Register confirmed uploaded document with metadata and reference number |
| `GET` | `/api/v1/bookings/:bookingId/documents/:documentId/download-url` | Booking Parties | Generate 1-hour pre-signed secure download URL |
| `GET` | `/api/v1/admin/booking-documents` | Admin | Review queue of all trip documents across the marketplace |
| `PATCH` | `/api/v1/admin/booking-documents/:id/verify` | Admin | Verify or reject a trip document with reviewer notes |

### 8. Verification & Compliance (`/api/v1/compliance`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/compliance/trucks/:id` | Owner / Admin | Retrieve complete vehicle compliance checklist (RC, insurance, fitness, permit, FASTag) |
| `POST` | `/api/v1/compliance/trucks/:id/validate-rc` | Truck Driver, Transporter, Admin | Trigger Vahan RC check via the external provider API (or deterministic sandbox fallback when `VAHAN_API_KEY` is unset) |
| `PATCH` | `/api/v1/compliance/trucks/:id/fastag` | Truck Driver, Transporter, Admin | Report FASTag readiness status (`Active`, `LowBalance`, `Inactive`, `Unknown`) |
| `GET` | `/api/v1/compliance/bookings/:id` | Booking Party / Admin | Retrieve trip compliance checklist including E-Way Bill status |
| `POST` | `/api/v1/compliance/bookings/:id/eway-bill` | Factory Owner / Admin | Attach or update 12-digit GSTN E-Way Bill number and expiry timestamp |

### 9. Freight Pricing & Rate Estimation (`/api/v1/pricing` & `/api/v1/intelligence/pricing`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/pricing/estimate` | Public | Calculate indicative freight rate estimate, market range, and sensitivity breakdown |
| `POST` | `/api/v1/intelligence/pricing/estimate` | Public | Benchmark pricing alias endpoint |

**Sample Request (`POST /api/v1/pricing/estimate`):**
```json
{
  "tonnage": 18,
  "truckType": "Container",
  "distanceKm": 840,
  "loadingLat": 19.0760,
  "loadingLng": 72.8777,
  "unloadingLat": 12.9716,
  "unloadingLng": 77.5946
}
```

### 10. Matching Engine & Return Loads (`/api/v1/matches`, `/api/v1/matching`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/matches/my-matches` | Authenticated | List persistent algorithmic matches for current user |
| `GET` | `/api/v1/matches/load/:loadId` | Authenticated | Discover matching trucks for a posted load (proximity ≤50 km) |
| `GET` | `/api/v1/matches/truck/:truckId` | Authenticated | Discover matching open loads for a truck (proximity ≤50 km) |
| `GET` | `/api/v1/matching/truck/:truckId/return-loads` | Truck owner | **Return-load opportunities** — open loads near completed-trip destination/GPS, default/max 50 km; contacts require active subscription |
| `GET` | `/api/v1/matches/truck/:truckId/return-loads` | Truck owner | Backwards-compatible alias of the return-load endpoint |
| `POST` | `/api/v1/matches/evaluate` | Authenticated | Run matching engine across loads/trucks and persist candidate pairs |
| `POST` | `/api/v1/matches/evaluate/load/:loadId` | Authenticated | Evaluate and persist matches for a specific freight load |
| `POST` | `/api/v1/matches/evaluate/truck/:truckId` | Authenticated | Evaluate and persist matches for a specific vehicle |
| `POST` | `/api/v1/matches` | Authenticated | Manually create a candidate match pair |
| `GET` | `/api/v1/matches/:id` | Authenticated | Retrieve single match details with compatibility breakdown |
| `PATCH` | `/api/v1/matches/:id/status` | Authenticated | Update match state (`Pending`, `Booked`, `Completed`, `Cancelled`) |
| `DELETE` | `/api/v1/matches/:id` | Authenticated | Remove match pair |

Return-load parameters: `radius` (1–50 km, default 50), `limit` (1–50, default 10),
`minScore` (0–100), and an optional paired `destinationLat`/`destinationLng` override.
The nearest 100 eligible candidates are ranked before applying the response limit.
Trial-only accounts stay contact-masked on this endpoint. Apply the new partial
GiST index migration before production rollout. Full contract and checks:
[docs/return-loads-api.md](docs/return-loads-api.md).

### 11. Trip Checkpoint Tracking (`/api/v1/tracking`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tracking/:bookingId` | Authenticated Party | Retrieve 5-stage tracking trail, crossed waypoints, and ETA calculations |
| `POST` | `/api/v1/tracking/:bookingId/checkpoint` | Authenticated Party | Record milestone geofence crossing (`seq: 1..5`) |
| `POST` | `/api/v1/tracking/:bookingId/pod` | Authenticated Party | Submit Proof of Delivery (POD) image and consignee sign-off |
| `POST` | `/api/v1/tracking/:bookingId/incident` | Authenticated Party | Report transit breakdown, inspection delay, or route incident |

### 12. Payments Ledger (`/api/v1/payments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/booking/initialize` | Authenticated | Initialize Cashfree payment order for booking advance or balance |
| `PATCH` | `/api/v1/payments/booking/:paymentId/confirm` | Authenticated | Confirm successful payment receipt and update booking flags |
| `GET` | `/api/v1/payments/booking/:bookingId` | Authenticated Party | List payment records associated with a booking |
| `POST` | `/api/v1/payments/trip/complete` | Authenticated | Record trip settlement completion |
| `GET` | `/api/v1/payments/history` | Authenticated | Retrieve authenticated user's payment transaction history |
| `POST` | `/api/v1/payments/subscription/initialize` | Authenticated | Initialize payment session for subscription purchase |

### 13. Subscriptions & Paywall (`/api/v1/subscriptions`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/subscriptions/initiate` | Authenticated | Create subscription purchase order with gateway |
| `GET` | `/api/v1/subscriptions/status` | Authenticated | Check subscription status, 90-day free trial entitlement, and days remaining |
| `POST` | `/api/v1/subscriptions/webhook/cashfree` | Public (Signed) | Process Cashfree subscription webhook events (HMAC verified) |
| `POST` | `/api/v1/subscriptions/webhook/razorpay` | Public (Signed) | Process Razorpay subscription webhook events (HMAC verified) |
| `POST` | `/api/v1/subscriptions/webhook/stripe` | Public (Signed) | Process Stripe subscription webhook events (SDK verified) |
| `GET` | `/api/v1/subscriptions/callback/:orderId` | Public | Payment gateway return redirect callback |
| `GET` | `/api/v1/subscriptions/verify/:orderId` | Public / Authenticated | Verify subscription order completion |

### 14. Ratings & Feedback (`/api/v1/ratings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ratings` | Authenticated Party | Submit 1-5 star rating and review for completed booking |
| `GET` | `/api/v1/ratings/summary/:userId` | Authenticated | Retrieve user aggregate rating and category breakdown |
| `GET` | `/api/v1/ratings/user/:userId` | Authenticated | List reviews received by a user |
| `GET` | `/api/v1/ratings/pending` | Authenticated | List completed bookings awaiting user feedback |

### 15. In-App Notifications (`/api/v1/notifications`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Authenticated | List notifications with read status |
| `GET` | `/api/v1/notifications/unread-count` | Authenticated | Get count of unread notifications |
| `POST` | `/api/v1/notifications/read` | Authenticated | Mark notification receipt as read |
| `POST` | `/api/v1/notifications/read-all` | Authenticated | Mark all notification receipts as read |

### 16. Admin Operations Console (`/api/v1/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/stats` | Admin | Real-time platform aggregates (users, trucks, loads, bookings, revenue) |
| `GET` | `/api/v1/admin/analytics` | Admin | Time-scoped trip completion trend, revenue, and corridor heatmap (`range=30/90/180/365`) |
| `GET` | `/api/v1/admin/intelligence` | Admin | National Logistics Intelligence console backed by real DB aggregates and classified as Real / Estimated / Predictive |
| `GET` | `/api/v1/admin/users` | Admin | Filtered user directory with operational statistics |
| `GET` | `/api/v1/admin/documents/pending` | Admin | Pending vehicle KYC documents queue |
| `PATCH` | `/api/v1/admin/documents/:id/verify` | Admin | Verify or reject KYC document with reviewer notes |
| `POST` | `/api/v1/admin/trucks/:id/vahan-check` | Admin | Trigger manual Vahan RC check for a truck |
| `PATCH` | `/api/v1/admin/trucks/:id/verify` | Admin | Manually update truck aggregate verification status |
| `GET` | `/api/v1/admin/trucks` | Admin | List all registered trucks for admin compliance & risk evaluation |
| `GET` | `/api/v1/admin/subscriptions` | Admin | List all active/expired user subscriptions |
| `GET` | `/api/v1/admin/bookings` | Admin | List all marketplace bookings with full lifecycle details |
| `GET` | `/api/v1/admin/disputes` | Admin | Priority-sorted dispute queue |
| `PATCH` | `/api/v1/admin/disputes/:id/resolve` | Admin | Resolve or reject counterparty dispute with decision notes |

`GET /api/v1/admin/intelligence` returns a real, DB-backed national logistics summary. `realMetrics` is computed directly from the platform tables: `users`, `loads`, `trucks`, `bookings`, `payments`, `subscriptions`, `bookingDisputes`, `documents`, and the compliance fields on `trucks` (`vahanStatus`, `fastagStatus`) and `bookings` (`ewayBillStatus`). `estimatedMetrics` stays benchmark/derived (national ₹/ton-km, on-time rate, empty-run savings, dispute resolution) and `predictiveMetrics` stays projected (monthly volume, demand-to-supply index, empty-run reduction potential). Every corridor card follows the strict **minimum 2 matching records** rule and returns `INSUFFICIENT_DATA` below that threshold.

### 17. External Webhooks (`/api/v1/webhooks`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/webhooks/cashfree` | Public (Signed) | Cashfree payment gateway webhook handler |
| `POST` | `/api/v1/webhooks/gupshup` | Public (Signed) | Gupshup WhatsApp Cloud delivery receipt webhook |

### 18. Health & Observability (`/api/v1/health`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Liveness probe returning server uptime and status |
| `GET` | `/api/v1/health/ready` | Public | Readiness probe verifying PostgreSQL and Redis connections |

---

## ⚙️ Provider Requirements & Fallbacks

| Provider / Service | Production Requirement | Local Dev / Sandbox Fallback Behavior |
| :--- | :--- | :--- |
| **PostgreSQL + PostGIS** | PostgreSQL 15 with the `postgis` extension enabled | Local Docker container (`docker compose up -d postgres`, exposed on port `5438`) or a cloud instance (Supabase/Neon/RDS) |
| **Redis** | Redis 7+ server / Upstash Redis URL | Local Docker container (`docker compose up -d redis`, port `6388`); in-memory store fallback for OTP and rate limiting when Redis is unreachable |
| **Cashfree PG** | `CASHFREE_APP_ID` (alias `CASHFREE_API_KEY`), `CASHFREE_SECRET_KEY`; `NODE_ENV=production` selects the live API base URL | Sandbox base URL by default; when credentials are missing checkout calls run in simulation/dev mode |
| **Razorpay** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Optional gateway; order verification via the server SDK; webhook HMAC checked when the webhook secret is configured |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional gateway; unsigned webhooks are rejected when `STRIPE_WEBHOOK_SECRET` is unset |
| **Gupshup (WhatsApp)** | `GUPSHUP_APP_ID`, `GUPSHUP_APP_TOKEN`, `GUPSHUP_SENDER` | In dev without credentials, sends are skipped/logged. OTP requests additionally return the static dev OTP `123456` when no SMS provider is configured, `ALLOW_TEST_OTP=true`, or the phone is the seed number `+918072025106` (never in production) |
| **MSG91 (SMS OTP)** | `MSG91_API_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID` | Mock/console fallback in non-production environments |
| **MapmyIndia / Mappls** | `MAPMYINDIA_API_KEY` (or `MAPPLS_API_KEY`) | Geocode/reverse-geocode/suggestions return null and logging warns when the key is missing; distance math falls back to Haversine |
| **Vahan (mParivahan)** | `VAHAN_API_KEY` (+ optional `VAHAN_API_URL`, `VAHAN_API_TOKEN`, `VAHAN_CACHE_TTL_HOURS`) | Deterministic sandbox snapshots when the key is unset — auto-disabled in production; `VAHAN_ALLOW_SANDBOX=false` disables it in dev too |
| **AWS S3 / MinIO** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` / `AWS_S3_BUCKET_NAME`, `S3_ENDPOINT` or `AWS_S3_ENDPOINT` (+ `AWS_S3_FORCE_PATH_STYLE`) | Local MinIO container via `docker-compose.yml` (`docker compose up -d minio`, API port `9008`, console `9009`) or a cloud S3 bucket |
| **Google Fonts** | Reachable `fonts.googleapis.com` at Next.js build time | Local font files fallback for air-gapped CI environments |

---

## 🚀 Getting Started & Setup Commands

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd lorry_services
npm install
```

### 2. Start Local Infrastructure (PostgreSQL + Redis + MinIO)

The API needs PostgreSQL with PostGIS, Redis, and (for document uploads) S3/MinIO. The easiest local setup is the bundled `docker-compose.yml`:

```bash
docker compose up -d postgres redis minio
```

This exposes PostgreSQL on port `5438`, Redis on `6388`, and MinIO on `9008` (API) / `9009` (console) — matching the defaults in `.env.example`. Cloud alternatives (Supabase/Neon/RDS, Upstash, AWS S3) work by changing the same variables.

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Review and populate the key environment variables:
- `DATABASE_URL` / `DIRECT_URL`: PostgreSQL connection string(s) with PostGIS enabled
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Secure cryptographic secrets
- `CSRF_SECRET`: Secret key for CSRF token generation
- `CASHFREE_APP_ID` & `CASHFREE_SECRET_KEY`: Cashfree sandbox/production keys (leave empty for simulation/dev mode)
- `VAHAN_API_KEY`: Parivahan/ULIP provider key (leave empty for the deterministic sandbox in dev)
- `GUPSHUP_APP_ID` / `GUPSHUP_APP_TOKEN`, `GUPSHUP_SENDER`, and `MSG91_API_KEY`: WhatsApp/SMS delivery (optional locally; when unset, non-production OTP requests return the static dev OTP `123456`)
- `ALLOW_TEST_OTP`: set `true` in non-production to force the static dev OTP for any phone (defaults to `false`)
- `MAPMYINDIA_API_KEY` (alias) or `MAPPLS_API_KEY`: Mappls geocoding (optional locally)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET_NAME` / `S3_ENDPOINT`: object storage (MinIO defaults are pre-filled for local)
- `PORT`: Backend API port (default `3002`)
- `CLIENT_URL`: Main web application URL (`http://localhost:3010`)
- `ADMIN_URL`: Admin portal URL (`http://localhost:3011`)

### 4. Database Setup & Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Apply all database migrations
npm run db:migrate

# (Optional) Seed initial demo loads, trucks, and users
npm run db:seed
```

### 5. Running the Development Servers

To start all monorepo applications concurrently via Turborepo:

```bash
npm run dev
```

Or start specific workspace servers individually:

```bash
# Start NestJS Backend API (Port 3002)
npm --prefix apps/api run dev

# Start Next.js Web App & Admin Portal (Port 3010)
npm --prefix apps/web run dev

# Start Vite React Admin Dashboard (Port 3011)
npm --prefix apps/admin run dev

# Launch Prisma Studio Database GUI (Port 5555)
npm run db:studio
```

---

## 📜 Available NPM Workspace Scripts

| Command | Workspace | Description |
| :--- | :--- | :--- |
| `npm run dev` | Root | Runs the monorepo dev tasks (API, Web, Admin SPA, database watch) via Turborepo |
| `npm run build` | Root | Builds every workspace that defines a build task (`database`, `shared`, `api`, `web`, `admin`; the Expo `mobile` workspace defines none) |
| `npm run lint` | Root | Runs ESLint where a lint task exists (`apps/api`, `apps/web`) |
| `npm test` | Root | Runs Jest suites where a test task exists (`packages/shared`, `apps/api`, `apps/web`) |
| `npm run db:generate` | Root (`packages/database`) | Generates the Prisma ORM client library |
| `npm run db:migrate` | Root (`packages/database`) | Executes Prisma database migrations |
| `npm run db:seed` | Root (`packages/database`) | Seeds initial demonstration data |
| `npm run db:studio` | Root (`packages/database`) | Launches Prisma Studio GUI at `http://localhost:5555` |

### Air-Gapped & Restricted Network Builds

When building in restricted CI environments:

1. **Prisma Engines**: Pre-seed the Prisma engine binaries and export paths:
   ```bash
   export PRISMA_QUERY_ENGINE_LIBRARY=/path/to/libquery_engine.so.node
   export PRISMA_SCHEMA_ENGINE_BINARY=/path/to/schema-engine
   ```
2. **Google Fonts**: Ensure `fonts.googleapis.com` is accessible or configure local font overrides in `apps/web/src/app/layout.tsx`.

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.
