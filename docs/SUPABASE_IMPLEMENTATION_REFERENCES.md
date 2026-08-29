# Supabase Implementation References

CampusWear’s production browser integration uses one `@supabase/supabase-js` client initialized with the project URL and publishable key. The client should persist and refresh sessions, and the Data API must only be exposed after RLS policies and least-privilege grants are in place.

For email registration, CampusWear will call `auth.signUp` with an approved `emailRedirectTo`; Supabase requires that redirect URL to be configured in the project’s Auth URL settings. Email-and-password sign-in uses `auth.signInWithPassword`; recovery uses `auth.resetPasswordForEmail` and the authenticated reset screen uses `auth.updateUser`.

> “Before granting public (`anon`/`authenticated`) access, always enable RLS too.” — Supabase security guidance.

## Sources

1. [Supabase JavaScript client initialization and Data API access](https://supabase.com/docs/reference/javascript/initializing)
2. [Supabase password authentication, signup, sign-in, and recovery](https://supabase.com/docs/guides/auth/passwords)
3. [Supabase Auth with React quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)

