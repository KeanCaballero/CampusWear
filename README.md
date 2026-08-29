# CampusWear

CampusWear is a school-uniform and campus-merchandise MVP built around **“Know Before You Go.”** Students can check size-level availability before travelling to an authorized vendor. Vendor staff manage product variants, stock, orders, announcements, and reports; school administrators oversee vendors and school activity.

## Repository layout

| Path | Purpose |
|---|---|
| `client/` | React, Vite, Tailwind, and shadcn/ui interface. |
| `server/` | Express and tRPC API, authorization, ordering, and storage logic. |
| `api/trpc/` | Vercel serverless tRPC entry point. |
| `drizzle/` | Current application schema and migration history. |
| `supabase/` | PostgreSQL schema, RLS, Storage policies, atomic checkout function, and RLS test blueprint. |
| `docs/DEPLOYMENT.md` | Supabase and Vercel production handoff details. |

## Local verification

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

## Vercel deployment

Vercel uses `vercel.json` to build the Vite client into `dist/public` and serves browser routes through `index.html`. The `api/trpc/[...trpc].ts` entry point exposes the tRPC server as a Vercel function.

Set the required server environment variables in Vercel before expecting authenticated API, database, OAuth, or storage workflows to work. At minimum, the current server runtime needs `DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `BUILT_IN_FORGE_API_URL`, and `BUILT_IN_FORGE_API_KEY`.

For a production Supabase deployment, create a dedicated Supabase project and apply `supabase/migrations/20260824190000_campuswear_mvp.sql`. That migration provides the normalized PostgreSQL schema, Row Level Security policies, Storage policy, and atomic checkout function. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the complete handoff.

