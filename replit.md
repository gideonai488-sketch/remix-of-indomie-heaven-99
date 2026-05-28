# SpeedUp

Global delivery & services platform (a Genesis Holdings Inc, USA product): food ordering + services (Errands, Parcel, Package, Pharmacy) with live GPS tracking, rider matching, and mobile money payments.

## Run & Operate

- `pnpm --filter @workspace/food-ordering run dev` — run the customer app (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind v3 (postcss), react-router-dom
- Backend: Supabase (user's own project — cgadnsuyezixjdrjkbvb)
- Auth: Supabase Auth (built in)
- Realtime: Supabase Realtime channels (for live tracking)
- Payments: Mobile Money (MTN, Vodafone, AirtelTigo) + Cash on Delivery

## Where things live

- `artifacts/food-ordering/src/` — all app source
- `artifacts/food-ordering/src/pages/` — Index, MenuPage, CheckoutPage, ServicesPage, ServiceRequestPage, TrackingPage, AuthPage, ProfilePage
- `artifacts/food-ordering/src/components/` — Header, BottomNav, ServicesStrip, NetflixHero, CartDrawer, etc.
- `artifacts/food-ordering/src/types/services.ts` — ServiceType, ServiceStatus, ServiceRequest, SERVICE_DEFS
- `artifacts/food-ordering/src/integrations/supabase/` — supabase client + types
- `artifacts/food-ordering/supabase/migration.sql` — SQL to run in Supabase dashboard

## Architecture decisions

- No Replit DB / Drizzle — user's Supabase project is the single database
- `service_requests` table (separate from `orders`) stores all non-food delivery requests
- Realtime tracking uses Supabase postgres_changes channel on `service_requests`
- Payment popup is triggered client-side when status changes to `completed` via realtime
- Map animation uses inline SVG + CSS — no Google Maps API needed
- `(supabase as any)` cast used for service_requests until Supabase types are regenerated

## Product

- **Food Ordering**: Netflix-style hero, menu grid, cart, checkout with MoMo / Cash on Delivery
- **Services**: Errands, Parcel, Package, Pharmacy — each with custom form fields
- **Rider matching**: Request → searching animation → rider accepted → live map tracking
- **Tracking**: Animated SVG map with 🏍️ riding from pickup to delivery pin
- **Payment**: Popup modal when rider marks delivery complete (status = 'completed')
- **Admin panel**: `/admin` route (hidden on native/Capacitor) for order management

## User preferences

- Supabase only — do NOT add Replit DB, Drizzle, or any Postgres
- App name: SpeedUp (not Highest Bowls)
- Currency: GH₵ (Ghana Cedis)
- Payment: MTN MoMo, Vodafone Cash, AirtelTigo Money, Cash on Delivery
- Do NOT hallucinate — no guessing, follow explicit instructions

## Gotchas

- **Run SQL migration** before testing services: `artifacts/food-ordering/supabase/migration.sql` in Supabase SQL Editor
- **Enable Realtime** for `service_requests` table in Supabase Dashboard → Database → Replication
- `postcss.config.js` is used for Tailwind v3 (NOT @tailwindcss/vite plugin)
- Capacitor is present but builds are done externally — app targets mobile PWA first
- Admin routes are behind `isNativePlatform()` check (hidden on Capacitor)

## Pointers

- See `pnpm-workspace` skill for workspace structure
- Supabase project: cgadnsuyezixjdrjkbvb
