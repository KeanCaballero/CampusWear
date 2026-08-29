# CampusWear Production Data-Source Investigation

## Scope and safety

This investigation is read-only. No production record, database schema, RLS/Auth/SMTP/security setting, deployment variable, or repository content was modified during the source trace. Secret values were not revealed or printed.

## Initial evidence

The Vercel CampusWear project is connected to GitHub `KeanCaballero/CampusWear`, deploys from the `main` branch, and the current Vercel overview showed a Ready production deployment from a recent `main` commit. The Vercel Environment Variables page visibly listed only the public browser variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; values were kept hidden. No `DATABASE_URL` value was exposed through the Vercel UI inspection.

The repository’s `vercel.json` uses `pnpm install --frozen-lockfile`, `pnpm run build:client`, and `dist/public`. The production client is therefore a static Vite build; its browser data path must be determined from the compiled source and client adapters.

Repository inspection found that `server/routers.ts` routes catalog, vendor products, inventory, and image operations through `server/campuswear/repository.ts`. That repository imports Drizzle’s MySQL schema and calls `getDb()` from `server/db.ts`, which creates a `drizzle-orm/mysql2` connection from `process.env.DATABASE_URL`. The repository’s product catalog queries the MySQL tables `products`, `productVariants`, `inventory`, `vendors`, and `schools`.

The repository also contains a Supabase browser client used by the authentication/profile layer, and tests validate the presence of the two public Supabase browser variables. This establishes that the source contains both Supabase browser integration and a legacy/server MySQL data path; it does not yet prove which path the current Vercel catalog uses.

## Current reconciliation status

The selected CampusWear Supabase project returned zero rows for the temporary QA product and for a bounded `public.products` sample. The sandbox’s own `DATABASE_URL` also returned no matching product, but it is not evidence about the deployed Vercel database. The live student catalog still displayed the temporary QA product. The next safe step is to inspect the client bundle and the deployed runtime request path or logs for the exact active catalog adapter, without revealing credentials or performing any mutation.


## Decisive live probe result

A temporary read-only Supabase client probe used the configured browser variables and confirmed the host `iwexgirpqomquorkikzs.supabase.co`, matching the authorized CampusWear project. The direct `products` table request returned no rows because the publishable client received `permission denied for function is_vendor_staff`; this is an RLS/function-policy response, not proof that the table is empty. The same client successfully called `get_public_catalog` and received 9 catalog rows, including the QA product with product ID `0006ed56-1fcf-4b09-9df4-566158ccea16` and three variant IDs: `21acfc60-b391-42fe-84b3-e12a0da31b7a` (L), `4a70f4fe-13da-4a3a-ba69-f544e5c36aa3` (M), and `f438a183-bce5-4f54-93d2-55ab30189fe7` (S). This proves that the live Vercel catalog and the authorized CampusWear Supabase project are the same data source; the earlier SQL-editor table lookup was not a valid absence check because the table’s policy/function path prevented the direct read.


## Approved cleanup attempt result

The owner approved deletion of the exact product ID and its directly dependent rows. The authenticated Supabase management tool was invoked against project `iwexgirpqomquorkikzs` with a one-row CTE guard matching the exact UUID and QA name. The operation was rejected by the database as `ERROR 25006: cannot execute DELETE in a read-only transaction`; therefore zero records were deleted. The prior Supabase SQL-editor attempt also reported zero returned rows and did not remove the catalog result. The live `get_public_catalog` RPC must be rechecked after this blocked attempt; no further deletion attempt should be made until a writable, authorized cleanup path is available.


## Delete-policy verification

A read-only policy query confirmed the live policy `vendor staff delete products without orders` exists on `public.products` for `DELETE` and `authenticated`. Its predicate requires `private.is_vendor_staff(vendor_id)` and rejects products with any matching `public.order_items` joined through `public.product_variants`. This preserves vendor ownership and order-history protection. No data was modified by the verification query.
