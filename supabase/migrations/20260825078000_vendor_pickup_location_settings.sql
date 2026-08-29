-- Vendors may control their own published pickup instructions, but not their authorization,
-- school affiliation, or identity fields. Keep the narrower update surface in a guarded RPC.
create or replace function public.update_vendor_pickup_location(p_pickup_location text)
returns void
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  assigned_vendor_id uuid;
  normalized_location text := btrim(coalesce(p_pickup_location, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if char_length(normalized_location) < 3 or char_length(normalized_location) > 240 then
    raise exception 'Pickup location must be between 3 and 240 characters.' using errcode = '22023';
  end if;

  select vendor_id into assigned_vendor_id
  from public.vendor_staff
  where user_id = auth.uid()
  limit 1;

  if assigned_vendor_id is null then
    raise exception 'Your account is not assigned to a vendor.' using errcode = '42501';
  end if;

  update public.vendors
  set pickup_location = normalized_location, updated_at = now()
  where id = assigned_vendor_id;
end;
$$;

revoke all on function public.update_vendor_pickup_location(text) from public, anon;
grant execute on function public.update_vendor_pickup_location(text) to authenticated;
