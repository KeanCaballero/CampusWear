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
    u.email,
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

revoke all on function public.list_platform_accounts(text) from public, anon;
grant execute on function public.list_platform_accounts(text) to authenticated;
