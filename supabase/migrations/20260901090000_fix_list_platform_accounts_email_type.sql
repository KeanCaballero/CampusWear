-- Repair public.list_platform_accounts, which has never returned a row in production.
--
-- SYMPTOM: /platform/accounts renders "Accounts are unavailable" for every platform administrator,
-- on every search, always. This is not a regression. The directory has never once loaded.
--
-- CAUSE: auth.users.email is character varying(255); the function declares `email text`. RETURN
-- QUERY rejects the pair:
--
--   ERROR:  42804: structure of query does not match function result type
--   DETAIL:  Returned type character varying(255) does not match expected type text in column 2.
--   CONTEXT: PL/pgSQL function list_platform_accounts(text) line 8 at RETURN QUERY
--
-- Reproduced against this project by calling the function as the bootstrap administrator inside a
-- rolled-back transaction. PostgREST surfaces the exception as a failed request, and the client
-- turns that into its generic error panel — which is why a hard type error reads on screen as a
-- transient loading problem, and why it was never chased down.
--
-- WHY IT SURVIVED THIS LONG — worth recording, because two earlier migrations already knew:
--
--   20260828050000_fix_platform_rpc_email_type.sql adds `u.email::text` to BOTH platform RPCs.
--   It sits in this repository and was NEVER APPLIED to the live project; it is absent from the
--   migration ledger. So the fix has existed in Git for days while production ran without it.
--
--   20260830120000_fix_platform_team_members_email_type.sql then repaired the sibling function
--   alone. Its header states that "list_platform_accounts already carries the ::text cast" — true
--   of the repository file, false of the database, because of the unapplied migration above. That
--   is precisely the gap this migration closes.
--
-- One claim in that same header is simply wrong and should not be trusted by whoever reads it
-- next: it argues that because varchar -> text is binary coercible, 42804 cannot be raised, and
-- that the cast is therefore cosmetic rather than "a repair of an observed runtime failure". The
-- error above is an observed runtime failure. RETURN QUERY compares the query's row type against
-- the declared result type by exact type identity; binary coercibility does not exempt it. Treat
-- these casts as load-bearing, not decorative.
--
-- FIX: add the cast, exactly as the working sibling does. Nothing else about the function changes.
--
-- SECURITY: unchanged, and restated verbatim rather than edited. Still SECURITY DEFINER with a
-- pinned search_path; still raises 42501 for anyone who is not a platform administrator before a
-- single row is read; still capped at 100 rows. No grant, policy, role or row is touched — the
-- EXECUTE grant `authenticated` already holds is what lets the in-function admin check be the
-- thing that decides access, and it is deliberately left alone.

create or replace function public.list_platform_accounts(p_search text default null)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role public.app_role,
  email_confirmed boolean,
  is_bootstrap_owner boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  normalized_search text := nullif(lower(btrim(p_search)), '');
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access is required.' using errcode = '42501';
  end if;

  return query
  select
    p.user_id,
    u.email::text,
    p.full_name,
    p.role,
    u.email_confirmed_at is not null,
    p.user_id = (select claimed_by from private.bootstrap_admin_state where singleton = true),
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where normalized_search is null
    or lower(u.email) like '%' || normalized_search || '%'
    or lower(coalesce(p.full_name, '')) like '%' || normalized_search || '%'
  order by p.created_at desc
  limit 100;
end;
$$;
