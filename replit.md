# AVEX — Replit Agent Build & Operate Guide

> 🚨 **READ THIS ENTIRE FILE FIRST. It is your primary instruction.**
> AVEX is a **multi-app food delivery platform**. This Replit runs ONE part of it.
> The other 5 parts run on **separate Replits** and depend on this repo staying intact.
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
1. **NEVER delete files or folders** outside your assigned part. The other `apps/` folders, `backend/`, `scripts/`, and `*.md` files belong to other Replits.
2. **NEVER replace this `replit.md` file** with a template or shorten it. It is the source of truth.
3. **NEVER restructure the repo** — folder layout is intentional and shared.
4. **NEVER add SQLite** — backend is PostgreSQL ONLY. Do not install `modernc.org/sqlite` or any SQLite driver.
5. **NEVER use `?` SQL placeholders** — PostgreSQL uses `$1, $2, $3, ...`. See section 8.
6. **NEVER use `1/0` for booleans in SQL** — use `TRUE/FALSE`.
7. **NEVER use `datetime('now', ...)` or `GROUP_CONCAT(...)`** — these are SQLite-only. Use `NOW() - INTERVAL '...'` and `STRING_AGG(...)`.
8. **NEVER run `git push --force`** or rewrite git history.
9. **NEVER install dependencies in the wrong app** — if this is the Customer Replit, only touch `apps/customer/package.json`.
10. **NEVER change the design system** — pure white + black + gray only. No colors. Cairo font. RTL Arabic.

### ✅ ALWAYS do these:
1. Only edit files inside your assigned part's folder.
2. Read `PROJECT_PLAN.md` for the full architecture before making non-trivial changes.
3. Read `REPLIT.md` for deployment details.
4. Use the existing run scripts in `scripts/` — do not invent new ones.
5. Ask the user before making structural changes.
6. If you're unsure about anything, **STOP and ask** — do not guess.

---

## 3. Run & Operate commands

### Backend Replit (port 8080)
```bash
bash scripts/replit-backend.sh
```
What this script does:
1. Checks `DATABASE_URL` env var is set (fails with clear error if not)
2. `cd backend && go build -o avex-api ./cmd/server`
3. Runs `./avex-api` on `PORT` (default 8080)

On first run, the backend auto-creates all tables and seeds demo data.

### Next.js App Replits (ports 3000-3004)
```bash
bash scripts/replit-app.sh <app-name> <port>
# Example for Customer: bash scripts/replit-app.sh customer 3000
```
What this script does:
1. `cd apps/<app-name>`
2. Installs deps with `bun install` (or `npm install` fallback)
3. `npx next build`
4. `npx next start -p <port>`

### Required environment variables (Replit Secrets)

#### Backend Replit
- `DATABASE_URL` (**REQUIRED**) — PostgreSQL connection string
  - Example: `postgres://user:pass@host:5432/avex?sslmode=require`
  - Free providers: Neon (neon.tech), Supabase (supabase.com)
- `JWT_SECRET` (optional, has default) — random string for JWT signing
- `PORT` (optional, default 8080)

#### Next.js App Replits
- `BACKEND_URL` (**REQUIRED**) — URL of the Backend Replit
  - Example: `https://avex-backend.yourname.repl.co`
- `PORT` (optional, set by the script argument)

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.23, `net/http`, `pgx/v5` (PostgreSQL driver), JWT (`golang-jwt/jwt/v5`), bcrypt, `rs/cors` |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Framer Motion, Lucide icons |
| Database | **PostgreSQL ONLY** (no SQLite) |
| Auth | 4 JWT types: customer, driver, merchant, agent (each with its own middleware) |
| Design | Microsoft Fluent — pure white (`#FFFFFF`) + black (`#000000`) + gray (`#9CA3AF`/`#6B7280`/`#F3F4F6`). NO colors. |
| Font | Cairo (Arabic + Latin), RTL layout |

---

## 5. Backend architecture (Go modular monolith)

```
backend/
├── cmd/server/main.go              ← Entry point (~40 lines, registers all routes)
└── internal/
    ├── shared/                     ← Shared infrastructure
    │   ├── db.go                   (DB connection + schema + migrations — PostgreSQL ONLY)
    │   ├── seed.go                 (Seed: customers, restaurants, drivers, merchants, agents)
    │   ├── auth.go                 (Claims struct + 4 JWT generators + phone helpers)
    │   ├── http.go                 (WriteJSON + 6 middlewares)
    │   ├── geo.go                  (HaversineM — distance in meters)
    │   └── settings.go             (GetSetting + FindZoneByLatLng)
    ├── dispatch/                   ← Shared algorithms
    │   ├── dispatch.go             (DispatchOrder + AcceptOfferInternal)
    │   ├── pricing.go              (ComputeDriverFee)
    │   └── tier.go                 (EvaluateDriverTier)
    ├── customer/   (handlers.go + routes.go — 13 endpoints)
    ├── driver/     (handlers.go + routes.go — 21 endpoints)
    ├── merchant/   (handlers.go + routes.go — 14 endpoints)
    ├── support/    (handlers.go + routes.go — 12 endpoints)
    └── admin/      (handlers.go + routes.go — 35+ endpoints)
```

### Pattern
- Each app package exposes `RegisterRoutes(mux *http.ServeMux)`.
- `cmd/server/main.go` calls all 5 `RegisterRoutes` functions.
- Single binary serves all apps on port 8080.

### Middlewares (6)
- `AuthMW` — customer JWT
- `OptionalAuthMW` — optional customer JWT (for anonymous checkout)
- `AdminMW` — requires admin flag
- `DriverAuthMW` — driver JWT
- `MerchantAuthMW` — merchant JWT (carries restaurant_id)
- `AgentAuthMW` — support agent JWT (also has admin privileges)

---

## 6. Database (PostgreSQL ONLY)

### 28 tables

**Customer core (12):** users, addresses, favorites, restaurants, categories, menu_items, orders, order_items, coupons, settings, saved_cards, payment_transactions

**Zones & tiers (4):** delivery_zones, driver_tiers, tier_thresholds, tier_zone_prices

**Driver system (7):** driver_applications, drivers, driver_stats, driver_shifts, driver_tier_history, dispatch_offers, support_tickets

**Support (1):** support_messages

**Merchant (3):** merchants, store_hours, scheduled_orders

**Agents (1):** support_agents

### Schema rules (PostgreSQL-only)
- `BOOLEAN DEFAULT TRUE/FALSE` (never `1/0`)
- `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `TEXT PRIMARY KEY` (UUIDs as strings)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for migrations (PostgreSQL 9.6+)
- `INSERT INTO settings (...) VALUES (...) ON CONFLICT (key) DO NOTHING` for idempotent inserts

### Schema source of truth
`backend/internal/shared/db.go` → `createSchema()` function. Read it before touching the DB.

---

## 7. Driver Tier System

### 4 tiers (managed by admin, editable from admin panel)

| Code | Arabic name | sort_order | Color |
|---|---|---|---|
| `starter` | مبتدئ | 1 | `#9CA3AF` |
| `bronze` | برونزي | 2 | `#A16207` |
| `silver` | فضي | 3 | `#6B7280` |
| `gold` | ذهبي | 4 | `#000000` |

### Thresholds (tier_thresholds — editable from admin)

| Tier | acceptance% | completion% | rating | on_time% | shift% | lifetime orders |
|---|---|---|---|---|---|---|
| starter | 0 | 0 | 0 | 0 | 0 | 0 |
| bronze | 60 | 85 | 4.5 | 85 | 80 | 50 |
| silver | 75 | 92 | 4.7 | 92 | 90 | 250 |
| gold | 90 | 96 | 4.8 | 96 | 95 | 750 |

### Downgrade factors
1. Low acceptance rate (rejecting too many offers)
2. Low customer rating (below 4.5/4.7)
3. Low completion rate (below 90-95%)
4. Low on-time rate (late deliveries)
5. Late to shift (recorded in `driver_shifts.is_late`)
6. Geofence violations
7. Customer/restaurant complaints
8. Inactivity (no login for long period)

### Hard rule — NO driver cancellation
Drivers **cannot** cancel an order after accepting it. The only way to cancel is to open a support ticket with a convincing reason, and a support agent approves it. Enforce this in the driver app UI and backend.

### Tier evaluation algorithm
```
INPUT: driver_id
1. Read driver_stats (accepted, rejected, completed, on_time, rating_sum, rating_count, shift_scheduled, shift_attended)
2. Compute:
   acceptance_rate  = accepted / (accepted + rejected) × 100
   completion_rate  = completed / accepted × 100
   customer_rating  = rating_sum / rating_count
   on_time_rate     = on_time_count / completed × 100
   shift_adherence  = shift_attended / shift_scheduled × 100
3. Load all driver_tiers ORDER BY sort_order DESC
4. For each tier (highest first):
   - Read tier_thresholds
   - If driver meets ALL minimums → this is the new tier, break
5. If new tier ≠ current → UPDATE drivers.tier_id + INSERT driver_tier_history
```

Runs automatically: every 24h + after each delivered order + manual from admin.

---

## 8. SQL Dialect Rules (PostgreSQL ONLY) — CRITICAL

If you write or modify any SQL query, follow these rules strictly:

| ❌ Wrong (SQLite) | ✅ Right (PostgreSQL) |
|---|---|
| `WHERE is_active = 1` | `WHERE is_active = TRUE` |
| `WHERE is_admin = 0` | `WHERE is_admin = FALSE` |
| `INSERT ... VALUES (?, ?, ?)` | `INSERT ... VALUES ($1, $2, $3)` |
| `SELECT * FROM x WHERE id = ?` | `SELECT * FROM x WHERE id = $1` |
| `datetime('now', '-7 days')` | `NOW() - INTERVAL '7 days'` |
| `datetime('now', '-30 seconds')` | `NOW() - INTERVAL '30 seconds'` |
| `date('now')` | `CURRENT_DATE` |
| `date(column)` | `DATE(column)` (works in both) |
| `GROUP_CONCAT(expr, sep)` | `STRING_AGG(expr, sep)` |
| `INSERT OR IGNORE INTO ...` | `INSERT INTO ... ON CONFLICT (key) DO NOTHING` |
| `ALTER TABLE x ADD COLUMN y` | `ALTER TABLE x ADD COLUMN IF NOT EXISTS y` |
| Runtime-variable interval: `datetime('now', ?)` | `NOW() - make_interval(secs => $1)` |

For dynamic query builders (building `SET` clauses at runtime), use `strconv.Itoa(n)` to generate `$1, $2, ...` placeholders. See `internal/admin/handlers.go` `HandleAdminUpdateMenuItem` for the pattern.

---

## 9. The 4 Core Algorithms

### Algorithm 1 — Dispatch (when restaurant accepts order)
```
INPUT: order_id
1. Get order.restaurant_id → restaurant.zone_id
2. maxR = settings.dispatch_radius_m (default 5000m)
3. Find eligible drivers:
   - is_online = TRUE AND is_active = TRUE AND is_verified = TRUE
   - tier_id IS NOT NULL
   - location_updated_at > NOW() - INTERVAL '30 seconds'
   - not currently assigned to another active order
4. For each candidate, compute score:
   distance_score = 1 - (distance_m / maxR)         -- closer = higher
   tier_score     = tier.sort_order / max_sort      -- gold = 1.0
   response_score = 1 - (avg_response_sec / 60)     -- faster = higher
   shift_score    = 1.0 if in shift, else 0.5
   total = distance×0.50 + tier×0.30 + response×0.10 + shift×0.10
5. Sort by score DESC, take top 5
6. Create dispatch_offers (status='pending', expires_at = NOW() + 15 seconds)
7. If any of them has auto_accept = TRUE → accept immediately
```

### Algorithm 2 — Pricing
```
Customer fee (at checkout):
  zone_id = restaurant.zone_id
  Use silver-tier pricing for that zone as default
  fee = base_fee + (distance_m/1000) × per_km_fee
  Apply min_fee / max_fee / free_above

Driver fee (at acceptance):
  tier_id = driver.tier_id
  zone_id = restaurant.zone_id
  fee = base_fee + (delivery_distance_m/1000) × per_km_fee
  Apply min_fee / max_fee

Platform margin = customer_fee - driver_fee (stored in orders.platform_margin)
```

### Algorithm 3 — Geofence
```
Pickup (driver confirms picked-up from restaurant):
  distance = haversine(driver, restaurant)
  if distance > 70m → REJECT with "اقترب من المطعم بمسافة X متر (مطلوب أقل من 70 متر)"

Delivery (driver confirms delivered to customer):
  distance = haversine(driver, customer)
  if distance > 50m → REJECT with "اقترب من العميل بمسافة X متر (مطلوب أقل من 50 متر)"
```

### Algorithm 4 — Tier Evaluation
See section 7 above.

### Haversine (distance in meters)
```go
func HaversineM(lat1, lng1, lat2, lng2 float64) float64 {
    const R = 6371000.0
    rlat1 := lat1 * math.Pi / 180
    rlat2 := lat2 * math.Pi / 180
    dlat := (lat2 - lat1) * math.Pi / 180
    dlng := (lng2 - lng1) * math.Pi / 180
    a := 0.5 - 0.5*math.Cos(dlat) + math.Cos(rlat1)*math.Cos(rlat2)*(0.5-0.5*math.Cos(dlng))
    return 2 * R * math.Asin(math.Sqrt(a))
}
```

---

## 10. Driver registration flow (admin portal only)

**Drivers CANNOT self-register.** The flow is:

1. **Admin creates application** (via admin panel) with: name, phone, national_id, license_number, vehicle_type, vehicle_plate, address, emergency_phone
2. **Admin reviews** the application
3. **Admin verifies** → system creates `drivers` row with:
   - `is_verified = TRUE`
   - `tier_id = starter`
   - `password = national_id` (initial)
   - `must_change_password = TRUE`
4. **Driver logs in** → must change password → can go online → receives offers

The driver app has **login only** — no register page.

---

## 11. The 5 Next.js apps (shared design)

All 5 apps share:
- **Same design system**: pure white + black + gray (Microsoft Fluent)
- **Cairo font**, RTL Arabic
- **Tailwind CSS 4** with custom `--background`, `--foreground`, `--primary` (black), `--secondary` (gray)
- **shadcn/ui** components
- **Zustand** for state
- **Framer Motion** for animations
- **Proxy route** at `src/app/api/[...path]/route.ts` that forwards to `BACKEND_URL || http://localhost:8080`
- **API client** at `src/lib/api.ts`

### App-specific notes

**Customer** (`apps/customer/`): Has the most components — HomeRestaurants, RestaurantPage, MenuCard, CartDrawer, CheckoutDialog, AuthDialog, MyOrders, AccountPage, OrderTracking, BottomTabBar.

**Driver** (`apps/driver/`): Has OfferModal (15s SVG countdown), ActiveDelivery (4-step progress), TierBadge, polling every 3s for offers + 5s for GPS + 5s for active order.

**Admin** (`apps/admin/`): Sidebar layout with 10 pages — Dashboard, Orders, Restaurants, Zones, Tiers, Tier Prices (matrix), Drivers, Applications, Support, Settings.

**Support** (`apps/support/`): Sidebar with Inbox, Ticket Detail (chat + internal notes), Search (customers/drivers/orders), Order Detail, Driver Detail.

**Merchant** (`apps/merchant/`): Sidebar with Dashboard (pause/resume), Orders KDS (cards with status), Menu CRUD, Store Hours (7 days).

---

## 12. API Endpoints (95+ total)

- **Customer**: 13 (auth, menu, restaurants, orders, addresses, cards, coupons)
- **Driver**: 21 (auth, offers, delivery, earnings, support tickets)
- **Merchant**: 14 (auth, orders KDS, menu CRUD, store hours, stats)
- **Support**: 12 (agent auth, tickets, search, order/driver lookup)
- **Admin**: 35+ (dashboard, zones, tiers, prices, drivers, applications, restaurants, settings, support)

Full list in `backend/internal/*/routes.go` (one file per app).

### Demo accounts (after seed)

| App | Phone | Password |
|---|---|---|
| Admin | 01000000000 | admin123 |
| Driver | 01100000001 / 01100000002 | 123456 |
| Merchant | 01200000001 to 01200000005 | 123456 |
| Support | 01500000001 / 01500000002 | 123456 |
| Customer | any Egyptian number | (register yourself) |

---

## 13. Build & fix instructions per Replit

### If this is the **Backend Replit**

To build and run:
```bash
cd backend
go build -o avex-api ./cmd/server
./avex-api
```

Common fixes:
- **`DATABASE_URL not set`** → add it as a Replit Secret
- **`go: command not found`** → ensure `replit.nix` has `pkgs.go`
- **Build error from SQL syntax** → check section 8 (PostgreSQL dialect rules)
- **`undefined: dispatch`** → import `"avex-backend/internal/dispatch"`
- **Driver not receiving offers** → check `location_updated_at` is fresh (< 30s) and `is_online = TRUE`

When adding new endpoints:
1. Add handler function in the appropriate `internal/<app>/handlers.go`
2. Register the route in `internal/<app>/routes.go`
3. Use `shared.DB`, `shared.WriteJSON`, `shared.WriteErr`, `shared.GetUser(r)` etc.
4. Use `$1, $2, ...` placeholders (NEVER `?`)
5. Use `TRUE/FALSE` for booleans (NEVER `1/0`)

### If this is a **Next.js App Replit** (customer/driver/admin/support/merchant)

To build and run:
```bash
cd apps/<app-name>
bun install   # or npm install
npx next build
npx next start -p <port>
```

Common fixes:
- **App can't reach backend** → ensure `BACKEND_URL` Secret is set to the Backend Replit URL
- **`Cannot find module`** → run `bun install` (or `npm install`)
- **Build fails on `useSearchParams`** → wrap the component in `<Suspense>`
- **Sonner `next-themes` error** → the sonner.tsx in each app already removes this dependency; don't re-add it

When adding new pages/components:
1. Only edit files inside `apps/<your-app>/src/`
2. Use the existing `src/lib/api.ts` client
3. Use the existing `src/components/ui/` shadcn components
4. Follow the design system: white bg, black primary, gray secondary. NO colors.
5. Use Cairo font (already configured in `layout.tsx`)
6. RTL Arabic (`dir="rtl"` on root elements)

---

## 14. Deployment order (when setting up fresh)

1. **Create PostgreSQL database** (Neon or Supabase — free)
2. **Deploy Backend Replit first**:
   - Import repo
   - Set `.replit` `run = "bash scripts/replit-backend.sh"`
   - Add Secret `DATABASE_URL`
   - Add Secret `JWT_SECRET`
   - Run → note the Backend URL (e.g. `https://avex-backend.yourname.repl.co`)
3. **Deploy the 5 Next.js Replits** (any order):
   - For each: import repo, set `.replit` `run` to the right `replit-app.sh` command
   - Add Secret `BACKEND_URL` = the Backend Replit URL
   - Run

---

## 15. Gotchas (sharp edges)

1. **Backend dies between bash commands** in some dev environments — use `setsid nohup` pattern (already in scripts).
2. **`?` placeholders silently fail on PostgreSQL** — always use `$1, $2, ...`.
3. **Boolean `1/0` fails on PostgreSQL** — use `TRUE/FALSE`.
4. **`location_updated_at` staleness** — drivers considered offline if GPS not updated within 30 seconds.
5. **Dispatch scoring weights**: `distance×0.50 + tier×0.30 + response×0.10 + shift×0.10`. Don't change without user approval.
6. **Geofence**: 70m pickup, 50m delivery — enforced in backend, not frontend.
7. **Restaurant auto-accept is mandatory** — orders go straight to dispatch when placed.
8. **Drivers cannot cancel** — only via support ticket with convincing reason.
9. **`replit.md` is the agent's source of truth** — never replace it with a template.
10. **All 6 Replits share the same repo** — deleting files in one affects all.

---

## 16. Pointers (source-of-truth files)

| What | Where |
|---|---|
| DB schema | `backend/internal/shared/db.go` → `createSchema()` |
| Seed data | `backend/internal/shared/seed.go` |
| API routes | `backend/internal/*/routes.go` |
| Algorithms | `backend/internal/dispatch/` (dispatch.go, pricing.go, tier.go) |
| Full architecture doc | `PROJECT_PLAN.md` |
| Deployment guide | `REPLIT.md` |
| Frontend API clients | `apps/<app>/src/lib/api.ts` |
| Design system (CSS) | `apps/<app>/src/app/globals.css` |
| Replit config | `.replit` |
| Nix packages | `replit.nix` |

---

## 17. If you're unsure — STOP and ask

Do not guess. Do not delete files. Do not restructure. Do not replace this file.

If something is unclear, ask the user:
- "Which part should this Replit run?"
- "Should I modify the backend or just the frontend?"
- "Is `DATABASE_URL` set as a Secret?"
- "What is the Backend Replit URL for `BACKEND_URL`?"

**Better to ask than to break the platform.**
