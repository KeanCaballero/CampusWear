# CampusWear Deployment Guide

## Verified application checks

The repository has a generated and applied development migration, a repeatable fictional development-data seeder, Vitest coverage for role and inventory/order rules, and a successful production build. Run the following commands from the repository root before any release:

```bash
pnpm check
pnpm test
pnpm build
```

Use the development-only catalog dataset only in non-production environments:

```bash
node scripts/seed-demo.mjs
```

The sample school and vendor are explicitly named **CampusWear Demo University** and are not representative of a real institution.

## Current managed runtime

This project is immediately runnable in its managed full-stack environment, which supplies the authenticated database runtime, server process, and secure object-storage helpers. Product images uploaded through the vendor workspace are stored server-side and only their returned URL is saved with the catalog product.

## Dedicated Supabase production handoff

The CampusWear target production schema, RLS policies, secure checkout function, Storage bucket policies, and database-policy test blueprint are located under `supabase/`.

| Asset | Location | Purpose |
|---|---|---|
| Schema and RLS migration | `supabase/migrations/20260824190000_campuswear_mvp.sql` | Creates tables, roles, indexes, RLS, Storage policies, and atomic checkout. |
| RLS test blueprint | `supabase/tests/campuswear_rls.test.sql` | Provides initial pgTAP assertions for grants and checkout execution. |
| Security model | `docs/ROLE_AND_SECURITY_MODEL.md` | Defines student, vendor, school-admin, and platform-admin boundaries. |

Create or assign a **dedicated CampusWear Supabase project** before applying the migration. Do not reuse an unrelated project. Then run the Supabase CLI migration workflow:

```bash
supabase link --project-ref <campuswear-project-ref>
supabase db push
supabase test db
```

After migration, configure Auth redirect URLs for the intended production domain and only expose a Supabase publishable key to browser clients. The `service_role` key must remain server-side. The database migration enables RLS on all exposed `public` tables and uses a dedicated atomic database function for checkout, rather than granting students general inventory-update privileges.

## Environment variables

| Variable | Surface | Required for | Handling |
|---|---|---|---|
| `DATABASE_URL` | Server | Current managed development runtime | Server only. |
| `BUILT_IN_FORGE_API_URL` | Server | Secure product image upload in current runtime | Injected by managed runtime. |
| `BUILT_IN_FORGE_API_KEY` | Server | Secure product image upload in current runtime | Injected by managed runtime; never expose to the browser. |
| `VITE_SUPABASE_URL` | Browser | Direct Supabase frontend integration | Public project URL only. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Supabase Auth/Data API client | Publishable key only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server / trusted jobs | Admin operations, if later required | Never prefix with `VITE_`; do not use in browser code. |

## Vercel readiness and production architecture

CampusWear’s production build succeeds. The current scaffold is an Express/tRPC server plus Vite frontend, so it should be deployed to a Node-compatible server runtime as a single service. Do not add a static-only `vercel.json` rewrite: that would silently break the authenticated tRPC API.

For a Vercel + Supabase deployment, complete one of these safe approaches before publishing:

1. **Supabase-first deployment:** replace the current server procedures with direct `supabase-js` browser calls constrained by the included RLS policies and use the provided `create_order_from_cart` RPC for checkout. Vercel then hosts the Vite frontend as a static site.
2. **Server-managed deployment:** add a Vercel serverless adapter for the existing Express/tRPC application and keep secrets in Vercel server environment variables. This must be tested on a preview deployment before production.

The current task discovered only an unrelated inactive Supabase project, not a confirmed CampusWear environment. Therefore, no destructive database action was taken against that project and no Supabase credentials were embedded in source code. Assigning a dedicated project is the remaining external prerequisite for a true Supabase Auth/Storage production release.

