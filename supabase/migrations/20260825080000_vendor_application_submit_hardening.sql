drop policy if exists "authenticated users submit vendor applications" on public.vendor_applications;

create policy "students submit vendor applications" on public.vendor_applications
for insert to authenticated
with check (
  applicant_user_id = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and review_note is null
  and exists (select 1 from public.profiles where user_id = (select auth.uid()) and role = 'student')
  and exists (select 1 from public.schools where id = school_id and is_active)
);
