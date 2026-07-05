# AVEX — Replit Agent Instructions

> ⚠️ **CRITICAL: Read this entire file before doing anything.**
> This is a **monorepo with 6 separate deployable parts**. You are running ONE of them.
> **NEVER delete, modify, or move files outside your assigned part.**

## What is AVEX?

AVEX is a food delivery platform with:
- **1 Go backend** (PostgreSQL only)
- **5 Next.js apps** (customer, driver, admin, support, merchant)

Each Replit runs **ONE part only**. The part is determined by the `run` line in `.replit`.

## The 6 parts (DO NOT mix them)

| Part | Folder | Port | Run script |
|---|---|---|---|
| Backend | `backend/` | 8080 | `bash scripts/replit-backend.sh` |
| Customer | `apps/customer/` | 3000 | `bash scripts/replit-app.sh customer 3000` |
| Driver | `apps/driver/` | 3001 | `bash scripts/replit-app.sh driver 3001` |
| Admin | `apps/admin/` | 3002 | `bash scripts/replit-app.sh admin 3002` |
| Support | `apps/support/` | 3003 | `bash scripts/replit-app.sh support 3003` |
| Merchant | `apps/merchant/` | 3004 | `bash scripts/replit-app.sh merchant 3004` |

## How to know which part THIS Replit runs

Check the `run = "..."` line in `.replit`:
- If it says `scripts/replit-backend.sh` → this is the **Backend** Replit
- If it says `scripts/replit-app.sh customer 3000` → this is the **Customer** Replit
- If it says `scripts/replit-app.sh driver 3001` → this is the **Driver** Replit
- And so on.

## 🚫 STRICT RULES — violations will break the platform

### DO NOT:
1. **NEVER delete files in `apps/`** — every folder there is a different app deployed on a separate Replit. Deleting `apps/driver/` from this Replit deletes it for everyone.
2. **NEVER delete `backend/`** — it's the API for the whole platform.
3. **NEVER delete `scripts/`** — they're used by all Replits.
4. **NEVER delete `PROJECT_PLAN.md`, `README.md`, `REPLIT.md`, `replit.nix`, `.replit`, `.gitignore`**.
5. **NEVER restructure the repo** — the folder layout is intentional and shared.
6. **NEVER change database drivers** — backend uses PostgreSQL only (no SQLite).
7. **NEVER replace `replit.md`** with a template — this file IS the source of truth.
8. **NEVER run `git push --force`** or rewrite git history.
9. **NEVER install packages in the wrong app** — if this is the Customer Replit, only touch `apps/customer/package.json`.

### DO:
1. Only edit files inside your assigned part's folder.
2. If this is the Backend Replit → only edit `backend/`.
3. If this is a Next.js app Replit → only edit `apps/<your-app>/`.
4. Use the existing run scripts in `scripts/`.
5. Read `PROJECT_PLAN.md` for the full architecture before making changes.
6. Read `REPLIT.md` for deployment details.
7. Ask the user before making structural changes.

## Run & Operate

### Backend Replit (port 8080)
```bash
bash scripts/replit-backend.sh
```
- Builds `backend/cmd/server/main.go` → `backend/avex-api`
- Requires `DATABASE_URL` env var (PostgreSQL connection string)
- Auto-creates schema + seeds data on first run

### Next.js App Replits (ports 3000-3004)
```bash
bash scripts/replit-app.sh <app-name> <port>
# Example: bash scripts/replit-app.sh customer 3000
```
- Installs deps with bun (or npm fallback)
- Builds with `npx next build`
- Starts with `npx next start -p <port>`
- Requires `BACKEND_URL` env var (URL of the Backend Replit)

## Required Environment Variables (Secrets)

### Backend Replit
- `DATABASE_URL` — PostgreSQL connection string (REQUIRED)
  - Example: `postgres://user:pass@host:5432/avex?sslmode=require`
  - Free providers: Neon (neon.tech), Supabase (supabase.com)
- `JWT_SECRET` — any random string (optional, has default)
- `PORT` — defaults to 8080

### Next.js App Replits
- `BACKEND_URL` — URL of the Backend Replit (REQUIRED)
  - Example: `https://avex-backend.yourname.repl.co`

## Stack

- **Backend**: Go 1.23, pgx/v5 (PostgreSQL driver), JWT auth, net/http
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Framer Motion
- **Database**: PostgreSQL ONLY (no SQLite)
- **Design**: Microsoft Fluent — pure white + black + gray, NO colors

## Repository Structure (DO NOT MODIFY)

```
avex/
├── backend/                    ← Go backend (PostgreSQL only)
│   ├── cmd/server/main.go     ← Entry point
│   └── internal/
│       ├── shared/             ← DB, JWT, middlewares, helpers
│       ├── dispatch/           ← Algorithms (dispatch, pricing, tier)
│       ├── customer/           ← 13 routes
│       ├── driver/             ← 21 routes
│       ├── merchant/           ← 14 routes
│       ├── support/            ← 12 routes
│       └── admin/              ← 35+ routes
├── apps/
│   ├── customer/               ← Next.js (port 3000)
│   ├── driver/                 ← Next.js (port 3001)
│   ├── admin/                  ← Next.js (port 3002)
│   ├── support/                ← Next.js (port 3003)
│   └── merchant/               ← Next.js (port 3004)
├── scripts/
│   ├── replit-backend.sh       ← Backend starter
│   ├── replit-app.sh           ← Any Next.js app starter
│   └── start-all.sh            ← Local dev (all 6 at once)
├── .replit                     ← Replit config (determines which part runs)
├── replit.nix                  ← Nix packages (go, nodejs_20, bun, postgresql, git)
├── replit.md                   ← THIS FILE (Agent instructions)
├── REPLIT.md                   ← Detailed deployment guide
├── PROJECT_PLAN.md             ← Full architecture documentation
└── README.md                   ← Project overview
```

## Architecture decisions

1. **Modular Go backend** — single binary serves all 5 apps via one mux. Each app has its own `routes.go` that registers its endpoints.
2. **PostgreSQL ONLY** — no SQLite support, no dialect switching. Uses `$1, $2, ...` placeholders (not `?`).
3. **6 Replits, 1 repo** — each Replit imports the full repo but runs only one part via `.replit` config.
4. **Tier × Zone pricing matrix** — driver fees are configurable per (tier, zone) cell from the admin panel.
5. **No self-registration for drivers** — drivers apply via admin portal, admin verifies, system creates the account.
6. **Restaurant auto-accept** — orders go straight to dispatch when placed (no manual restaurant approval step).

## Product

AVEX is a food delivery platform with 5 user-facing apps:
- **Customer**: browse restaurants, place orders, track deliveries
- **Driver**: receive order offers, accept/reject, pick up from restaurant (70m geofence), deliver to customer (50m geofence), earn tiered fees
- **Merchant**: manage menu, accept/prepare/ready orders, set store hours, pause/resume
- **Support**: ticketing system with internal notes, search customers/drivers/orders, cancel orders for special cases
- **Admin**: manage zones, tiers, pricing matrix, drivers, restaurants, support tickets, system settings

## User preferences

- Design must stay **pure white + black + gray** (Microsoft Fluent style). No colors.
- Arabic UI (RTL). Cairo font.
- Backend must use **PostgreSQL only** — never SQLite.
- Drivers cannot self-register — admin portal only.
- Drivers cannot cancel orders after acceptance — support ticket with convincing reason required.
- Restaurant acceptance is mandatory (auto-accept, no manual approval).

## Gotchas

- **Backend dies between bash commands in some dev environments** — use `setsid nohup` pattern (already in scripts).
- **`?` placeholders do NOT work in PostgreSQL** — all queries use `$1, $2, ...`. If you add new queries, use the numbered format.
- **Boolean columns use `TRUE/FALSE`** — not `1/0`. This is PostgreSQL-only.
- **Date arithmetic**: use `NOW() - INTERVAL '7 days'` (not `datetime('now', '-7 days')`).
- **String aggregation**: use `STRING_AGG(expr, sep)` (not `GROUP_CONCAT`).
- **`location_updated_at` staleness**: drivers are considered offline if GPS not updated within 30 seconds.
- **Dispatch scoring**: `distance×0.5 + tier×0.3 + response×0.1 + shift×0.1`.
- **Geofence**: 70m for pickup, 50m for delivery — enforced in backend, not frontend.

## Pointers

- **DB schema source of truth**: `backend/internal/shared/db.go` (`createSchema` function)
- **Seed data source of truth**: `backend/internal/shared/seed.go`
- **API routes source of truth**: `backend/internal/*/routes.go` (one per app)
- **Algorithms source of truth**: `backend/internal/dispatch/` (dispatch.go, pricing.go, tier.go)
- **Full architecture doc**: `PROJECT_PLAN.md`
- **Deployment guide**: `REPLIT.md`
- **Frontend API clients**: `apps/<app>/src/lib/api.ts` (one per app)

## Demo accounts (after seed)

| App | Phone | Password |
|---|---|---|
| Admin | 01000000000 | admin123 |
| Driver | 01100000001 / 01100000002 | 123456 |
| Merchant | 01200000001 to 01200000005 | 123456 |
| Support | 01500000001 / 01500000002 | 123456 |
| Customer | any Egyptian number | (register yourself) |

## If you're unsure about something

**STOP and ask the user.** Do not guess. Do not delete files. Do not restructure.
