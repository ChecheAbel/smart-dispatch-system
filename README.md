# Smart Dispatch System

An enterprise dispatch and fleet platform for Ethiopian transport agencies. It covers corporate contracts, ride booking, live dispatch, driver shifts, fleet compliance, and ETB invoicing from one system.

The product is bilingual (**English** and **Amharic**). Roles, menus, fare plans, and UI copy resolve by locale (`en` / `am`).

---

## Table of contents

1. [What this project is](#what-this-project-is)
2. [Architecture walkthrough](#architecture-walkthrough)
3. [Repository layout](#repository-layout)
4. [Tech stack](#tech-stack)
5. [Features](#features)
6. [Prerequisites](#prerequisites)
7. [Run locally](#run-locally)
8. [Environment variables](#environment-variables)
9. [Database, migrations, and seed](#database-migrations-and-seed)
10. [Typical first-run walkthrough](#typical-first-run-walkthrough)
11. [API and realtime](#api-and-realtime)
12. [Deploy](#deploy)
13. [Useful scripts](#useful-scripts)
14. [Troubleshooting](#troubleshooting)

---

## What this project is

Smart Dispatch is a **web admin console + customer portal + REST/WebSocket API**. Operators manage users, drivers, vehicles, locations, fare plans, contracts, and invoices. Customers register, book trips against a contract, track requests, pay invoices using admin-configured payment methods, and file complaints. Drivers (typically via a mobile client) receive assigned trips, publish GPS, and log fuel and maintenance.

It is **not** a consumer ride-hailing marketplace. Bookings are contract-backed corporate / government / business trips with dispatch assignment, compliance gates, and periodic invoicing.

---

## Architecture walkthrough

The repo is a **pnpm + Turborepo monorepo**.

```
┌─────────────────┐     HTTP / Socket.IO      ┌──────────────────────┐
│  apps/web       │  ───────────────────────► │  apps/api            │
│  Next.js 16     │                           │  Express + Prisma    │
│  :3000          │  /api and /uploads        │  :4000               │
│                 │  rewritten in local dev   │                      │
└─────────────────┘                           └──────────┬───────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │  PostgreSQL 15       │
                                              │  :5432 / dispatch_db │
                                              └──────────────────────┘
```

**Request flow (local development)**

1. The browser loads the Next.js app at `http://localhost:3000`.
2. REST calls go to `/api/...`. Next.js rewrites them to `http://localhost:4000/api/...`.
3. Uploaded files (`/uploads/...`) are also rewritten to the API, which serves static files (driver licenses, vehicle photos, branding, payment-method logos).
4. Socket.IO is **not** proxied by those rewrites. The web app connects to `http://localhost:4000/api/ws` for live vehicle location and trip events.

**On API startup**

1. Ensure the Postgres database exists (creates it if missing).
2. Run `prisma migrate deploy`.
3. Seed roles, access control, notifications, regions, locations, vehicle catalog, fare plans, and the optional admin user.
4. Load `app_settings` (deadlines, branding, VAT, payment gateway).
5. Start HTTP + Socket.IO, then background jobs (invoice automation, ride-request reminders, expiry, dispatch escalation, trip disruption reroute).

**Auth model**

- JWT access tokens (`JWT_SECRET`).
- Users have one or more **roles** (`admin`, `dispatcher`, `driver`, `user`, plus custom roles).
- Roles map to **permissions**; permissions gate **API endpoints** and **menus**.
- Customer registrations start as `account_activation: pending` until an admin approves them.

**Shared types**

`packages/types` (`@smart-dispatch/types`) is the contract between web and API for DTOs, payment methods, and realtime event names.

---

## Repository layout

```
Smart-Dispatch-System/
├── apps/
│   ├── api/                    Express API, Prisma, Socket.IO, schedulers
│   │   ├── prisma/             schema, migrations, seed entry
│   │   ├── src/
│   │   │   ├── routes/         HTTP routers
│   │   │   ├── services/       billing, dispatch, notifications, jobs
│   │   │   ├── models/         Prisma data access
│   │   │   ├── websocket/      Socket.IO namespace /api/ws
│   │   │   ├── db/             migrate + seeders
│   │   │   └── docs/           OpenAPI (Scalar UI at /api/docs)
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── web/                    Next.js App Router UI
│       ├── src/app/
│       │   ├── page.tsx        Public landing
│       │   ├── book/           Public / signed-in booking
│       │   ├── register/       Customer registration
│       │   ├── sign-in/        Auth
│       │   ├── dashboard/      Customer portal
│       │   ├── admin/          Operator console
│       │   └── drivers/apply/  Driver application
│       └── Dockerfile
├── packages/
│   ├── types/                  Shared TypeScript types
│   └── database/               Placeholder package
├── docker-compose.yml          web + api + postgres
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                Root scripts: dev, build, lint
```

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Package manager | pnpm 9.1.0 (see `packageManager` in root `package.json`) |
| Build orchestration | Turborepo |
| Web | Next.js 16, React 19, Tailwind CSS 4, Leaflet maps, Recharts, Socket.IO client |
| API | Node 20, Express, Prisma 6, JWT, Multer, Nodemailer, Socket.IO |
| Database | PostgreSQL 15 |
| Docs | OpenAPI 3.1 + Scalar at `/api/docs` |

---

## Features

### Public site

- Marketing landing page (how it works, features, contact).
- Sign in, forgot / reset password.
- Customer **register** (individual, business, or government). Business TIN can be looked up via eTrade when configured.
- **Book a vehicle** (`/book`) — guests are prompted to sign in; enrolled customers pick pickup/dropoff, vehicle type/class, schedule, and contract.
- Driver application page (`/drivers/apply`).

### Customer portal (`/dashboard`)

| Area | What customers can do |
| --- | --- |
| Dashboard | Overview of recent requests and activity |
| My Requests | History, status, maps, edit/cancel within grace windows, rate the driver |
| My Contracts | View enrollments (term, fare plan, booking policy) |
| My Invoices | Issued invoices, line items, VAT, bulk pay |
| Complaints | Submit and track complaints (trip, driver, vehicle, billing, service) |

Invoice payment shows the **amount**, a **copyable reference**, and any **enabled payment methods** from Admin → Payment Gateway (name, logo, custom key/value instructions). If no methods are enabled, the pay section still appears with a “payment is not configured yet” notice.

### Admin console (`/admin`)

Menus are permission-driven and bilingual. Seeded structure:

**Account management**

- Users: create staff, drivers, and customers; assign roles; activate/block accounts; driver license profile and photos.
- Registrations: approve or reject pending customer sign-ups.

**Driver management**

- Drivers directory (license, assigned vehicle).
- Shifts: named periods (e.g. morning/afternoon) and per-day / weekly assignments.
- Attendance: check-in / check-out for a work date.
- Performance: ratings from completed trips.

**Access control**

- Roles and permission sets.
- Menus: hierarchy, icons, translations, which permissions unlock each item.
- Audit logs of admin actions.

**System settings**

- Notifications: email/SMS configuration, send message, templates, delivery log.
- Deadline Hub: cancel/edit grace minutes, reminder hours, dispatch escalation timers, invoice / insurance / inspection “due soon” windows.
- Branding: logo and theme colors used on the public site and portals.
- Payment Gateway: custom methods (Telebirr, CBE, or any name). Each method has a logo, enable flag, and arbitrary instruction fields (merchant ID, account number, etc.). Customers see only enabled methods.

**Vehicle / fleet**

- Vehicles: photos, type, class, region, default driver, chassis, insurance/inspection dates, geofences.
- Maintenance logs and work-type catalog.
- Fuel consumption logs.
- Setup: vehicle types, classes, and type–class links.

**Compliance**

- Overview dashboard.
- Insurance and inspection records with due-soon highlighting (Deadline Hub).

**Locations**

- Regions.
- Sites / locations used as pickup and dropoff catalogs (with coordinates).

**Dispatch**

- Overview: live map, assigned trips, vehicle locations (Socket.IO).
- Ride requests: approve, assign vehicle/driver, start, complete, reject, mark no-show.
- Complaints: assign, prioritize, respond, close.

**Billing**

- Fare plans: flat, distance, time, distance+time, or hourly; per vehicle type/class/region; waiting fees; ETB.
- Booking policies: min/max advance booking, free cancellation window, late-cancel and no-show fees.
- Contracts: draft/active/expired; fare plan + policy; billing interval (`per_trip`, `at_contract_end`, monthly, quarterly, annually); enroll customers for a date range.
- Invoices: generate from completed trips, VAT, issue, mark paid (with payment method), void. A scheduler can auto-generate invoices on an interval.

### Driver API (mobile clients)

Permissions such as `driver.trip`, `driver.upcoming`, `driver.location`, `driver.fuel`, and `driver.maintenance` expose:

- Assigned vehicle and upcoming / history trips.
- Live GPS publish on `/api/ws`.
- Fuel refill and maintenance requests for the assigned vehicle.

Geofence violations and trip disruption (vehicle off-route / unavailable) can trigger notifications and reroute jobs.

### Platform capabilities (cross-cutting)

- **Realtime**: vehicle location snapshots, trip add/update/remove, geofence status.
- **Notifications**: templates + optional external FCM broadcast service.
- **Uploads**: driver licenses, vehicle photos, brand logo, payment method logos (`UPLOAD_ROOT`).
- **Schedulers**: invoice automation, ride-request reminders, request expiry, dispatch escalation, trip disruption reroute.
- **Audit trail** for sensitive admin changes.

---

## Prerequisites

- **Node.js 20** (API and web Docker images use `node:20-alpine`)
- **pnpm 9.1.0** (`corepack enable` then `corepack prepare pnpm@9.1.0 --activate`)
- **PostgreSQL 15** listening locally, **or** Docker for compose-based runs
- Git

Create an empty database named `dispatch_db` (or let the API create it on first start if the connecting user can create databases).

---

## Run locally

### 1. Clone and install

```bash
git clone <repository-url>
cd Smart-Dispatch-System
pnpm install
```

`apps/api` runs `prisma generate` on `postinstall`.

### 2. Start PostgreSQL

Example with Docker (database only):

```bash
docker run --name smart-dispatch-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=dispatch_db \
  -p 5432:5432 \
  -d postgres:15-alpine
```

Or use a local Postgres install with the same credentials (or change `DATABASE_URL`).

### 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Minimum for local:

```env
PORT=4000
DATABASE_URL=postgres://postgres:password@localhost:5432/dispatch_db
JWT_SECRET=change-this-in-production
APP_URL=http://localhost:3000
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme123
```

Optional but recommended: set `UPLOAD_ROOT` to an absolute path **outside** the repo so license photos, vehicle images, branding, and payment logos persist (for example `~/uploads/smart-dispatch`). If unset, uploads default under the API working directory.

### 4. Start both apps

From the repo root:

```bash
pnpm run dev
```

Turborepo starts:

| App | URL |
| --- | --- |
| Web | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:4000](http://localhost:4000) |
| Health | [http://localhost:4000/api/health](http://localhost:4000/api/health) |
| API docs | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |

The first API start applies migrations and seeds. After that, sign in at [http://localhost:3000/sign-in](http://localhost:3000/sign-in) with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

You can also run packages separately:

```bash
pnpm --filter api dev
pnpm --filter web dev
```

The web app does **not** need its own `.env` for local work. `next.config.ts` proxies `/api` and `/uploads` to port 4000. Socket.IO uses `http://localhost:4000` in development unless `NEXT_PUBLIC_REALTIME_URL` is set.

---

## Environment variables

### API (`apps/api/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No (default `4000`) | HTTP + Socket.IO port |
| `DATABASE_URL` | **Yes** | Postgres connection string (must include a database name) |
| `JWT_SECRET` | **Yes** | Signs access tokens |
| `APP_URL` | No | Frontend origin; used in password-reset links |
| `UPLOAD_ROOT` | No | Absolute directory for uploaded files |
| `SEED_ADMIN_EMAIL` | For first admin | Creates/links an administrator on seed |
| `SEED_ADMIN_PASSWORD` | For first admin | Admin password (only used when the user is created) |
| `NOTIFICATION_BROADCAST_URL` | **Yes** | External push broadcast base URL |
| `NOTIFICATION_APPLICATION_ID` | **Yes** | App id for that service |
| `NOTIFICATION_BROADCAST_API_KEY` | No | Optional bearer token |
| `NOTIFICATION_BROADCAST_CHANNELS` | No | Comma-separated; default `fcm` |
| `ETRADE_REGISTRATION_URL` | **Yes** | Business TIN lookup |
| `ETRADE_LICENSE_URL` | No | Trade license lookup (defaults beside registration URL) |
| `ETRADE_REGISTRATION_API_KEY` | No | Optional proxy token |
| `RIDE_REQUEST_REMINDER_ENABLED` | No | Default on |
| `RIDE_REQUEST_REMINDER_INTERVAL_MS` | No | Default `900000` (15 min) |
| `INVOICE_AUTOMATION_ENABLED` | No | Default on; set `false` to disable |
| `INVOICE_AUTOMATION_INTERVAL_MS` | No | Default `3600000` (1 hour) |
| `DISPATCH_ESCALATION_ENABLED` | No | Default on |
| `TRIP_DISRUPTION_REROUTE_ENABLED` | No | Default on |
| `RIDE_REQUEST_EXPIRY_ENABLED` | No | Default on |
| `NODE_ENV` | No | `development` / `production` |

Customer invoice payment methods are **not** env-based. Configure them in **Admin → System Settings → Payment Gateway**.

### Web (`NEXT_PUBLIC_*`)

These are baked in at **build time** for production images.

| Variable | When to set |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Absolute API origin if the browser should call the API directly (e.g. `http://localhost:4000` or `https://api.example.com`). Leave unset locally so the app uses same-origin `/api` rewrites. |
| `NEXT_PUBLIC_REALTIME_URL` | Socket.IO origin if it differs from the API URL |

---

## Database, migrations, and seed

Schema lives at `apps/api/prisma/schema.prisma`. Migrations live in `apps/api/prisma/migrations/`.

**You usually do not run migrate by hand.** `apps/api` runs `prisma migrate deploy` and the default seeders every time the process starts.

Do not ship `schema.prisma` changes without a file in `prisma/migrations/` (`db push` updates a local database only). The CI workflow runs `pnpm db:check` on pull requests and before deploy on `main`.

From `apps/api`:

```bash
pnpm db:generate          # Prisma client
pnpm db:migrate           # prisma migrate dev (new migration during development)
pnpm db:check             # fail if schema.prisma is ahead of prisma/migrations
pnpm db:deploy            # prisma migrate deploy (CI / prod)
pnpm db:seed              # full default seed
pnpm db:seed --help       # list targets
pnpm db:restore-admin     # re-attach admin role + permissions to SEED_ADMIN_EMAIL
```

### Seed targets

Default startup seed (no extra demo data):

`roles` → `access` → `notifications` → `regions` → `locations` → `vehicle-types` → `vehicle-classes` → `vehicle-type-classes` → `vehicles` → `fare-plans` → `admin`

Optional demo (customer, driver, contracts, trips, invoices):

```bash
cd apps/api
pnpm db:seed billing-demo
```

Defaults (overridable with `SEED_CUSTOMER_*` / `SEED_DRIVER_*`):

| Account | Email | Password |
| --- | --- | --- |
| Demo customer | `red@gmail.com` | `DemoCustomer1!` |
| Demo driver | `driver@gmail.com` | `DemoDriver1!` |

Clear that demo set with `pnpm db:seed billing-demo-clear` (or `SEED_BILLING_DEMO_RESET=true` when re-seeding).

---

## Typical first-run walkthrough

1. Sign in as admin → you land on **Admin Dashboard**.
2. **Branding** — upload a logo so the landing page and portals match your agency.
3. **Payment Gateway** — add at least one method (name, logo, instruction fields) and enable it so customers can pay invoices.
4. **Locations** — confirm seeded regions/sites or add your own with coordinates.
5. **Fleet setup** — types, classes, then vehicles (photos, insurance, inspection, optional geofence).
6. **Drivers** — create users with the driver role, attach license photos, assign a default vehicle, define **shift periods** and a week of assignments.
7. **Fare plans & booking policies** — pricing model, waiting fees, cancel/no-show rules.
8. **Contracts** — create an active contract, attach a fare plan and policy, **enroll** a customer for a date range.
9. Approve a **registration** (or use the billing demo customer).
10. As the customer: **Book** a trip → as admin: **Dispatch** (assign vehicle/driver) → complete the trip → **Invoices** generate (manually or via the hourly job) → customer pays using the gateway instructions → admin marks the invoice paid.

---

## API and realtime

- REST envelope: success `{ success: true, data }`, errors `{ success: false, error }`. Paginated lists include `pagination`.
- Locale: `?locale=am` or `Accept-Language`.
- Interactive docs: `GET /api/docs`.
- Health: `GET /api/health`.
- Realtime namespace: **`/api/ws`** (Socket.IO). Authenticate with the same JWT. Events cover session ready, trip snapshots, location publish/subscribe, and geofence status. Shared event names live in `@smart-dispatch/types`.

---

## Deploy

### Option A — Docker Compose (single host)

The repo includes `docker-compose.yml` (web, API, Postgres). Compose now:

- waits for Postgres to accept connections before starting the API
- sets `UPLOAD_ROOT` and persists uploads (driver licenses, vehicle photos, branding, payment method logos)
- bakes `NEXT_PUBLIC_API_URL` into the **web image at build time** (Next.js cannot read it at runtime)

The public API URL is **not** hardcoded in Compose. GitHub Actions injects it from repository secrets when building images. Locally, copy `.env.example` to `.env` next to `docker-compose.yml`.

**GitHub Actions secrets**

Repo **Settings → Secrets and variables → Actions**. Add:

| Secret | Used for |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public API origin baked into the web image (for example `https://api.your-domain.com`) |
| `NEXT_PUBLIC_REALTIME_URL` | Optional; defaults to `NEXT_PUBLIC_API_URL` |
| `APP_URL` | Frontend origin used in password-reset links |
| `JWT_SECRET` | Signs access tokens |
| `POSTGRES_PASSWORD` | Postgres and `DATABASE_URL` |
| `NOTIFICATION_BROADCAST_URL` | Push notification service base URL |
| `NOTIFICATION_APPLICATION_ID` | Push notification application id |
| `ETRADE_REGISTRATION_URL` | Business TIN lookup |

The workflow `.github/workflows/docker.yml` runs the Prisma migration check on pull requests and `main`. On `main` (and manual dispatch) it then deploys with `docker compose build` using those secrets. Deploy does not start unless the schema check passes.

```bash
# Local image build
cp .env.example .env
docker compose up --build -d
```

Services:

| Service | Host port | Notes |
| --- | --- | --- |
| `web` | 3000 | Next.js standalone |
| `api` | 4000 | Runs migrations + seed on boot; health at `/api/health` |
| `postgres` | 5432 | Volume `pgdata` |

Optional Compose `.env` values:

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_REALTIME_URL=https://api.your-domain.com
JWT_SECRET=replace-me
POSTGRES_PASSWORD=replace-me
APP_URL=https://dispatch.your-domain.com
NOTIFICATION_BROADCAST_URL=https://notifications.example.com
NOTIFICATION_APPLICATION_ID=your-notification-app-id
ETRADE_REGISTRATION_URL=https://etrade.example.com/api/etrade/registration
```

**Before you treat this as production**

1. Change `JWT_SECRET` and `POSTGRES_PASSWORD`.
2. Point `APP_URL` at the public web URL.
3. Put TLS in front of both services (nginx, Caddy, or a cloud load balancer). Prefer one public origin that reverse-proxies `/` to web and `/api` + `/uploads` + `/api/ws` to the API so cookies and Socket.IO stay same-origin. In that setup, set the GitHub secret `NEXT_PUBLIC_API_URL` to `/`.
4. Do not expose Postgres publicly; keep `5432` bound to localhost or a private network.

### Option B — Build artifacts without Compose

**API**

```bash
pnpm install --frozen-lockfile
pnpm --filter api build          # prisma generate + tsc
# set DATABASE_URL, JWT_SECRET, APP_URL, UPLOAD_ROOT
pnpm --filter api db:deploy      # or rely on process start (migrate() in index.ts)
NODE_ENV=production pnpm --filter api start
```

Run this behind a process manager (systemd, PM2) with Postgres reachable.

**Web**

```bash
# Set public API URL *before* next build
export NEXT_PUBLIC_API_URL=https://api.example.com
export NEXT_PUBLIC_REALTIME_URL=https://api.example.com   # if Socket.IO is on the API host
pnpm --filter web build
pnpm --filter web start
```

`apps/web` uses `output: "standalone"`. The Docker image copies `.next/standalone` and static assets. On a VM you can run `node apps/web/server.js` from that standalone output.

### Option C — Reverse proxy (recommended production shape)

```
https://dispatch.example.com          →  web :3000
https://dispatch.example.com/api      →  api :4000  (HTTP + WebSocket upgrade)
https://dispatch.example.com/uploads  →  api :4000
https://dispatch.example.com/api/ws   →  api :4000  (Socket.IO)
```

Then build the web app with `NEXT_PUBLIC_API_URL=/` (or omit it) so the browser stays same-origin, and set `NEXT_PUBLIC_REALTIME_URL` only if the websocket host differs.

Enable WebSocket headers on the proxy (`Upgrade`, `Connection`). Increase body size limits if you upload vehicle photos or logos.

### Checklist

- [ ] Postgres backups (volume snapshots or `pg_dump`)
- [ ] Persistent `UPLOAD_ROOT`
- [ ] Strong `JWT_SECRET` and DB password
- [ ] HTTPS
- [ ] Seed admin password changed after first login
- [ ] Payment methods configured in the admin UI
- [ ] Optional: SMTP / notification broadcast / eTrade URLs
- [ ] Firewall: only 80/443 public; 5432 private
- [ ] Health check: `GET /api/health`

---

## Useful scripts

Root:

```bash
pnpm run dev       # API + web
pnpm run build     # all packages
pnpm run lint
pnpm run format    # prettier
```

API (`apps/api` or `pnpm --filter api <script>`):

```bash
pnpm dev
pnpm build
pnpm start
pnpm db:seed
pnpm db:seed --help
pnpm db:restore-admin
```

---

## Troubleshooting

**API exits with `DATABASE_URL environment variable is required`**  
Copy `apps/api/.env.example` to `apps/api/.env`. `tsx watch` loads it via `dotenv`.

**Cannot connect to Postgres**  
Confirm the server is up and `DATABASE_URL` matches user, password, host, port, and database name. The API tries to create the database if the role can connect to `postgres` and issue `CREATE DATABASE`.

**Admin login fails**  
Seed only creates the admin when **both** `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set, and only on first insert (existing users keep their password). Use `pnpm db:restore-admin` if the user exists but lost the admin role.

**Role permissions keep resetting**  
Startup seed no longer replaces role permission lists. User and driver roles are seeded only when empty. The admin role only **gains** newly added permissions; it does not drop ones you removed. To fully reset the admin permission set, run `pnpm db:restore-admin`.

**Seeded catalog edits keep reverting**  
Startup seed now only **creates missing** roles, menus, regions, locations, vehicle types/classes, vehicles, and fare plans. Existing rows (including prices, plates, menu labels, SMS provider) are left as you saved them. New seed items still appear. Permissions and API endpoints remain code-owned and can update.

**Web loads but API calls 404**  
Start the API on port 4000. Local Next rewrites are hardcoded to `http://localhost:4000`.

**Images / logos 404**  
Set `UPLOAD_ROOT`, restart the API, re-upload. In production, proxy `/uploads` to the API.

**Socket.IO never connects**  
Use `http://localhost:4000` in local dev. In production, proxy `/api/ws` with WebSocket support, or set `NEXT_PUBLIC_REALTIME_URL` to the API origin at **build** time.

**Empty payment options on invoices**  
Add and **enable** methods under Admin → System Settings → Payment Gateway. Incomplete leftover methods are saved as disabled so they do not block deletes.

**Prisma client missing**  
Run `pnpm install` from the repo root, or `pnpm --filter api db:generate`. Generated client is gitignored (`apps/api/src/generated`).
