# CampusWear Live Supabase Validation

The dedicated CampusWear project `iwexgirpqomquorkikzs` was verified as the configured browser endpoint and migrated without inserting any school, vendor, product, order, or review data. The live public catalog and announcements routes return truthful empty states until authorized teams create real records.

| Validation area | Live result |
|---|---|
| Schema and RPC reachability | `pnpm verify:supabase-production` passed after the core schema, catalog, checkout, and fulfillment migrations were applied. |
| Anonymous access | The public catalog RPC is intentionally available only as an availability-label projection. Anonymous order and raw-inventory table reads are denied. |
| State-changing RPCs | Anonymous execution is denied for checkout and vendor order transitions. Authenticated execution remains available and is guarded inside each function by `auth.uid()` and role checks. |
| Responsive public UI | Mobile `/shop` and `/announcements` render live empty states with no placeholder products or announcements. |
| Security advisor | Remaining function warnings are intentional for the public availability projection and authenticated atomic checkout/fulfillment functions. The functions use pinned search paths and explicit privilege grants. |
| External dashboard setting | Supabase leaked-password protection remains disabled and should be enabled by the project owner before public launch. |

> The public availability function is intentionally `SECURITY DEFINER`: students can see **In Stock**, **Low Stock**, or **Out of Stock** without receiving raw inventory quantities. The function uses a schema-pinned body and has no write operations.

## Supabase references

The following official references informed the live verification and follow-up settings:

1. [Database Functions](https://supabase.com/docs/guides/database/functions)
2. [Monitoring and Debugging](https://supabase.com/docs/guides/monitoring-and-debugging.md)
3. [Password Security and Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
4. [Security Definer Function Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
