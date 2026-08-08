# 🚚 LorryCarry - Direct Truck & Freight Load Marketplace

LorryCarry is a modern monorepo platform connecting load owners and truck transporters directly across India without broker commissions. Built with NestJS, Next.js 14, PostgreSQL (PostGIS), Redis, Cashfree Payments, Gupshup WhatsApp API, and MapmyIndia / Mappls.

---

## 🌟 Key Features

- **Direct Load & Truck Matching**: Load owners post freight requirements and discover verified truck operators in real time.
- **No Broker Commissions**: Transparent direct bookings with custom commercial terms (50% advance at loading, 50% balance at unloading).
- **5-Stage Trip Tracking**: Geofence checkpoint tracking with automated WhatsApp notifications at every leg of the journey.
- **Cashfree Paywall & DigiLocker KYC**: Secure subscription billing (`₹999/month`) and instant RC/Chassis verification.
- **PostGIS Geospatial Radius Search**: High-performance spatial indexing for matching nearby loads and available trucks.
- **WhatsApp Notification Engine**: Instant booking confirmations, checkpoint updates, and OTP verification via Gupshup.

---

## 📁 Repository Structure

```text
lorry-services/
├── apps/
│   ├── api/          # NestJS backend API service (Port 3002)
│   ├── web/          # Next.js 14 Web Application (Port 3000)
│   ├── admin/        # Vite + React Admin Dashboard (Port 3001)
│   └── mobile/       # Mobile Application (Flutter / React Native)
├── packages/
│   ├── database/     # Prisma ORM schema, PostGIS extensions & seeds
│   └── shared/       # Shared TypeScript types, schemas & constants
├── docker-compose.yml # Local PostgreSQL (PostGIS), Redis & MinIO services
├── turbo.json        # Turborepo build orchestration
├── package.json      # Root dependencies & workspace scripts
└── README.md         # Project documentation
```

---

## 🛠️ Tech Stack

| Domain | Tech / Services |
| :--- | :--- |
| **Backend API** | NestJS, TypeScript, Axios, Passport JWT |
| **Frontend Web** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Admin Dashboard** | React, Vite, TSX, Tailwind CSS |
| **Database & GIS** | PostgreSQL 15, PostGIS 3.4, Prisma ORM |
| **Caching & Queue** | Redis 7 |
| **Payments & KYC** | Cashfree PG (Subscriptions & DigiLocker RC Verification) |
| **Notifications** | Gupshup (WhatsApp Cloud API), MSG91 (SMS) |
| **Geospatial Maps** | MapmyIndia / Mappls REST APIs |
| **File Storage** | AWS S3 / MinIO (Local Object Storage) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Docker Desktop**: For running local PostgreSQL + PostGIS, Redis, and MinIO

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd lorry-services
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

*Note: Update `.env` with your Cashfree, Gupshup, MapmyIndia, and database secrets.*

### 3. Start Local Infrastructure (Docker)

Launch PostgreSQL (PostGIS), Redis, and MinIO local containers:

```bash
docker-compose up -d
```

### 4. Setup Database & Seed Data

Generate Prisma Client, run PostGIS migrations, and populate initial seed data:

```bash
# Generate Prisma Client & Run Migrations
npm run db:generate
npm run db:migrate

# Seed Initial Data (Optional)
npm run db:seed
```

### 5. Launch Development Servers

Start all application services concurrently with Turborepo:

```bash
npm run dev
```

The apps will be available at:
- **API Server**: [http://localhost:3002](http://localhost:3002)
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **Admin Portal**: [http://localhost:3001](http://localhost:3001)

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts all applications in development mode using Turbo |
| `npm run build` | Builds all packages and applications for production |
| `npm run lint` | Runs linting across all workspace packages |
| `npm run db:generate` | Generates the Prisma client |
| `npm run db:migrate` | Runs database migrations |
| `npm run db:seed` | Seeds database with initial sample data |
| `npm run db:studio` | Opens Prisma Studio GUI at `http://localhost:5555` |

---

## 🔒 Security & Environment Variables

Make sure the following keys are set before running in production:

- `DATABASE_URL`: PostgreSQL connection string with PostGIS enabled
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Secure random secrets (min 32 chars)
- `CASHFREE_APP_ID` & `CASHFREE_SECRET_KEY`: Production Cashfree API credentials
- `GUPSHUP_APP_ID` & `GUPSHUP_APP_TOKEN`: Gupshup WhatsApp Business credentials
- `MAPMYINDIA_CLIENT_ID` & `MAPMYINDIA_CLIENT_SECRET`: MapmyIndia REST API credentials

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.
