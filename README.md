# 🚚 LorryCarry - Direct Truck & Freight Load Marketplace

LorryCarry is a high-performance monorepo platform connecting load owners and truck transporters directly across India with zero broker commissions. Built with **NestJS**, **Next.js 15 (App Router)**, **PostgreSQL (PostGIS)**, **Redis**, **Cashfree Payments**, **Gupshup WhatsApp API / MSG91**, and **MapmyIndia / Mappls**.

---

## 🌟 Key Features

- **Direct Load & Truck Matching**: Load owners post freight requirements and discover verified truck operators within customizable search radii using PostGIS spatial indexing.
- **Zero Broker Commissions**: Transparent direct bookings with standard commercial terms (50% advance at loading, 50% balance upon delivery confirmation).
- **5-Stage Trip Tracking**: Geofence checkpoint tracking with automated WhatsApp notifications at every leg of the journey.
- **Production Admin Dashboard**:
  - **Overview & KPI Analytics**: Real-time stats on users, trucks, loads, bookings, conversion rates, and revenue.
  - **Dashboard Analytics**: Trip completion, earnings summary, active booking pipeline and a route efficiency heatmap (corridor × month) with CSV/PDF report export.
  - **KYC Verification Queue**: Document verification pipeline (RC, Insurance) with instant Verify/Reject actions, modal confirmations, and rejection notes.
  - **Fleet & Listings Management**: Overview of active trucks and freight listings with direct truck verification controls.
  - **Subscription Management**: Track active, expired, and cancelled plan subscriptions with expiration alerts.
  - **User Directory**: Search and filter load owners, truck owners, and administrators with detailed operational metrics.
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
- `PORT`: Backend port (default `3002`)
- `CLIENT_URL`: Web client URL (`http://localhost:3010`)
- `ADMIN_URL`: Admin portal URL (`http://localhost:3011`)

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
| `/admin/users` | User management with role filtering (`load_owner`, `truck_owner`, `admin`) |
| `/admin/bookings` | End-to-end booking records with route addresses, pricing, and lifecycle tracking |

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

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.
