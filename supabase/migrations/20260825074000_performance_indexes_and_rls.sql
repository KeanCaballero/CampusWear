-- Foreign-key indexes surfaced by the live Supabase performance advisor.
create index if not exists announcements_school_idx on public.announcements (school_id);
create index if not exists announcements_vendor_idx on public.announcements (vendor_id);
create index if not exists announcements_author_idx on public.announcements (author_id);
create index if not exists cart_items_variant_idx on public.cart_items (variant_id);
create index if not exists carts_school_idx on public.carts (school_id);
create index if not exists inventory_movements_variant_idx on public.inventory_movements (variant_id);
create index if not exists inventory_movements_order_idx on public.inventory_movements (order_id);
create index if not exists inventory_movements_created_by_idx on public.inventory_movements (created_by);
create index if not exists notifications_school_idx on public.notifications (school_id);
create index if not exists notifications_order_idx on public.notifications (order_id);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists orders_pickup_slot_idx on public.orders (pickup_slot_id);
create index if not exists pickup_slots_vendor_idx on public.pickup_slots (vendor_id);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists profiles_school_idx on public.profiles (school_id);

-- The `(select auth.uid())` form lets Postgres evaluate the JWT identity once per statement.
drop policy if exists "users view own profile" on public.profiles;
create policy "users view own profile" on public.profiles for select to authenticated using (user_id = (select auth.uid()) or private.is_platform_admin());
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "members view their school membership" on public.school_memberships;
create policy "members view their school membership" on public.school_memberships for select to authenticated using (user_id = (select auth.uid()) or private.is_school_operator(school_id));
drop policy if exists "staff view vendor assignment" on public.vendor_staff;
create policy "staff view vendor assignment" on public.vendor_staff for select to authenticated using (user_id = (select auth.uid()) or private.is_school_operator((select school_id from public.vendors where id = vendor_id)));
drop policy if exists "students manage own carts" on public.carts;
create policy "students manage own carts" on public.carts for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
drop policy if exists "students manage own cart items" on public.cart_items;
create policy "students manage own cart items" on public.cart_items for all to authenticated using (exists (select 1 from public.carts where id = cart_id and student_id = (select auth.uid()))) with check (exists (select 1 from public.carts where id = cart_id and student_id = (select auth.uid())));
drop policy if exists "students view own orders" on public.orders;
create policy "students view own orders" on public.orders for select to authenticated using (student_id = (select auth.uid()) or private.is_vendor_staff(vendor_id) or private.is_school_operator(school_id));
drop policy if exists "students view own order items" on public.order_items;
create policy "students view own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where id = order_id and (student_id = (select auth.uid()) or private.is_vendor_staff(vendor_id) or private.is_school_operator(school_id))));
drop policy if exists "users view own notifications" on public.notifications;
create policy "users view own notifications" on public.notifications for select to authenticated using (recipient_user_id = (select auth.uid()));
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications for update to authenticated using (recipient_user_id = (select auth.uid())) with check (recipient_user_id = (select auth.uid()));
