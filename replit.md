# AVEX — Replit Agent Build & Operate Guide

> 🚨 **READ THIS ENTIRE FILE FIRST. It is your primary instruction.**
> AVEX is a **multi-app food delivery platform** with 6 independently deployable parts.
> This Replit runs ONE part. The other 5 run on **separate Replits** sharing the same repo.
>
> **Your job**: build, fix, and operate ONLY the part assigned to this Replit.
> **Never delete or restructure** the rest of the repo — it is shared by 6 Replits.

---

## 1. What AVEX is (full project context)

AVEX is a global food delivery platform with **6 independently deployable parts** sharing one Git repository:

| # | Part | Folder | Port | Stack | Role |
|---|---|---|---|---|---|
| 1 | Backend | `backend/` | 8080 | Go 1.23 + pgx/v5 | API for the whole platform (PostgreSQL only) |
| 2 | Customer | `apps/customer/` | 3000 | Next.js 16 | End-user ordering app |
| 3 | Driver | `apps/driver/` | 3001 | Next.js 16 | Driver app (offers, delivery, earnings, tiers) |
| 4 | Admin | `apps/admin/` | 3002 | Next.js 16 | Admin panel (zones, tiers, prices, drivers) |
| 5 | Support | `apps/support/` | 3003 | Next.js 16 | Support agent workspace (tickets, search) |
| 6 | Merchant | `apps/merchant/` | 3004 | Next.js 16 | Restaurant portal (menu, orders, hours) |

**All 6 parts live in the same repo. Each Replit imports the full repo but runs ONE part** based on the `run = "..."` line in `.replit`.

### How to know which part THIS Replit runs

Open `.replit` and read the `run` line:
- `run = "bash scripts/replit-backend.sh"` → **Backend Replit** (port 8080)
- `run = "bash scripts/replit-app.sh customer 3000"` → **Customer Replit** (port 3000)
- `run = "bash scripts/replit-app.sh driver 3001"` → **Driver Replit** (port 3001)
- `run = "bash scripts/replit-app.sh admin 3002"` → **Admin Replit** (port 3002)
- `run = "bash scripts/replit-app.sh support 3003"` → **Support Replit** (port 3003)
- `run = "bash scripts/replit-app.sh merchant 3004"` → **Merchant Replit** (port 3004)

If `.replit` is missing or `run` is empty, **STOP and ask the user which part to run.**

---

## 2. STRICT RULES (violations break the whole platform)

### 🚫 NEVER do any of these:
1. **NEVER delete files or folders** outside your assigned part.
2. **NEVER replace this `replit.md` file** with a template or shorten it.
3. **NEVER restructure the repo** — folder layout is intentional and shared.
4. **NEVER add SQLite** — backend is PostgreSQL ONLY.
5. **NEVER use `?` SQL placeholders** — PostgreSQL uses `$1, $2, $3, ...`.
6. **NEVER use `1/0` for booleans in SQL** — use `TRUE/FALSE`.
7. **NEVER use `datetime('now', ...)` or `GROUP_CONCAT(...)`** — use `NOW() - INTERVAL '...'` and `STRING_AGG(...)`.
8. **NEVER run `git push --force`** or rewrite git history.
9. **NEVER install dependencies in the wrong app** — if this is the Customer Replit, only touch `apps/customer/package.json`.
10. **NEVER change the design system** — pure white + black + gray only. Cairo font. RTL Arabic.

### ✅ ALWAYS do these:
1. Only edit files inside your assigned part's folder.
2. Use the existing run scripts in `scripts/`.
3. Ask the user before making structural changes.
4. If unsure about anything, **STOP and ask** — do not guess.

---

## 3. THE PROXY ROUTE — How all apps connect to the backend

**This is the most critical integration point.** Every Next.js app has a proxy route that forwards API calls to the Go backend. Without it, the apps can't reach the database.

### Where it lives
Every Next.js app has this file:
```
apps/<app-name>/src/app/api/[...path]/route.ts
```

### How it works
1. The frontend calls `/api/driver/auth/login` (relative URL)
2. Next.js catches it in the proxy route
3. The proxy forwards it to `${BACKEND_URL}/api/driver/auth/login`
4. `BACKEND_URL` defaults to `http://localhost:8080` (dev) or the Backend Replit URL (production)

### The proxy code (same in all 5 apps)
```typescript
const API_BASE = process.env.BACKEND_URL || 'http://localhost:8080'
const REQUEST_TIMEOUT = 15000
const MAX_RETRIES = 2

// Forwards: GET, POST, PUT, PATCH, DELETE
// - Preserves Authorization header
// - Retries on network failure (2 retries with backoff)
// - Returns 503 with Arabic error if backend unreachable
```

### Agent instruction: VERIFY THE PROXY WORKS
When you start any Next.js app Replit, you MUST:
1. Check that `apps/<app-name>/src/app/api/[...path]/route.ts` exists
2. Check that it reads `process.env.BACKEND_URL`
3. Check that `BACKEND_URL` is set as a Replit Secret
4. Test the proxy by calling `/api/health` — should return `{"service":"avex-api","status":"ok"}`
5. If the proxy returns 503, the backend is down or `BACKEND_URL` is wrong

### If the proxy is broken, FIX it:
```bash
# Check if file exists
ls apps/<app-name>/src/app/api/[...path]/route.ts

# If missing, copy from another app
cp apps/driver/src/app/api/[...path]/route.ts apps/<app-name>/src/app/api/[...path]/route.ts
```

---

## 4. ENVIRONMENT VARIABLES (Secrets)

### Backend Replit (REQUIRED)
- `DATABASE_URL` — PostgreSQL connection string (REQUIRED)
  - Example: `postgres://user:pass@host:5432/avex?sslmode=require`
  - Free providers: Neon (neon.tech), Supabase (supabase.com)
- `JWT_SECRET` — random string (optional, has default)
- `PORT` — defaults to 8080

### Next.js App Replits (REQUIRED)
- `BACKEND_URL` — URL of the Backend Replit (REQUIRED)
  - Example: `https://avex-backend.yourname.repl.co`
  - The proxy route uses this to forward API calls

### How to set Secrets on Replit
1. Open the Replit
2. Go to **Tools → Secrets** (or click the lock icon in sidebar)
3. Add key + value
4. The app reads it via `process.env.KEY`

---

## 5. Run & Operate commands

### Backend Replit (port 8080)
```bash
bash scripts/replit-backend.sh
```
What this does:
1. Checks `DATABASE_URL` is set (fails with clear error if not)
2. `cd backend && go build -o avex-api ./cmd/server`
3. Runs `./avex-api` on `PORT` (default 8080)
4. Auto-creates all 28 tables + seeds demo data on first run

### Next.js App Replits (ports 3000-3004)
```bash
bash scripts/replit-app.sh <app-name> <port>
# Example: bash scripts/replit-app.sh customer 3000
```
What this does:
1. `cd apps/<app-name>`
2. Installs deps with `bun install` (or `npm install` fallback)
3. `npx next build`
4. `npx next start -p <port>`

---

## 6. INTEGRATION — How all apps work together

### The data flow
```
Customer app (3000)  ─┐
Driver app (3001)    ─┤
Admin app (3002)     ─┼──► Proxy route ──► Backend (8080) ──► PostgreSQL
Support app (3003)   ─┤                     (Go API)
Merchant app (3004)  ─┘
```

### Critical integration points

#### 1. Order lifecycle (cross-app)
```
Customer creates order
  → Backend: order status = "accepted" (restaurant auto-accept)
  → Backend: dispatch algorithm runs, creates dispatch_offers
  → Driver app: polls /api/driver/offers every 3s
  → Driver accepts offer
  → Backend: order status = "assigned", driver_fee computed
  → Driver: goes to restaurant (geofence 70m)
  → Driver: confirms pickup → status = "picked_up"
  → Merchant app: sees order move to "picked_up" in real-time (polls every 5s)
  → Driver: goes to customer (geofence 50m)
  → Driver: confirms delivery → status = "delivered"
  → Backend: driver_stats updated, tier re-evaluated
  → Customer: sees order delivered in tracking
```

#### 2. Driver tier system (cross-app)
```
Driver delivers orders
  → Backend: updates driver_stats (accepted, completed, on_time, rating)
  → Backend: evaluateDriverTier() runs after each delivery
  → Driver app: shows current tier + progress to next tier
  → Admin app: can manually override tier
  → Admin app: can edit tier thresholds
```

#### 3. Support ticket flow (cross-app)
```
Driver: creates ticket in Driver app (/support)
  → Backend: support_tickets row created
  → Support app: agent sees ticket in inbox (polls every 8s)
  → Support agent: assigns to self, replies
  → Driver: sees reply in /support/[id] chat (polls every 5s)
  → Support agent: can cancel order if ticket is cancellation_request
```

#### 4. Merchant menu changes (cross-app)
```
Merchant: edits menu in Merchant app
  → Backend: menu_items updated
  → Customer app: sees updated menu immediately (fetches from backend)
  → Admin app: can also edit menu (admin has override)
```

### Agent instruction: ENSURE INTEGRATION WORKS
When deploying or fixing any app:
1. **Backend must be deployed first** — other apps depend on it
2. **All Next.js apps must have `BACKEND_URL` Secret** pointing to the Backend Replit
3. **Test the integration**:
   - Customer creates order → Driver receives offer
   - Driver delivers → Merchant sees status change
   - Driver creates support ticket → Support agent sees it
4. **If integration is broken**, check:
   - Is `BACKEND_URL` set correctly? (no trailing slash, includes `https://`)
   - Is the backend running? (call `/api/health`)
   - Are there CORS issues? (backend allows all origins)
   - Is the proxy route working? (check `apps/<app>/src/app/api/[...path]/route.ts`)

---

## 7. SQL Dialect Rules (PostgreSQL ONLY) — CRITICAL

| ❌ Wrong (SQLite) | ✅ Right (PostgreSQL) |
|---|---|
| `WHERE is_active = 1` | `WHERE is_active = TRUE` |
| `INSERT ... VALUES (?, ?)` | `INSERT ... VALUES ($1, $2)` |
| `datetime('now', '-7 days')` | `NOW() - INTERVAL '7 days'` |
| `date('now')` | `CURRENT_DATE` |
| `GROUP_CONCAT(expr, sep)` | `STRING_AGG(expr, sep)` |
| `INSERT OR IGNORE INTO` | `INSERT INTO ... ON CONFLICT DO NOTHING` |
| `ALTER TABLE x ADD COLUMN y` | `ALTER TABLE x ADD COLUMN IF NOT EXISTS y` |

---

## 8. The 4 Core Algorithms

### Dispatch (when restaurant accepts order)
```
score = distance×0.50 + tier×0.30 + response×0.10 + shift×0.10
Top 5 drivers get offers, each expires in 15 seconds
```

### Pricing
```
Customer fee: silver-tier × zone pricing
Driver fee: driver's tier × zone pricing
Platform margin = customer_fee - driver_fee
```

### Geofence
```
Pickup: driver must be within 70m of restaurant
Delivery: driver must be within 50m of customer
```

### Tier Evaluation
```
acceptance_rate = accepted / (accepted + rejected) × 100
completion_rate = completed / accepted × 100
on_time_rate = on_time / completed × 100
shift_adherence = attended / scheduled × 100
Find highest tier whose thresholds are all met
```

---

## 9. Build & fix instructions per Replit

### If this is the **Backend Replit**
```bash
cd backend
go build -o avex-api ./cmd/server
./avex-api
```
Common fixes:
- `DATABASE_URL not set` → add it as a Replit Secret
- `go: command not found` → ensure `replit.nix` has `pkgs.go`
- Build error → check SQL dialect rules (section 7)

When adding new endpoints:
1. Add handler in `internal/<app>/handlers.go`
2. Register route in `internal/<app>/routes.go`
3. Use `$1, $2, ...` placeholders (NEVER `?`)
4. Use `TRUE/FALSE` for booleans

### If this is a **Next.js App Replit**
```bash
cd apps/<app-name>
bun install
npx next build
npx next start -p <port>
```
Common fixes:
- `App can't reach backend` → ensure `BACKEND_URL` Secret is set
- `Cannot find module` → run `bun install`
- `useSearchParams error` → wrap component in `<Suspense>`
- `503 from proxy` → backend is down, check Backend Replit

When adding new pages:
1. Only edit files inside `apps/<your-app>/src/`
2. Use `src/lib/api.ts` for API calls
3. Use `src/components/ui/` for shadcn components
4. Follow design: white bg, black primary, gray secondary. NO colors.

---

## 10. Deployment order (CRITICAL)

1. **Create PostgreSQL database** (Neon or Supabase — free)
2. **Deploy Backend Replit FIRST**:
   - Import repo
   - Set `.replit` run line
   - Add Secret `DATABASE_URL`
   - Run → note the Backend URL
3. **Deploy the 5 Next.js Replits** (any order):
   - For each: import repo, set `.replit` run line
   - Add Secret `BACKEND_URL` = Backend Replit URL
   - Run

---

## 11. GOTCHAS (sharp edges)

1. **`?` placeholders silently fail on PostgreSQL** — always use `$1, $2, ...`
2. **Boolean `1/0` fails on PostgreSQL** — use `TRUE/FALSE`
3. **`location_updated_at` staleness** — drivers offline if GPS not updated in 30s
4. **Geofence**: 70m pickup, 50m delivery — enforced in backend
5. **Restaurant auto-accept is mandatory** — orders go straight to dispatch
6. **Drivers cannot cancel** — support ticket with convincing reason required
7. **`replit.md` is the agent's source of truth** — never replace it
8. **All 6 Replits share the same repo** — deleting files affects all
9. **Proxy route is critical** — if missing, app can't reach backend
10. **`BACKEND_URL` must not have trailing slash** — `https://api.example.com` not `https://api.example.com/`

---

## 12. DEMO ACCOUNTS (after seed)

| App | Phone | Password |
|---|---|---|
| Admin | 01000000000 | admin123 |
| Driver | 01100000001 / 01100000002 | 123456 |
| Merchant | 01200000001 to 01200000005 | 123456 |
| Support | 01500000001 / 01500000002 | 123456 |
| Customer | any Egyptian number | (register yourself) |

---

## 13. POINTERS (source-of-truth files)

| What | Where |
|---|---|
| DB schema | `backend/internal/shared/db.go` → `createSchema()` |
| Seed data | `backend/internal/shared/seed.go` |
| API routes | `backend/internal/*/routes.go` |
| Algorithms | `backend/internal/dispatch/` |
| Frontend API clients | `apps/<app>/src/lib/api.ts` |
| Proxy route | `apps/<app>/src/app/api/[...path]/route.ts` |
| Design system | `apps/<app>/src/app/globals.css` |
| Replit config | `.replit` |
| Nix packages | `replit.nix` |

---

## 14. IF UNSURE — STOP AND ASK

Do not guess. Do not delete files. Do not restructure. Do not replace this file.

**Better to ask than to break the platform.**
