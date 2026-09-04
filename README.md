# 🚚 LorryCarry - Direct Truck & Freight Load Marketplace

LorryCarry is a high-performance monorepo platform connecting factory owners and truck transporters directly across India with zero broker commissions. Built with **NestJS**, **Next.js 15 (App Router)**, **PostgreSQL (PostGIS)**, **Redis**, **Cashfree Payments**, **Gupshup WhatsApp API / MSG91**, and **MapmyIndia / Mappls**.

---

## 🌟 Key Features

- **Direct Load & Truck Matching**: Load owners post freight requirements and discover verified truck operators within customizable search radii using PostGIS spatial indexing.
- **Zero Broker Commissions**: Transparent direct bookings with standard commercial terms (50% advance at loading, 50% balance upon delivery confirmation).
- **5-Stage Trip Tracking**: Geofence checkpoint tracking with automated WhatsApp notifications at every leg of the journey.
- **Verification & Compliance (Vahan + FASTag + E-Way Bill)**:
  - **Vahan RC Validation**: Every registered truck is validated against the Vahan (mParivahan) database via a provider-agnostic API adapter — format-checked registration numbers, PII-masked owner/chassis data, response caching, and a clearly-labelled sandbox mode for local development.
  - **Verified Transporter Badges**: Search results and marketplace cards render a "Vahan Verified" badge backed by the live validation timestamp, plus a "FASTag Ready" chip when the tag is active.
  - **Compliance Checklist**: Truck- and trip-level checklists (`/compliance/trucks/:id`, `/compliance/bookings/:id`) covering RC status, insurance validity, fitness certificate, national permit, PUC, FASTag readiness and E-Way Bill lifecycle (12-digit format validation, expiry tracking).
  - **Admin KYC Cross-Check**: The verification queue surfaces the Vahan snapshot (registration status, insurance/fitness validity) next to each pending document.
- **Production Admin Dashboard**:
  - **Overview & KPI Analytics**: Real-time stats on users, trucks, loads, bookings, conversion rates, and revenue.
  - **Dashboard Analytics**: Trip completion, earnings summary, active booking pipeline and a route efficiency heatmap (corridor × month) with CSV/PDF report export.
  - **KYC Verification Queue**: Document verification pipeline (RC, Insurance) with instant Verify/Reject actions, modal confirmations, and rejection notes.
  - **Fleet & Listings Management**: Overview of active trucks and freight listings with direct truck verification controls.
  - **Booking Dispute Resolution**: Counterparty claims for payment, delay, documents, and cargo damage with investigation, decision notes, priority sorting, and recorded decision notes.
  - **Performance Analytics**: Time-scoped trip count, completed deliveries, settled revenue, freight value, transit duration, and checkpoint-based route efficiency by corridor.
  - **Subscription Management**: Track active, expired, and cancelled plan subscriptions with expiration alerts.
  - **User Directory**: Search and filter factory owners, truck drivers, and administrators with detailed operational metrics.
  - **Booking Lifecycle**: Monitor all bookings from pending quotation to in-transit and delivery completion.
- **Cashfree Paywall & Subscription Engine**: Secure billing (`₹999/month` and per-unlock credits) with webhook-driven auto-activation.
- **WhatsApp Notification Engine**: Instant booking confirmations, dispatch updates, delivery-completion alerts, checkpoint updates, and OTP verification via Gupshup — with a persisted in-app notification centre and read/unread state on web and mobile.

---

## 📁 Repository Structure

```text
lorry-services/
├── apps/
│   ├── api/          # NestJS backend API service (Port 3002)
│   ├── web/          # Next.js 15 Web Application & Admin Portal (Port 3010)
│   ├── admin/        # Vite + React Admin Dashboard (Port 3011)
│   └── mobile/       # Mobile Application workspace (Flutter / React Native)
├── packages/
│   ├── database/     # Prisma ORM schema, PostGIS extensions, migrations & seeds
│   └── shared/       # Shared TypeScript types, schemas & constants
├── docker-compose.yml # Local PostgreSQL (PostGIS), Redis & MinIO services
├── turbo.json        # Turborepo build orchestration
├── package.json      # Monorepo root scripts & workspace configuration
└── README.md         # Project documentation
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | NestJS 10, TypeScript, Passport JWT, Swagger, Throttler, Helmet |
| **Web Frontend & Admin** | Next.js 15 (App Router), React 18, Tailwind CSS, Heroicons, Headless UI |
| **Admin SPA (Vite)** | React 18, Vite 5, React Router DOM, Recharts, Lucide Icons |
| **Database & GIS** | PostgreSQL 15, PostGIS 3.4 spatial queries, Prisma ORM 5 |
| **Caching & In-Memory Store** | Redis 7 / Upstash Redis |
| **Payments & Billing** | Cashfree PG (Subscriptions, Webhook processing) |
| **Notifications** | Gupshup (WhatsApp Cloud API), MSG91 (SMS OTP) |
| **Geospatial & Routing** | MapmyIndia / Mappls REST APIs |
| **Object Storage** | AWS S3 / MinIO (KYC Documents, RC & Insurance uploads) |

---

## 🌐 Services & Ports

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **Backend API** | `http://localhost:3002/api/v1` | NestJS REST API |
| **API Swagger Docs** | `http://localhost:3002/api/docs` | Interactive OpenAPI / Swagger UI |
| **Web App (Next.js)** | `http://localhost:3010` | Main marketplace & customer portal |
| **Admin Portal (Next.js)** | `http://localhost:3010/admin` | Full-featured Admin Management Dashboard |
| **Admin Dashboard (Vite)** | `http://localhost:3011` | Vite-based admin interface |
| **Prisma Studio** | `http://localhost:5555` | Database browser (via `npm run db:studio`) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Docker Desktop** (optional for local Redis/Postgres): or cloud database connection (Supabase/Neon/RDS)

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd lorry-services
npm install
```

### 2. Configure Environment Variables

Ensure `.env` in the project root is properly configured:

```bash
cp .env.example .env
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string with PostGIS enabled
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Secure cryptographic secrets
- `CASHFREE_API_KEY` & `CASHFREE_SECRET_KEY`: Cashfree sandbox or production credentials
- `VAHAN_API_KEY`: Vahan (mParivahan) RC validation provider key — see `.env.example` for sandbox/cache options
- `PORT`: Backend port (default `3002`)
- `CLIENT_URL`: Web client URL (`http://localhost:3010`)
- `ADMIN_URL`: Admin portal URL (`http://localhost:3011`)

### Subscription webhooks

| Gateway | Endpoint | Notes |
| :--- | :--- | :--- |
| Cashfree | `POST /api/v1/subscriptions/webhook/cashfree` | HMAC signature verified |
| Razorpay | `POST /api/v1/subscriptions/webhook/razorpay` | `x-razorpay-signature` (HMAC-SHA256) verified |
| Stripe | `POST /api/v1/subscriptions/webhook/stripe` | `stripe-signature` verified via Stripe SDK |

Trial state is stored per user (`trial_started_at`, `trial_ends_at`, `trial_converted_at`); see `GET /api/v1/subscriptions/status` for the entitlement + countdown payload consumed by the dashboard.

### 3. Database Setup & Migrations

```bash
# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:migrate

# (Optional) Seed initial data
npm run db:seed
```

### 4. Running the Development Servers

To start all services concurrently (API, Web, and Admin):

```bash
npm run dev
```

Or start specific services individually:

```bash
# Start NestJS Backend API (Port 3002)
npm --prefix apps/api run dev

# Start Next.js Web App & Admin Portal (Port 3010)
npm --prefix apps/web run dev

# Start Vite Admin Dashboard (Port 3011)
npm --prefix apps/admin run dev
```

---

## 🛡️ Admin Dashboard Routes

The Next.js Admin Portal is located at `/admin` (or `http://localhost:3010/admin`) and includes:

| Route | Functionality |
| :--- | :--- |
| `/admin/dashboard` | KPI metrics (Users, Trucks, Loads, Bookings, Subscriptions, Revenue, KYC status) & recent payments |
| `/admin/kyc` | Pending KYC documents queue with modal approval/rejection and note submission |
| `/admin/listings` | Marketplace load/truck summaries, pending fleet verification, top contributors |
| `/admin/subscriptions` | Subscription directory with active/expired statuses and pagination |
| `/admin/users` | User management with role filtering (`factory_owner`, `truck_driver`, `admin`) |
| `/admin/bookings` | End-to-end booking records with route addresses, pricing, and lifecycle tracking |
| `/admin/disputes` | Priority-sorted booking dispute queue with investigation and resolution actions |
| `/admin/analytics` | Time-scoped trip, revenue, and checkpoint-based route efficiency analytics |

Admin API additions: `POST /admin/trucks/:id/vahan-check`, `GET /admin/disputes`, `PATCH /admin/disputes/:id/resolve`, and `GET /admin/analytics?range=30`. Authenticated booking parties can raise a case through `POST /bookings/:id/disputes`.

### Verification & Compliance API

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/compliance/trucks/:id` | GET | Truck compliance checklist (RC, insurance, fitness, permit, PUC, FASTag) |
| `/api/v1/compliance/trucks/:id/validate-rc` | POST | Live Vahan RC validation + snapshot persistence (rate-limited) |
| `/api/v1/compliance/trucks/:id/fastag` | PATCH | Report FASTag status (`Active` / `LowBalance` / `Inactive`) |
| `/api/v1/compliance/bookings/:id` | GET | Trip compliance checklist (adds E-Way Bill lifecycle) |
| `/api/v1/compliance/bookings/:id/eway-bill` | POST | Attach/update the 12-digit E-Way Bill number + validity |

### Booking API

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/bookings` | POST | Create a commercial booking (factory owner, requires subscription) |
| `/api/v1/bookings/my-bookings` | GET | List bookings for the authenticated party |
| `/api/v1/bookings/:id` | GET | Booking details, 5-stage checkpoints, and payment flags |
| `/api/v1/bookings/:id/status` | PATCH | Update booking lifecycle status (`Confirmed` / `InTransit` / `Completed` / `Cancelled`) |
| `/api/v1/bookings/:id/confirm-advance` | PATCH | Factory owner confirms 50% loading advance release |
| `/api/v1/bookings/:id/confirm-balance` | PATCH | Factory owner confirms 50% delivery balance release on POD receipt |
| `/api/v1/bookings/:id/disputes` | POST | Raise a counterparty dispute |

### Freight Rate Estimation & Logistics Intelligence API

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/pricing/estimate` | POST | Calculate indicative benchmark freight rate estimate based on tonnage, truck type, and distance/coordinates |
| `/api/v1/intelligence/pricing/estimate` | POST | Alias endpoint for freight pricing rate estimator |

#### Request Body (`POST /api/v1/pricing/estimate`)
- `tonnage` *(number, required)*: Cargo payload in metric tons (e.g. `14`)
- `truckType` *(string, required)*: Truck body configuration (`Open`, `Container`, `OpenBody`)
- `distanceKm` *(number, optional)*: Route distance in km (calculated from GPS coordinates if omitted, or fallback corridor `350 km`)
- `loadingLat` / `loadingLng` *(number, optional)*: Origin GPS coordinates
- `unloadingLat` / `unloadingLng` *(number, optional)*: Destination GPS coordinates

#### Response Structure
- `minEstimate`: Lower market range bound in INR (-10% variance)
- `recommendedTarget`: Indicative target freight cost rounded to nearest ₹100
- `maxEstimate`: Upper market range bound in INR (+15% variance)
- `ratePerTonKm`: Distance-discounted rate per ton-km
- `distanceKm`: Transit route distance in kilometers
- `baseHandlingCharge`: Fixed loading/unloading buffer fee
- `tonnage`: Cargo tonnage evaluated
- `truckType`: Normalized truck body configuration
- `confidence`: Confidence indicator (`HIGH` with distanceKm, `MEDIUM` with lat/lng, `BENCHMARK` fallback)
- `disclaimer`: Commercial indicative estimate disclaimer
- `explanation`: Transparent arithmetic breakdown of rate calculation
- `longHaulAdjustment`: Scale discount factors applied (>500km / >1000km)
- `truckTypeAdjustment`: Body type base benchmark and terminal handling buffer
- `priceSensitivity`: ±10% payload tonnage variations and marginal cost per ton
- `routeComparison`: Comparison across body types (Open, Container, OpenBody) and bypass routing

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs all monorepo applications concurrently via Turborepo |
| `npm run build` | Builds all packages and applications for production |
| `npm run lint` | Runs ESLint across all workspaces |
| `npm run db:generate` | Generates the Prisma ORM client |
| `npm run db:migrate` | Runs database migrations |
| `npm run db:seed` | Seeds database with initial test records |
| `npm run db:studio` | Launches Prisma Studio GUI at `http://localhost:5555` |

### Building on a restricted network

Two build steps reach out to the public internet. On an air-gapped or firewalled
host (including some CI runners) they fail with `ECONNRESET` / "Client network
socket disconnected before secure TLS connection was established":

1. **`npm run db:generate` / `packages/database` build** downloads the Prisma
   engines from `binaries.prisma.sh`. Pre-seed the engines (or point at an
   internal mirror) and export the paths before building:

   ```bash
   export PRISMA_QUERY_ENGINE_LIBRARY=/path/to/libquery_engine.so.node
   export PRISMA_SCHEMA_ENGINE_BINARY=/path/to/schema-engine
   # or, if you host a mirror:
   export PRISMA_ENGINES_MIRROR=https://your-mirror.internal
   ```

   These variables are listed in `turbo.json` under `globalPassThroughEnv`, so
   Turborepo forwards them to each workspace task.

2. **`apps/web` build** fetches `Plus Jakarta Sans` and `JetBrains Mono` through
   `next/font/google` in `src/app/layout.tsx`. Google Fonts must be reachable at
   build time, otherwise self-host the fonts via `next/font/local`.

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.
