-- CampusWear Supabase MVP schema. Apply with `supabase db push` after assigning a dedicated project.
create schema if not exists private;

do $$ begin
  create type public.app_role as enum ('student', 'vendor_staff', 'school_admin', 'platform_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'cancelled', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.pickup_status as enum ('scheduled', 'ready', 'picked_up');
exception when duplicate_object then null; end $$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  slug text not null unique,
  support_email text,
  timezone text not null default 'Asia/Manila',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  role public.app_role not null default 'student',
  full_name text,
  student_number text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.create_profile_for_new_user() from public;
drop trigger if exists create_profile_on_auth_signup on auth.users;
create trigger create_profile_on_auth_signup after insert on auth.users for each row execute function private.create_profile_for_new_user();

create table if not exists public.school_memberships (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (school_id, user_id),
  check (role in ('student', 'vendor_staff', 'school_admin'))
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  slug text not null,
  pickup_location text not null,
  contact_email text,
  contact_phone text,
  is_authorized boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

create table if not exists public.vendor_staff (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vendor_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 3 and 160),
  description text not null check (char_length(description) between 10 and 2000),
  image_path text,
  price_in_centavos integer not null check (price_in_centavos > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (char_length(size) between 1 and 32),
  sku text not null unique,
  price_in_centavos integer check (price_in_centavos > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size)
);

create table if not exists public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity_delta integer not null,
  reason text not null,
  order_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, school_id)
);

create table if not exists public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_id, variant_id)
);

create table if not exists public.pickup_slots (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  capacity integer not null default 20 check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  school_id uuid not null references public.schools(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  pickup_slot_id uuid references public.pickup_slots(id) on delete set null,
  pickup_location text not null,
  pickup_at timestamptz,
  status public.order_status not null default 'pending',
  pickup_status public.pickup_status not null default 'scheduled',
  total_in_centavos integer not null check (total_in_centavos > 0),
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.inventory_movements
  add constraint inventory_movements_order_id_fkey foreign key (order_id) references public.orders(id) on delete set null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_size text not null,
  unit_price_in_centavos integer not null check (unit_price_in_centavos > 0),
  quantity integer not null check (quantity > 0),
  line_total_in_centavos integer not null check (line_total_in_centavos > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  order_id uuid references public.orders(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists products_school_active_idx on public.products (school_id, is_active);
create index if not exists products_vendor_idx on public.products (vendor_id);
create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists orders_student_idx on public.orders (student_id, placed_at desc);
create index if not exists orders_vendor_status_idx on public.orders (vendor_id, status);
create index if not exists orders_school_status_idx on public.orders (school_id, status);
create index if not exists notifications_recipient_idx on public.notifications (recipient_user_id, read_at, created_at desc);
create index if not exists school_memberships_user_idx on public.school_memberships (user_id);
create index if not exists vendor_staff_user_idx on public.vendor_staff (user_id);

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'platform_admin');
$$;
create or replace function private.is_school_operator(target_school_id uuid)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select private.is_platform_admin() or exists (
    select 1 from public.school_memberships
    where school_id = target_school_id and user_id = auth.uid() and role = 'school_admin'
  );
$$;
create or replace function private.is_vendor_staff(target_vendor_id uuid)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select private.is_platform_admin() or exists (
    select 1 from public.vendor_staff where vendor_id = target_vendor_id and user_id = auth.uid()
  );
$$;
revoke all on function private.is_platform_admin() from public;
revoke all on function private.is_school_operator(uuid) from public;
revoke all on function private.is_vendor_staff(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_school_operator(uuid) to authenticated;
grant execute on function private.is_vendor_staff(uuid) to authenticated;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_staff enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.pickup_slots enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.schools, public.vendors, public.categories, public.products, public.product_variants, public.pickup_slots, public.announcements to anon, authenticated;
grant select on public.inventory to authenticated;
grant select, insert, update, delete on public.carts, public.cart_items to authenticated;
grant select on public.profiles, public.school_memberships, public.vendor_staff, public.orders, public.order_items, public.notifications, public.inventory_movements to authenticated;
grant insert, update on public.products, public.product_variants, public.inventory, public.announcements to authenticated;
grant update on public.vendors to authenticated;

create policy "public can view active schools" on public.schools for select to anon, authenticated using (is_active or private.is_platform_admin());
create policy "users view own profile" on public.profiles for select to authenticated using (user_id = auth.uid() or private.is_platform_admin());
create policy "users update own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members view their school membership" on public.school_memberships for select to authenticated using (user_id = auth.uid() or private.is_school_operator(school_id));
create policy "operators manage memberships" on public.school_memberships for all to authenticated using (private.is_school_operator(school_id)) with check (private.is_school_operator(school_id));
create policy "public views authorized vendors" on public.vendors for select to anon, authenticated using ((is_active and is_authorized) or private.is_school_operator(school_id) or private.is_vendor_staff(id));
create policy "school admins manage vendors" on public.vendors for update to authenticated using (private.is_school_operator(school_id)) with check (private.is_school_operator(school_id));
create policy "staff view vendor assignment" on public.vendor_staff for select to authenticated using (user_id = auth.uid() or private.is_school_operator((select school_id from public.vendors where id = vendor_id)));
create policy "public views categories" on public.categories for select to anon, authenticated using (true);
create policy "public views active products" on public.products for select to anon, authenticated using ((is_active and exists (select 1 from public.vendors where id = vendor_id and is_active and is_authorized)) or private.is_vendor_staff(vendor_id) or private.is_school_operator(school_id));
create policy "vendor staff create products" on public.products for insert to authenticated with check (private.is_vendor_staff(vendor_id) and school_id = (select school_id from public.vendors where id = vendor_id));
create policy "vendor staff update products" on public.products for update to authenticated using (private.is_vendor_staff(vendor_id)) with check (private.is_vendor_staff(vendor_id));
create policy "public views active variants" on public.product_variants for select to anon, authenticated using ((is_active and exists (select 1 from public.products p join public.vendors v on v.id = p.vendor_id where p.id = product_id and p.is_active and v.is_active and v.is_authorized)) or private.is_vendor_staff((select vendor_id from public.products where id = product_id)));
create policy "vendor staff manage variants" on public.product_variants for all to authenticated using (private.is_vendor_staff((select vendor_id from public.products where id = product_id))) with check (private.is_vendor_staff((select vendor_id from public.products where id = product_id)));
create policy "vendor staff view inventory" on public.inventory for select to authenticated using (private.is_vendor_staff((select p.vendor_id from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = variant_id)));
create policy "vendor staff adjust inventory" on public.inventory for update to authenticated using (private.is_vendor_staff((select p.vendor_id from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = variant_id))) with check (private.is_vendor_staff((select p.vendor_id from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = variant_id)));
create policy "staff view inventory movements" on public.inventory_movements for select to authenticated using (private.is_vendor_staff((select p.vendor_id from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = variant_id)));
create policy "students manage own carts" on public.carts for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "students manage own cart items" on public.cart_items for all to authenticated using (exists (select 1 from public.carts where id = cart_id and student_id = auth.uid())) with check (exists (select 1 from public.carts where id = cart_id and student_id = auth.uid()));
create policy "public views active pickup slots" on public.pickup_slots for select to anon, authenticated using (is_active or private.is_vendor_staff(vendor_id));
create policy "students view own orders" on public.orders for select to authenticated using (student_id = auth.uid() or private.is_vendor_staff(vendor_id) or private.is_school_operator(school_id));
create policy "students view own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where id = order_id and (student_id = auth.uid() or private.is_vendor_staff(vendor_id) or private.is_school_operator(school_id))));
create policy "users view own notifications" on public.notifications for select to authenticated using (recipient_user_id = auth.uid());
create policy "users mark own notifications read" on public.notifications for update to authenticated using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());
create policy "public views active announcements" on public.announcements for select to anon, authenticated using (is_active and (expires_at is null or expires_at > now()));
create policy "operators publish announcements" on public.announcements for insert to authenticated with check (private.is_school_operator(school_id) or (vendor_id is not null and private.is_vendor_staff(vendor_id)));
create policy "operators update announcements" on public.announcements for update to authenticated using (private.is_school_operator(school_id) or (vendor_id is not null and private.is_vendor_staff(vendor_id))) with check (private.is_school_operator(school_id) or (vendor_id is not null and private.is_vendor_staff(vendor_id)));

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
create policy "public reads product photos" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "vendor staff uploads product photos" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and private.is_vendor_staff((storage.foldername(name))[1]::uuid));
create policy "vendor staff updates product photos" on storage.objects for update to authenticated using (bucket_id = 'product-images' and private.is_vendor_staff((storage.foldername(name))[1]::uuid)) with check (bucket_id = 'product-images' and private.is_vendor_staff((storage.foldername(name))[1]::uuid));
create policy "vendor staff deletes product photos" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and private.is_vendor_staff((storage.foldername(name))[1]::uuid));

-- SECURITY DEFINER is used only for atomic checkout because students must not hold inventory-update grants.
-- The function checks auth.uid(), locks inventory rows, creates immutable order snapshots, and decrements stock atomically.
create or replace function public.create_order_from_cart(pickup_location_input text, pickup_at_input timestamptz default null, pickup_slot_input uuid default null)
returns setof public.orders language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  current_cart record;
  cart_row record;
  current_order public.orders%rowtype;
  total_amount integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if not exists (select 1 from public.profiles where user_id = auth.uid() and role = 'student') then raise exception 'Only student accounts can place an order'; end if;
  if char_length(trim(pickup_location_input)) < 2 then raise exception 'Pickup location is required'; end if;

  for current_cart in select * from public.carts where student_id = auth.uid() loop
    for cart_row in
      select ci.variant_id, ci.quantity, pv.size, coalesce(pv.price_in_centavos, p.price_in_centavos) as unit_price, p.name as product_name, p.vendor_id, p.school_id
      from public.cart_items ci join public.product_variants pv on pv.id = ci.variant_id join public.products p on p.id = pv.product_id
      where ci.cart_id = current_cart.id order by p.vendor_id, ci.variant_id for update of ci, pv, p
    loop
      perform 1 from public.inventory where variant_id = cart_row.variant_id and quantity >= cart_row.quantity for update;
      if not found then raise exception 'Insufficient stock for % (%)', cart_row.product_name, cart_row.size using errcode = 'P0001'; end if;
    end loop;

    for cart_row in
      select p.vendor_id, p.school_id, sum(ci.quantity * coalesce(pv.price_in_centavos, p.price_in_centavos))::integer as total
      from public.cart_items ci join public.product_variants pv on pv.id = ci.variant_id join public.products p on p.id = pv.product_id
      where ci.cart_id = current_cart.id group by p.vendor_id, p.school_id
    loop
      insert into public.orders (order_number, school_id, vendor_id, student_id, pickup_slot_id, pickup_location, pickup_at, total_in_centavos)
      values ('CW-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), cart_row.school_id, cart_row.vendor_id, auth.uid(), pickup_slot_input, trim(pickup_location_input), pickup_at_input, cart_row.total)
      returning * into current_order;

      insert into public.order_items (order_id, variant_id, product_name, variant_size, unit_price_in_centavos, quantity, line_total_in_centavos)
      select current_order.id, ci.variant_id, p.name, pv.size, coalesce(pv.price_in_centavos, p.price_in_centavos), ci.quantity, ci.quantity * coalesce(pv.price_in_centavos, p.price_in_centavos)
      from public.cart_items ci join public.product_variants pv on pv.id = ci.variant_id join public.products p on p.id = pv.product_id
      where ci.cart_id = current_cart.id and p.vendor_id = cart_row.vendor_id;

      update public.inventory i set quantity = i.quantity - ci.quantity, updated_at = now()
      from public.cart_items ci where ci.cart_id = current_cart.id and ci.variant_id = i.variant_id and exists (select 1 from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = ci.variant_id and p.vendor_id = cart_row.vendor_id);

      insert into public.inventory_movements (variant_id, quantity_delta, reason, order_id, created_by)
      select ci.variant_id, -ci.quantity, 'order_placed', current_order.id, auth.uid() from public.cart_items ci join public.product_variants pv on pv.id = ci.variant_id join public.products p on p.id = pv.product_id where ci.cart_id = current_cart.id and p.vendor_id = cart_row.vendor_id;

      insert into public.notifications (recipient_user_id, school_id, order_id, type, title, body) values (auth.uid(), current_order.school_id, current_order.id, 'order_pending', 'Order received', 'Your order ' || current_order.order_number || ' is pending vendor confirmation.');
      return next current_order;
    end loop;
    delete from public.cart_items where cart_id = current_cart.id;
  end loop;
end; $$;
revoke all on function public.create_order_from_cart(text, timestamptz, uuid) from public;
grant execute on function public.create_order_from_cart(text, timestamptz, uuid) to authenticated;
