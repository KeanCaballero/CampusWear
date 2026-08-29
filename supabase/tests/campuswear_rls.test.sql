begin;
select plan(9);

-- This test blueprint is run with `supabase test db` in the dedicated CampusWear project.
-- Seed test users and use request.jwt.claim.sub to prove ownership and school/vendor isolation.
select ok(has_table_privilege('anon', 'public.products', 'select'), 'anonymous visitors can read catalog products');
select ok(not has_table_privilege('anon', 'public.orders', 'select'), 'anonymous visitors cannot read orders');
select ok(not has_table_privilege('anon', 'public.inventory', 'select'), 'anonymous visitors cannot query raw stock quantities');
select ok(has_table_privilege('authenticated', 'public.inventory', 'update'), 'authenticated vendors receive the update privilege required by RLS; the vendor-row policy blocks students and other vendors');
select ok(has_table_privilege('authenticated', 'public.carts', 'insert,update,delete'), 'authenticated users can use a cart subject to RLS');
select ok(has_function_privilege('authenticated', 'public.create_order_from_cart(text, timestamptz, uuid)', 'execute'), 'authenticated students can call atomic checkout');
select ok(not has_function_privilege('anon', 'public.create_order_from_cart(text, timestamptz, uuid)', 'execute'), 'anonymous visitors cannot call checkout');
select ok(has_function_privilege('authenticated', 'public.transition_order_status(uuid, public.order_status)', 'execute'), 'authenticated vendor staff can call controlled order transitions');
select ok(has_function_privilege('anon', 'public.get_public_catalog(text, uuid)', 'execute'), 'catalog users can receive availability labels without direct inventory access');

select * from finish();
rollback;
