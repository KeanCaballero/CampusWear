# Supabase Auth and Platform Security

The CampusWear production advisor confirms that the new platform-school and platform-team functions are visible as authenticated RPC endpoints. This is intentional: each function uses `SECURITY DEFINER` only to complete a narrow multi-table operation, sets an explicit search path, revokes anonymous execution, and verifies the caller’s platform-administrator profile inside the database before any change is made.

The remaining externally actionable advisor item is **Leaked Password Protection**, which is currently disabled. Enable it in **Supabase → Authentication → Settings → Password Security** before inviting further group testers. This setting is not a client-side code change and must not be emulated in browser code.

## Group QA delivery

The Supabase default SMTP provider is rate-limited and is not appropriate for a group test. Configure a custom SMTP provider in **Supabase → Authentication → SMTP Settings**, keep email confirmation enabled, and set a deliberate rate limit under **Authentication → Rate Limits**. The CampusWear sign-up screen translates the raw rate-limit error into this action-oriented instruction without weakening verification.

## RPC authorization evidence

| Capability | Anonymous execution | Authenticated execution | Database authorization check |
|---|---:|---:|---|
| Public catalog projection | Allowed | Allowed | Explicitly public, availability-only projection |
| Vendor approval | Denied | Entry point only | Requires `platform_admin` in function body |
| School pause or restore | Denied | Entry point only | Requires `platform_admin` in function body |
| Platform-team grant or revoke | Denied | Entry point only | Requires `platform_admin`, confirmed ordinary target account, and preserves the bootstrap owner |

The Supabase linter will continue to flag authenticated `SECURITY DEFINER` functions at an advisory level. The listed functions remain guarded because RLS alone cannot safely perform the related privileged multi-table changes.

## References

1. [Supabase database functions](https://supabase.com/docs/guides/database/functions.md)
2. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security.md)
3. [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp.md)
