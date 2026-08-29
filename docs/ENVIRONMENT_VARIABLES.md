# CampusWear Environment Variables

Configure these values in the hosting provider’s secure environment-variable UI. Do not commit keys, connection strings, or `.env` files to GitHub.

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Current Express/tRPC server | Must be a database URL compatible with the current `mysql2` Drizzle server adapter. Do not put a Supabase Postgres URL here without migrating the adapter. |
| `JWT_SECRET` | Current server session support | Server secret; never expose to the browser. |
| `OAUTH_SERVER_URL` | Current authentication flow | Server-side OAuth base URL. |
| `VITE_APP_ID` | Browser OAuth flow | Public app identifier. |
| `VITE_OAUTH_PORTAL_URL` | Browser OAuth flow | Public login portal URL. |
| `BUILT_IN_FORGE_API_URL` | Server storage proxy | Server-side integration endpoint. |
| `BUILT_IN_FORGE_API_KEY` | Server storage proxy | Server secret; never expose to the browser. |
| `VITE_SUPABASE_URL` | Future direct Supabase browser integration | Public project URL, after the Supabase adapter migration. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Future direct Supabase browser integration | Public publishable key only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Future trusted Supabase operations | Server secret only; never prefix with `VITE_`. |

