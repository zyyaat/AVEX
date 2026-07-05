---
Task ID: AVEX-DRIVER-FULL
Agent: Super Z (main)
Task: Build complete AVEX driver app with tier system, zones, dispatch, pricing matrix, support tickets — same design as customer app

Work Log:
- Researched global delivery driver tier systems (Uber Pro, DoorDash Dasher Rewards, Grubhub, Deliveroo, Careem/Talabat)
- Designed 4-tier system: starter → bronze → silver → gold with admin-managed thresholds
- Designed zone-based pricing matrix (tier × zone) controllable from admin panel
- Designed driver application flow: admin creates application → verifies → driver account created (no self-registration)
- Extended backend/main.go (Go single file):
  - Added 12 new tables: delivery_zones, driver_tiers, tier_thresholds, tier_zone_prices, driver_applications, drivers, driver_stats, driver_shifts, driver_tier_history, dispatch_offers, support_tickets, support_messages
  - Added migrations to restaurants (lat, lng, zone_id) and orders (driver_id, zone_id, distances, driver_fee, platform_margin)
  - Added seed: 4 zones (Cairo), 4 tiers + thresholds, 16-cell pricing matrix, 5 restaurants geo-located + zoned, 2 demo drivers
  - Added helpers: haversineM, getSetting, getSettingInt, findZoneByLatLng, computeDriverFee, evaluateDriverTier, dispatchOrder, acceptOfferInternal
  - Added HandleCreateOrder change: status='accepted' (mandatory restaurant auto-accept) + go dispatchOrder()
  - Added 30+ driver/admin handlers covering auth, online toggle, location, offers, accept/reject, picked-up (70m geofence), arrived, delivered (50m geofence), earnings, history, support tickets+messages, admin zones/tiers/thresholds/tier-prices CRUD, driver applications verify/reject, drivers list/status/tier, shifts, support resolution + cancel-order
  - Added DriverAuthMW middleware (separate from customer AuthMW)
  - Added GenerateDriverJWT with IsDriver + DriverID claims
- Built apps/driver Next.js app (port 3001) — same Fluent design as customer (pure white/black/gray):
  - src/lib/api.ts: typed API client + Driver/Offer/ActiveOrder/Shift/Ticket interfaces
  - src/store/auth.ts: zustand+persist auth store
  - src/store/driver.ts: zustand driver state with polling helpers
  - src/app/login/page.tsx: login only (no register, per admin-portal rule)
  - src/app/page.tsx: home with online toggle, tier badge, 4-stat bar, offers polling (3s), GPS watchPosition (5s), active order polling (5s), next-tier progress card
  - src/components/OfferModal.tsx: bottom-sheet modal with 15s SVG circular countdown, restaurant/zone/items/customer/earnings display, accept/reject buttons
  - src/components/ActiveDelivery.tsx: 4-step progress indicator, restaurant card, items list, customer card with tel: link, geofence hint, status-aware action button (picked-up → arrived → delivered)
  - src/components/BottomTabBar.tsx: 5 tabs (Home/History/Earnings/Support/Profile) with active state
  - src/components/TierBadge.tsx: tier badge with color from DB
  - src/app/earnings/page.tsx: today/week/month tabs + lifetime stats + recent orders
  - src/app/history/page.tsx: paginated order history with status badges
  - src/app/profile/page.tsx: profile header, stats, auto-accept toggle, change password, logout (wrapped in Suspense for useSearchParams)
  - src/app/support/page.tsx: tickets list + create modal (cancellation_request/complaint/other)
  - src/app/support/[id]/page.tsx: chat interface with auto-refresh polling
- Fixed: sonner.tsx removed next-themes dependency (not installed)
- Verified: Go backend builds clean, Next.js builds clean (8 static + 2 dynamic routes), proxy routes work end-to-end
- Verified E2E flow: customer creates order → status='accepted' → dispatch triggers → driver offer created with expires_at + driverFee preview → driver accepts → order.driver_id set + status='assigned' + driver_fee + platform_margin computed → active-order returns full details

Stage Summary:
- Backend (Go, single main.go, ~2050 lines): all 4 algorithms implemented — tier evaluation, dispatch with tier-weighted scoring, pricing (tier×zone), geofence (70m pickup / 50m delivery)
- Driver app (Next.js 16, port 3001): complete UI matching customer design (B&W Fluent), 8 routes, real-time polling, GPS tracking, offer modal with countdown, active delivery flow with geofence checks, support system for special cancellations
- Demo accounts: 01100000001 / 01100000002 (password: 123456)
- Admin APIs ready for future admin portal: zones CRUD, tiers CRUD + thresholds, tier-prices matrix CRUD, driver applications verify/reject, drivers list + tier override, shifts scheduling, support tickets resolve + cancel-order
- Next steps: build apps/admin Next.js portal for managing zones/tiers/prices/drivers/applications/support
- Files: /home/z/my-project/backend/main.go, /home/z/my-project/apps/driver/src/**, /home/z/my-project/scripts/start-driver.sh
