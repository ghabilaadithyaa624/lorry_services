# 🚚 LorryCarry — Direct Freight & Truck Marketplace

LorryCarry is a high-performance freight logistics monorepo platform connecting factory owners (shippers/cargo owners) and truck drivers (transporters/fleet operators) directly across India with zero broker commissions. Built with **NestJS**, **Next.js 15 (App Router)**, **PostgreSQL (PostGIS)**, **Redis**, **Cashfree Payments**, **Gupshup WhatsApp API / MSG91**, and **MapmyIndia / Mappls**.

---

## 🚦 Implementation Status Matrix

| Component / Feature | Implementation Status | Provider / Dependency Status |
| :--- | :--- | :--- |
| **Direct Load & Truck Matching** | `[Implemented]` | PostGIS spatial queries + 100-pt deterministic match scoring |
| **Return-Load (Backhaul) Radar** | `[Implemented]` | Drop-off hub resolution + backhaul rank scoring |
| **Freight Rate Estimator** | `[Implemented]` | Rule-based Indian freight economics engine (`POST /api/v1/pricing/estimate`) |
| **Operational Action Center** | `[Implemented]` | Dynamic multi-source task aggregator across Web & Admin |
| **5-Stage Checkpoint Tracking** | `[Implemented]` | Geofenced waypoint logging, ETA, and incident reporting |
| **Vahan RC Validation** | `[Implemented]` | `[External Provider Dependent]` Sandbox fallback active; production requires Parivahan/ULIP API key |
| **FASTag Readiness & E-Way Bill** | `[Implemented]` | 12-digit E-Way Bill format validation & FASTag state tracking |
| **7-Stage Document Chain** | `[Implemented]` | `[External Provider Dependent]` Direct-to-storage S3/MinIO pre-signed PUT/GET URLs |
| **Booking Dispute Resolution** | `[Implemented]` | Counterparty dispute creation & admin investigation workflow |
| **Cashfree Paywall & Trial** | `[Implemented]` | `[External Provider Dependent]` 90-day free trial + Cashfree/Razorpay/Stripe webhooks |
| **WhatsApp & SMS Notifications** | `[Implemented]` | `[External Provider Dependent]` Gupshup / MSG91; console OTP fallback in local development |
| **Live Multi-Driver IoT Telematics** | `[Roadmap]` | Requires continuous streaming GPS & Redis time-series stream |
| **Direct ULIP / Parivahan API Bridge**| `[Roadmap]` | Replaces sandbox adapter with direct government ULIP portal bridge |
| **Escrow Smart Split Payouts** | `[Roadmap]` | Automated split disbursement via Cashfree Payouts API |

---

## 🌟 Key Features

- **Direct Freight & Truck Matching**: PostGIS-powered geospatial discovery within customizable search radii (≤50 km default), evaluated by a deterministic 100-point compatibility algorithm (capacity fit, body type, proximity, verification, and preferred corridors).
- **Return Load (Backhaul) Intelligence**: Dedicated backend backhaul discovery (`GET /api/v1/matches/truck/:truckId/return-loads`). Resolves drop-off hubs from active/recent bookings, truck GPS, or preferred corridors, querying open loads within ≤300 km and ranking by deadhead distance, payload fit, and rate benchmark. Shipper contacts are masked behind the subscription paywall.
- **Explainable Freight Pricing Engine**: Instant indicative benchmark rate calculation (`POST /api/v1/pricing/estimate`) using ton-km economics across Open, Container, and OpenBody configurations, with distance decay, handling buffers, and ±10% payload sensitivity analysis.
- **Operational Action Center**: Unified task aggregator on the Web dashboard shell (`ActionCenterCard` & `ActionCenterMenu`) and Admin tower. Dynamically flags unverified KYC documents, pending 50% loading advances, missing E-Way bills, unpaid balance milestones, expiring subscriptions, and WhatsApp delivery alerts.
- **Zero Broker Commissions**: Standardized commercial terms (50% advance at loading, 50% balance upon delivery confirmation) with transparent milestone release controls.
- **5-Stage Trip Tracking**: Geofence checkpoint trail (`seq: 1..5`) with milestone crossing logs, ETA calculations, incident reporting, and Proof of Delivery (POD) image submission.
- **Verification & Compliance (Vahan + FASTag + E-Way Bill)**:
  - **Vahan RC Validation**: Format verification, masked PII (owner/chassis/engine), cached snapshot storage, and automated sandbox fallback (`/compliance/trucks/:id/validate-rc`).
  - **Compliance Checklists**: Truck-level and booking-level verification checklists (`/compliance/trucks/:id`, `/compliance/bookings/:id`) aggregating RC validity, insurance expiry, fitness certificate, FASTag status, and E-Way Bill lifecycle.
  - **Verified Badges**: Search listings and vehicle cards display verified status badges and FASTag readiness indicators.
- **7-Stage Booking Digital Document Chain**: Complete digital freight trail (`BOOKING` → `EWAY_BILL` → `LOADING` → `TRANSIT` → `DELIVERY` → `POD` → `BALANCE`). Documents upload securely to private S3/MinIO via 5-minute pre-signed PUT URLs and download via 1-hour pre-signed GET URLs. Counterparties manage uploads; admins verify or reject via a dedicated review queue.
- **Booking Dispute Management**: In-flight dispute filing (`Payment`, `CargoDamage`, `Delay`, `Document`, `Other`) with priority levels (`Low`, `Medium`, `High`, `Critical`), counterparty evidence, and admin investigation audit trails.
- **Subscription Paywall & 90-Day Free Trial**: Expiry-driven access control gating contact reveal and booking creation. Supports 90-day automatic trial entitlements, monthly unlimited plans (₹999/month), pay-per-unlock credits, and webhooks for Cashfree, Razorpay, and Stripe.
- **Multi-Channel Notification Center**: Granular delivery logging for WhatsApp, SMS, and push notifications via Gupshup / MSG91, backed by user preferences and in-app notification read receipts.
- **Dual Admin Portals**:
  - **Next.js Admin Console** (`/admin`): Full-featured operations console with KPI analytics, KYC document queue, listing controls, dispute resolution, time-scoped revenue charts, and empirical national freight intelligence.
  - **Vite React Admin SPA** (`apps/admin` on port 3011): Dedicated, lightweight admin portal with React Router DOM, Lucide icons, and Recharts visualization.

---

## 📁 Repository Structure

```text
lorry-services/
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

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | NestJS 10, TypeScript 5, Passport JWT, Swagger / OpenAPI, Throttler, Helmet |
| **Web Frontend** | Next.js 15 (App Router), React 18, Tailwind CSS, Lucide Icons, Headless UI, Three.js (`@react-three/fiber`) |
| **Admin SPA (Vite)** | React 18, Vite 5, React Router DOM 6, Recharts, Lucide Icons |
| **Mobile Workspace** | React Native, Expo 51, React Navigation, AsyncStorage |
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
| **Main Web Portal** | `http://localhost:3010` | Marketplace landing page and search |
| **Unified Dashboard Router** | `http://localhost:3010/dashboard` | Role-aware dashboard dispatcher |
| **Factory Owner Dashboard** | `http://localhost:3010/dashboard/factory-owner` | Canonical shipper dashboard (load management, matching trucks) |
| **Truck Driver Dashboard** | `http://localhost:3010/dashboard/truck-driver` | Canonical transporter dashboard (fleet, return loads, earnings) |
| **Next.js Admin Console** | `http://localhost:3010/admin` | Full operational management console |
| **Vite Admin Dashboard** | `http://localhost:3011` | Standalone Vite + React admin interface |
| **Prisma Studio** | `http://localhost:5555` | Database management GUI (`npm run db:studio`) |

### Canonical User Roles & Legacy Route Aliases

The platform operates on a normalized **Factory Owner ↔ Truck Driver** model:

| Canonical Role (`UserRole`) | Business Persona | Canonical Dashboard Route | Legacy Role Aliases (Normalized) |
| :--- | :--- | :--- | :--- |
| `factory_owner` | Cargo owner / Shipper / Factory | `/dashboard/factory-owner` | `load_owner` |
| `truck_driver` | Lorry owner-operator / Transporter | `/dashboard/truck-driver` | `truck_owner`, `driver` |
| `admin` | Platform operator / KYC verifier | `/admin/dashboard` | — |

**Legacy Route Redirects:**
- `/dashboard/load-owner` → 307 Redirect to `/dashboard/factory-owner`
- `/dashboard/truck-owner` → 307 Redirect to `/dashboard/truck-driver`
- `/dashboard/driver` → 307 Redirect to `/dashboard/truck-driver`

---

## 🛡️ Admin Portal Routes

The Next.js Admin Portal (`http://localhost:3010/admin`) and Vite Admin SPA (`http://localhost:3011`) provide identical administrative management capabilities:

| Route (Next.js) | Route (Vite SPA) | Purpose & Features |
| :--- | :--- | :--- |
| `/admin/dashboard` | `/` | Operational KPI metrics, active trips, dispute counts, recent transactions |
| `/admin/kyc` | `/kyc` | Pending RC and Insurance KYC document queue with Verify/Reject modal and notes |
| `/admin/listings` | `/listings` | Active freight loads and registered trucks directory with direct truck verification |
| `/admin/subscriptions` | `/subscriptions` | Subscription directory with active/expired filtering and manual plan extension |
| `/admin/users` | `/users` | User management directory with role filtering (`factory_owner`, `truck_driver`, `admin`) |
| `/admin/bookings` | `/bookings` | Comprehensive commercial booking records with route details, pricing, and lifecycle state |
| `/admin/disputes` | `/disputes` | Dispute queue sorted by priority (`Critical` → `Low`) with investigation and resolution tools |
| `/admin/analytics` | `/analytics` | Time-scoped trip completion trends, revenue breakdown, and corridor efficiency heatmaps |
| `/admin/intelligence` | — | Empirical National Freight Intelligence Console with Real, Estimated, and Predictive metrics |
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
| `POST` | `/api/v1/auth/token/refresh` | Public | Refresh expired JWT access token via refresh token cookie |
| `POST` | `/api/v1/auth/logout` | Authenticated | Invalidate current session and clear auth cookies |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Invalidate all active sessions for current user |

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
| `POST` | `/api/v1/loads` | Factory Owner | Post new freight load with automated geocoding & PostGIS points |
| `GET` | `/api/v1/loads/my-loads` | Factory Owner | List freight loads posted by authenticated user with booking counts |
| `GET` | `/api/v1/loads/:id` | Authenticated | Retrieve load details, pickup/drop coordinates, and commercial budget |
| `PATCH` | `/api/v1/loads/:id/status` | Factory Owner | Update load status (`Open`, `Matched`, `InTransit`, `Completed`, `Cancelled`) |
| `DELETE` | `/api/v1/loads/:id` | Factory Owner | Delete load posting (if no active bookings exist) |

### 4. Truck Fleet Management (`/api/v1/trucks`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/trucks` | Truck Driver | Register vehicle with capacity, body type, location, and preferred corridors |
| `GET` | `/api/v1/trucks/my-trucks` | Truck Driver | List registered trucks with KYC document verification status |
| `GET` | `/api/v1/trucks/:id` | Authenticated | Retrieve truck details, specifications, and compliance checklist |
| `POST` | `/api/v1/trucks/:id/documents/:type`| Truck Driver | Upload RC or Insurance document record for a truck |
| `PATCH` | `/api/v1/trucks/:id/location` | Truck Driver | Update current vehicle GPS latitude/longitude and PostGIS point |

### 5. Geospatial Search & Contact Reveal (`/api/v1/search`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/search/trucks` | Authenticated | PostGIS radius search for verified trucks (`lat`, `lng`, `radiusKm`, `truckType`, `minTonnage`) |
| `GET` | `/api/v1/search/loads` | Authenticated | PostGIS radius search for open loads (`lat`, `lng`, `radiusKm`, `truckType`, `maxTonnage`) |
| `POST` | `/api/v1/search/:type/:id/reveal` | Subscribed | Unlock direct phone and WhatsApp contact details for a load or truck |
| `GET` | `/api/v1/search/subscription-status`| Authenticated | Check whether user holds an active subscription or 90-day free trial |
| `GET` | `/api/v1/search/geocode` | Authenticated | Forward geocode address string into latitude/longitude coordinates |
| `GET` | `/api/v1/search/reverse-geocode` | Authenticated | Reverse geocode coordinates into city/state address details |
| `GET` | `/api/v1/search/suggestions` | Authenticated | Autocomplete location suggestions |

### 6. Commercial Bookings & Disputes (`/api/v1/bookings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/bookings` | Factory Owner | Create commercial booking with 50/50 terms (requires active subscription/trial) |
| `GET` | `/api/v1/bookings/my-bookings` | Authenticated Party | List bookings for current user (as factory owner or truck driver) |
| `GET` | `/api/v1/bookings/:id` | Authenticated Party | Get booking details, agreed price, checkpoints, and payment milestones |
| `PATCH` | `/api/v1/bookings/:id/status` | Authenticated Party | Update booking lifecycle status (`Confirmed`, `InTransit`, `Completed`, `Cancelled`) |
| `PATCH` | `/api/v1/bookings/:id/confirm-advance` | Factory Owner | Confirm 50% loading advance release milestone |
| `PATCH` | `/api/v1/bookings/:id/confirm-balance` | Factory Owner | Confirm 50% delivery balance release milestone upon POD sign-off |
| `POST` | `/api/v1/bookings/:id/disputes` | Authenticated Party | Raise a counterparty dispute against a booking |

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
| `GET` | `/api/v1/compliance/trucks/:id` | Authenticated | Retrieve complete vehicle compliance checklist (RC, insurance, fitness, permit, FASTag) |
| `POST` | `/api/v1/compliance/trucks/:id/validate-rc` | Authenticated | Trigger Vahan RC check via external API (or sandbox fallback) |
| `PATCH` | `/api/v1/compliance/trucks/:id/fastag` | Authenticated | Update FASTag readiness status (`Active`, `LowBalance`, `Inactive`, `Unknown`) |
| `GET` | `/api/v1/compliance/bookings/:id` | Authenticated | Retrieve trip compliance checklist including E-Way Bill status |
| `POST` | `/api/v1/compliance/bookings/:id/eway-bill` | Authenticated Party | Attach or update 12-digit GSTN E-Way Bill number and expiry timestamp |

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

### 10. Matching Engine & Return Loads (`/api/v1/matches`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/matches/my-matches` | Authenticated | List persistent algorithmic matches for current user |
| `GET` | `/api/v1/matches/load/:loadId` | Authenticated | Discover matching trucks for a posted load (proximity ≤50 km) |
| `GET` | `/api/v1/matches/truck/:truckId` | Authenticated | Discover matching open loads for a truck (proximity ≤50 km) |
| `GET` | `/api/v1/matches/truck/:truckId/return-loads` | Authenticated | **Return-load (backhaul) radar** — ranked open loads near drop-off hub (≤300 km) |
| `POST` | `/api/v1/matches/evaluate` | Authenticated | Run matching engine across loads/trucks and persist candidate pairs |
| `POST` | `/api/v1/matches/evaluate/load/:loadId` | Authenticated | Evaluate and persist matches for a specific freight load |
| `POST` | `/api/v1/matches/evaluate/truck/:truckId` | Authenticated | Evaluate and persist matches for a specific vehicle |
| `POST` | `/api/v1/matches` | Authenticated | Manually create a candidate match pair |
| `GET` | `/api/v1/matches/:id` | Authenticated | Retrieve single match details with compatibility breakdown |
| `PATCH` | `/api/v1/matches/:id/status` | Authenticated | Update match state (`Pending`, `Booked`, `Completed`, `Cancelled`) |
| `DELETE` | `/api/v1/matches/:id` | Authenticated | Remove match pair |

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
| `GET` | `/api/v1/subscriptions/verify/:orderId` | Authenticated | Verify subscription order completion |

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
| `GET` | `/api/v1/admin/intelligence` | Admin | National Logistics Intelligence console metrics (Real, Estimated, Predictive) |
| `GET` | `/api/v1/admin/users` | Admin | Filtered user directory with operational statistics |
| `GET` | `/api/v1/admin/documents/pending` | Admin | Pending vehicle KYC documents queue |
| `PATCH` | `/api/v1/admin/documents/:id/verify` | Admin | Verify or reject KYC document with reviewer notes |
| `POST` | `/api/v1/admin/trucks/:id/vahan-check` | Admin | Trigger manual Vahan RC check for a truck |
| `PATCH` | `/api/v1/admin/trucks/:id/verify` | Admin | Manually update truck aggregate verification status |
| `GET` | `/api/v1/admin/subscriptions` | Admin | List all active/expired user subscriptions |
| `GET` | `/api/v1/admin/bookings` | Admin | List all marketplace bookings with full lifecycle details |
| `GET` | `/api/v1/admin/disputes` | Admin | Priority-sorted dispute queue |
| `PATCH` | `/api/v1/admin/disputes/:id/resolve` | Admin | Resolve or reject counterparty dispute with decision notes |

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
| **PostgreSQL + PostGIS** | PostgreSQL 15 with `postgis` extension enabled | Local Docker container or cloud database instance (Supabase/Neon/RDS) |
| **Redis** | Redis 7+ server / Upstash Redis URL | Memory store fallback for OTP and rate-limiting if Redis is disconnected |
| **Cashfree PG** | `CASHFREE_API_KEY`, `CASHFREE_SECRET_KEY`, `CASHFREE_BASE_URL` | Sandbox test environment with mock order simulation |
| **Razorpay / Stripe** | `RAZORPAY_KEY_ID`, `STRIPE_SECRET_KEY` | Optional payment gateways; webhook verification enabled |
| **Gupshup (WhatsApp)**| `GUPSHUP_API_KEY`, `GUPSHUP_APP_NAME` | In dev without credentials, messages log to console with mock OTP `123456` |
| **MSG91 (SMS OTP)** | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | Mock fallback in non-production environments |
| **MapmyIndia / Mappls**| `MAPMYINDIA_CLIENT_ID`, `MAPMYINDIA_CLIENT_SECRET` | Fallback Haversine distance and simulated geocoding coordinates |
| **Vahan (mParivahan)**| Parivahan / ULIP Gateway credentials | Built-in sandbox mode (`VAHAN_SANDBOX=true`) returning compliant sample RC snapshots |
| **AWS S3 / MinIO** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Local MinIO container (via `docker-compose.yml`) or cloud S3 bucket |
| **Google Fonts** | Reachable `fonts.googleapis.com` at Next.js build time | Local font files fallback for air-gapped CI environments |

---

## 🚀 Getting Started & Setup Commands

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd lorry_services
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Review and populate key environment variables:
- `DATABASE_URL`: PostgreSQL connection string with PostGIS enabled
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Secure cryptographic secrets
- `CSRF_SECRET`: Secret key for CSRF token generation
- `CASHFREE_API_KEY` & `CASHFREE_SECRET_KEY`: Cashfree sandbox/production keys
- `VAHAN_API_KEY`: Parivahan/ULIP provider key (or leave empty for sandbox mode)
- `PORT`: Backend API port (default `3002`)
- `CLIENT_URL`: Main web application URL (`http://localhost:3010`)
- `ADMIN_URL`: Admin portal URL (`http://localhost:3011`)

### 3. Database Setup & Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Apply all database migrations
npm run db:migrate

# (Optional) Seed initial demo loads, trucks, and users
npm run db:seed
```

### 4. Running the Development Servers

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
| `npm run dev` | Root | Concurrently runs API, Web, and Admin in development mode |
| `npm run build` | Root | Builds all packages and applications for production |
| `npm run lint` | Root | Runs ESLint across all packages and applications |
| `npm run db:generate` | `packages/database` | Generates the Prisma ORM client library |
| `npm run db:migrate` | `packages/database` | Executes Prisma database migrations |
| `npm run db:seed` | `packages/database` | Seeds initial demonstration data |
| `npm run db:studio` | `packages/database` | Launches Prisma Studio GUI at `http://localhost:5555` |

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
