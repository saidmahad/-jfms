# ⛽ JUPA Fuel Station Management System (JFMS)

A complete, production-quality full-stack fuel station management system built from the JUPA Fuel Station Management System thesis. The application runs a real REST API backed by a real database — every button, form, table and report is wired to the backend. No fake data, no disconnected UI.

```
React Frontend  ⇄  REST API  ⇄  Express Backend  ⇄  SQLite Database
```

---

## 1. Tech Stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Frontend  | React 18, TypeScript, Vite 6, Tailwind CSS, Lucide icons, Recharts, TanStack Query, React Hook Form, Zod |
| Backend   | Node.js (22.5+), Express 4, TypeScript, Zod validation |
| Database  | SQLite (built-in `node:sqlite` driver, WAL mode)        |
| Auth      | JWT (Bearer tokens), bcrypt password hashing            |
| Tests     | Vitest + Supertest (backend), `tsc` typechecks          |

> **Note on stack choice:** the thesis prompt preferred PHP/Laravel + MySQL. This implementation uses a modern TypeScript stack (Express + SQLite) that satisfies the same three-tier architecture, REST API, real authentication, real CRUD, database transactions, audit logging and role-based authorization. The database layer is isolated in `backend/src/db`, so it can be swapped for MySQL/PostgreSQL without touching controllers or services.

---

## 2. Features

- **Authentication** — JWT login/logout, bcrypt hashing, account-status checks, session expiry, role-based route protection
- **Roles** — `ADMIN` (full access), `MANAGER` (operations, no admin settings/users/audit), `ATTENDANT` (own pump, new sale, own transactions, customers)
- **Dashboard** — real KPIs (today's sales/revenue, expenses, net profit, available fuel, active pumps, employees, low-stock alerts), sales overview line chart, revenue vs expenses bar chart, fuel-sales donut, pump performance bar chart, recent transactions, low-stock panel, fuel-tank visualization
- **Sales / POS** — pump + fuel selection, litres entry, backend-computed price and total, inventory check, payment methods (Cash/Card/Mobile Money/RFID/Other), receipt with print + PDF, payment-status updates
- **Fuel Management** — CRUD, price history, activate/deactivate, stock levels, low/critical stock badges
- **Pump Management** — pump cards with meter readings, statuses (active/inactive/maintenance/offline), assigned attendants, today's sales per pump
- **Inventory** — stock overview, purchases (increase stock), adjustments, traceable stock movements, low-stock alerts
- **Suppliers / Customers / Employees / Expenses** — full CRUD with search, filter, pagination, status toggles
- **Reports** — sales (daily/weekly/monthly/custom), inventory, revenue (revenue/expenses/gross/net profit), employees (sales performance), pumps; print / PDF / CSV export
- **Users & Audit Logs** — admin-managed users, every important action logged (login, sales, price changes, purchases, employee changes, etc.) with user, module, record, old/new values, IP
- **Settings** — station name/address/phone/email, currency, timezone, receipt footer, low-stock threshold, theme, notification prefs (admin only)
- **Notifications** — low stock, critical stock, sales, failed logins, system events; toast + notification center
- **UI/UX** — premium petroleum design system, dark mode, responsive layout, skeleton loaders, empty states, confirmation dialogs, error states, toasts, animated counters and charts

---

## 3. Project Structure

```
backend/
  src/
    app.ts, server.ts, config.ts        # Express app, entrypoint, env config
    db/                                 # SQLite driver, migrations, seeder
      migrations/*.sql                  # 6 versioned migration files
      migrate.ts, seed.ts, index.ts     # migrate / seed scripts, transaction helper
    controllers/                        # HTTP layer (16 modules)
    services/                           # business logic (sales, inventory, reports, ...)
    middleware/                         # auth, permissions, validation, rate-limit, errors
    schemas/                            # Zod request schemas
    utils/                              # permissions map, case helpers, errors, password, query
    tests/                              # Vitest + Supertest suite
    types/
frontend/
  src/
    pages/                              # 22 pages (login, dashboard, POS, reports, ...)
    components/                         # layout, ui kit, charts, sales/receipt
    contexts/                           # Auth, Theme, Settings, Toast
    lib/                                # api client, query client, permissions, formatters
    types/
```

---

## 4. Prerequisites

- **Node.js 22.5+** (uses the built-in `node:sqlite` driver; Node 24 recommended)
- npm (comes with Node)

No external database server is required — SQLite is embedded and lives at `backend/data/jfms.sqlite` (auto-created).

---

## 5. Setup & Run

### Backend

```bash
cd backend
npm install

# Optional: configure environment (see backend/.env.example)
cp .env.example .env

# Create tables + seed development data
npm run db:setup          # = migrate + seed

# Start the API on http://localhost:4000
npm run dev               # or: npm run start
```

Health check: `http://localhost:4000/api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api to :4000)
```

Open **http://localhost:5173** and log in.

### Fresh database

To rebuild the database from scratch:

```bash
cd backend
rm -f data/jfms.sqlite data/jfms.sqlite-shm data/jfms.sqlite-wal
npm run db:setup
```

---

## 6. Default Development Accounts

| Role      | Username    | Password        | Access                                        |
|-----------|-------------|-----------------|-----------------------------------------------|
| Admin     | `admin`     | `Admin@12345`   | Everything, incl. users, audit logs, settings |
| Manager   | `manager`   | `Manager@12345` | Operations modules, reports; no admin-only    |
| Attendant | `attendant` | `Attendant@12345` | Dashboard, own pump, new sale, own transactions, customers |

> These are **development/demo accounts**. Passwords are bcrypt-hashed in the database. Change them before any production use.

---

## 7. Environment Variables

See `backend/.env.example`:

| Variable       | Default                      | Description                              |
|----------------|------------------------------|------------------------------------------|
| `PORT`         | `4000`                       | API port                                 |
| `NODE_ENV`     | `development`                | `test` enables the in-memory test DB     |
| `JWT_SECRET`   | `jfms-dev-secret-change-me`  | **Change in production**                 |
| `JWT_EXPIRES_IN` | `12h`                      | Token lifetime                           |
| `DB_PATH`      | `./data/jfms.sqlite`         | SQLite file path (`:memory:` for tests)  |
| `CORS_ORIGIN`  | `http://localhost:5173`      | Comma-separated allowed origins          |

The frontend needs no env vars — Vite proxies `/api` to `http://localhost:4000` (see `frontend/vite.config.ts`).

---

## 8. Database Schema

Migrations live in `backend/src/db/migrations/` (applied in order, tracked in `schema_migrations`):

| Table                    | Purpose                                              |
|--------------------------|------------------------------------------------------|
| `employees`              | Staff, position, salary, status                      |
| `users`                  | Login accounts, role, status, link to employee       |
| `fuels`                  | Fuel types, price per litre, stock, thresholds       |
| `fuel_price_history`     | Every price change (historical sales keep their price) |
| `pumps`                  | Pump number, fuel, meter reading, status, attendant  |
| `customers`              | Name, phone, vehicle, RFID                           |
| `suppliers`              | Supplier details                                     |
| `sales`                  | Sale header (employee, pump, customer, totals, payment) |
| `sale_details`           | Sale lines (fuel, litres, price per litre, subtotal) |
| `inventory_transactions` | Purchases / sales / adjustments / returns (traceable) |
| `expenses`               | Expense records                                      |
| `audit_logs`             | Audit trail                                          |
| `settings`               | Station configuration key/values                     |
| `notifications`          | In-app notifications                                 |

Foreign keys are enforced (`PRAGMA foreign_keys = ON`), indexes are created on hot columns, and `fuel_price_history` preserves the price used at the time of each sale.

---

## 9. Key Business Rules (enforced on the backend)

- **Sale total** = litres × price-per-litre — always recomputed by the backend; the client can never dictate the total
- **Inventory** decreases atomically with every sale; **purchases** increase it; every stock change writes an `inventory_transactions` row
- A sale fails if **stock is insufficient**, the **pump is not active**, the **fuel is inactive**, or **litres ≤ 0**
- **Only ACTIVE users** can log in; **inactive employees** cannot transact
- All sale operations run inside a **database transaction** — any failure rolls back everything (no partial sales)
- **Net profit** = revenue − expenses, computed from database queries only
- **Permissions are enforced server-side** — role checks in the frontend are UI convenience only

---

## 10. API Overview

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| POST   | `/api/auth/login`               | Login                        |
| POST   | `/api/auth/logout`              | Logout                       |
| GET    | `/api/auth/me`                  | Current user + permissions   |
| GET    | `/api/dashboard`                | KPIs + charts + transactions |
| GET    | `/api/dashboard/charts`         | Chart data                   |
| GET/POST/PUT | `/api/fuels` …          | Fuel management (+ price/status patches) |
| GET/POST/PUT/DELETE | `/api/pumps` …    | Pump management              |
| GET/POST | `/api/sales` …                 | Sales + sale details + payment status |
| GET/POST | `/api/inventory/*`            | Overview, movements, purchase, adjustment, low stock |
| GET/POST/PUT/DELETE | `/api/suppliers`, `/api/customers`, `/api/employees`, `/api/expenses` | CRUD modules |
| GET    | `/api/reports/sales`, `/inventory`, `/revenue`, `/employees`, `/pumps` | Reports |
| GET/POST/PUT/PATCH | `/api/users`            | User management (admin)      |
| GET    | `/api/audit-logs`               | Audit trail (admin)          |
| GET/PUT | `/api/settings`               | Station settings (admin)     |
| GET/POST | `/api/notifications`         | Notification center          |

All responses use a consistent envelope: `{ success, message, data, errors? }`. Requests are rate-limited (login stricter), validated with Zod, and protected by `authRequired` + permission middleware.

---

## 11. Tests

```bash
cd backend
npm test          # Vitest + Supertest (43 tests)
npm run typecheck # tsc --noEmit

cd frontend
npm run typecheck
npm run build
```

Coverage includes: authentication (login success/failure, inactive users, unauthorized roles, logout), sales (valid sale, insufficient stock, inventory update, total calculation, inactive pump), inventory (purchase, adjustment, low stock), expenses (create, validation), employees (create/update/deactivate), reports (totals, revenue, expenses, profit), and dashboard (role-scoped access, KPI updates after a sale).

---

## 12. Production Notes

- Set a strong `JWT_SECRET` and enable HTTPS
- Rate limiting is on; adjust `backend/src/middleware/rate-limit.ts` as needed
- SQLite is great for single-node deployments; for multi-instance or heavy concurrency, point the DB layer at MySQL/PostgreSQL
- Schedule regular backups of `backend/data/jfms.sqlite` (WAL mode — use `sqlite3 .backup` or file snapshot with WAL checkpoint)

---

## 13. Deploying to the Cloud

The project is deployment-ready. The frontend is a static Vite build; the backend is a Node/Express API that requires **Node 22.5+** (built-in SQLite).

### Architecture

```
Frontend (Vercel or Render static)
        │  HTTPS
        ▼
Backend API (Render web service)
        │
        ▼
SQLite file (ephemeral on free plans — persisted on paid disks)
```

### Option A — Render (both pieces)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint** and select the repo
3. Render reads `render.yaml` and creates:
   - `jfms-api` — Node web service (migrates + seeds on build, health check at `/api/health`)
   - `jfms-app` — static site serving the built frontend
4. After the first deploy, copy the real service URLs into the `render.yaml` env vars (`CORS_ORIGIN` on the API, `VITE_API_URL` on the app) and redeploy, or set them in the Render dashboard

### Option B — Vercel frontend + Render backend

**Backend (Render):**

1. Create a **Web Service** from the repo, root directory `backend`
2. Build: `npm install && npm run db:setup` — Start: `npm run start`
3. Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CORS_ORIGIN=https://<your-vercel-app>.vercel.app`

**Frontend (Vercel):**

1. Import the repo, framework preset **Vite**, root directory `frontend`
2. Set environment variable `VITE_API_URL=https://<your-render-backend>.onrender.com`
3. `frontend/vercel.json` already adds SPA rewrites so routes like `/sales` work on refresh

### Demo accounts on any fresh deploy

The backend auto-seeds when the database is empty (`server.ts` calls `runSeed()` on startup), so a brand-new deployment is immediately usable:

| Role      | Username    | Password        |
|-----------|-------------|-----------------|
| Admin     | `admin`     | `Admin@12345`   |
| Manager   | `manager`   | `Manager@12345` |
| Attendant | `attendant` | `Attendant@12345` |

> ⚠️ **SQLite on free hosting is ephemeral** — data resets whenever the service is redeployed (and may be lost on restart). For a persistent demo, attach a Render **persistent disk** at `backend/data` or switch the DB layer to a managed MySQL/PostgreSQL instance. Change the demo passwords before real use.
