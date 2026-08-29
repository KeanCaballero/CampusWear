-- Keep anonymous catalog reads on simple public predicates. This prevents public joins from
-- invoking authenticated-only private helper functions while retaining the richer role checks
-- for signed-in users.
drop policy if exists "public can view active schools" on public.schools;
create policy "anonymous view active schools" on public.schools for select to anon using (is_active);
create policy "authenticated view schools" on public.schools for select to authenticated using (is_active or private.is_platform_admin());

drop policy if exists "public views authorized vendors" on public.vendors;
create policy "anonymous view authorized vendors" on public.vendors for select to anon using (is_active and is_authorized);
create policy "authenticated view authorized vendors" on public.vendors for select to authenticated using ((is_active and is_authorized) or private.is_school_operator(school_id) or private.is_vendor_staff(id));
