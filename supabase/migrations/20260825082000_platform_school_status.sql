-- Platform administrators can pause or restore an existing school. The function deliberately
-- does not create schools, alter school identity, or assign users to privileged roles.
create or replace function public.set_platform_school_active(p_school_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'platform_admin'
  ) then
    raise exception 'Platform administrator access is required.' using errcode = '42501';
  end if;

  update public.schools
  set is_active = p_is_active, updated_at = now()
  where id = p_school_id;

  if not found then
    raise exception 'School not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_platform_school_active(uuid, boolean) from public, anon;
grant execute on function public.set_platform_school_active(uuid, boolean) to authenticated;
