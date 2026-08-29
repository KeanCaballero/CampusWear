# CampusWear Production Handoff

This repository is ready to be pushed to GitHub and built by Vercel. CampusWear now uses the browser-safe Supabase client for production catalog, cart, checkout, student account, vendor, and school-administration workflows. The complete database migration, Storage policy, RLS policy set, and database-policy test blueprint are under `supabase/`.

## Current release status

| Area | Status | What this means |
|---|---|---|
| Production client data path | Verified | Public catalog, cart, checkout, student orders, notifications, announcements, vendor operations, reporting, and school administration use Supabase table operations or controlled RPCs. |
| Vercel build handoff | Prepared | `vercel.json` builds the Vite client to `dist/public` and retains the legacy API function only for non-production fallback compatibility. |
| Supabase schema and RLS | Live | The dedicated project `iwexgirpqomquorkikzs` has the CampusWear PostgreSQL schema, profile trigger, RLS policies, Storage bucket policy, atomic checkout, fulfillment transition, catalog projection, and performance indexes. |
| Live public-route validation | Verified | The mobile catalog and announcements views return truthful empty states with no demo records. `pnpm verify:supabase-production` passes. |
| Final role acceptance | Client action required | Create real school, vendor, and assigned student/vendor/admin accounts, then perform the real image-upload and cross-role acceptance pass without seed data. |

## Supabase setup

The dedicated CampusWear project is `iwexgirpqomquorkikzs`. Any future environment must apply every repository migration in chronological order before traffic is enabled:

```bash
supabase login
supabase link --project-ref <campuswear-project-ref>
supabase db push
supabase test db
```

Apply every SQL file in `supabase/migrations/`, including the controlled order-transition, public availability-label, inventory-create, function-hardening, performance, and public-policy split migrations. The complete migration set creates the school, profile, vendor, product, variant, inventory, cart, order, announcement, and notification structures. It also provisions a profile for each new Auth user, restricts raw inventory rows to vendor staff, exposes atomic checkout through `create_order_from_cart`, and exposes catalog availability without raw stock counts.

After configuring `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, run the repository’s non-destructive readiness check:

```bash
pnpm verify:supabase-production
```

The check must report all CampusWear tables and the `create_order_from_cart`, `transition_order_status`, and `get_public_catalog` RPC endpoints as reachable. A missing-table or missing-RPC report means the configured project has not received the migrations; do not enable live catalog, cart, fulfillment, notification, or product-image traffic until it passes.

> Do **not** set a Supabase Postgres connection string as `DATABASE_URL` in the legacy server. `server/db.ts` remains a MySQL/Drizzle local-development adapter. The production Vercel client does not depend on it: production data operations use `@supabase/supabase-js` and RLS-protected tables/RPCs directly.

## Vercel setup after Git push

Import the repository in Vercel with the repository root as the **Root Directory**. Use the included settings rather than treating the source folder as a static upload:

| Setting | Value |
|---|---|
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm run build:client` |
| Output directory | `dist/public` |
| API function | Optional legacy compatibility path; it is not used by the Supabase production client workflows. |

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel. Never expose `JWT_SECRET`, `BUILT_IN_FORGE_API_KEY`, or a Supabase service-role key to browser code. Values beginning with `VITE_` are bundled into the client and must be safe for public exposure.

## Required release actions

Configure Supabase Auth with the deployed site URL and redirect URLs for `/auth` and `/auth/reset`, enable email confirmation and **leaked-password protection**, and assign the first real platform/school administrator through secure Supabase administration. That administrator should create the first real school and authorized vendor, then assign real vendor staff and student accounts. Do not use the development seed script or insert synthetic reviews, sales, products, or orders in the production project.

Before publishing, upload a real vendor-owned product photo to verify the `product-images` bucket policy, and perform one real multi-role acceptance pass: student checkout, vendor fulfillment transition, notification receipt, school vendor authorization, denied cross-user access, and denied cross-vendor inventory access. Full live validation evidence and the remaining intentional security-advisor warnings are recorded in [`SUPABASE_LIVE_VALIDATION.md`](./SUPABASE_LIVE_VALIDATION.md).
