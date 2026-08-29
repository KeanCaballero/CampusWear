-- Fix: vendor product deletion always failed with
--   42P17 "infinite recursion detected in policy for relation \"products\""
--
-- The delete policy added in 20260828130000 established the right RULE (a product that order
-- history references may not be permanently deleted) but evaluated it in a way Postgres cannot
-- plan: its NOT EXISTS reads public.product_variants, and that table's own SELECT policy reads
-- back from public.products. Expanding the products delete policy therefore re-entered the
-- products policies and Postgres aborted in the rewriter -- before the NOT EXISTS was ever
-- evaluated. The failure was consequently data-independent: products WITH order history and
-- products WITHOUT it were equally undeletable, and vendors saw raw Postgres error text.
--
-- The rule itself was never wrong, so it is preserved verbatim. Only its evaluation moves behind
-- a SECURITY DEFINER helper -- the same pattern private.is_vendor_staff already uses -- which
-- reads order_items/product_variants as the function owner and so never re-enters the products
-- policies. SECURITY DEFINER additionally blocks SQL-function inlining, which is what guarantees
-- the subquery cannot be folded back into the calling plan and reintroduce the cycle.
--
-- RLS remains the security boundary. The DELETE is still an ordinary RLS-checked DELETE performed
-- by the authenticated user, still gated on private.is_vendor_staff(vendor_id). Nothing here
-- grants the client a way around the policy.

create or replace function private.product_has_order_history(target_product_id uuid)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1
    from public.order_items oi
    join public.product_variants pv on pv.id = oi.variant_id
    where pv.product_id = target_product_id
  );
$$;

-- Same audience discipline as the other private predicates: no PUBLIC, no anon.
revoke all on function private.product_has_order_history(uuid) from public;
grant execute on function private.product_has_order_history(uuid) to authenticated;

-- Postgres has no "create or replace policy". Recreating it keeps the whole rule auditable in one
-- place, and the intermediate state fails closed: with RLS enabled and no permissive delete
-- policy, every delete is denied rather than allowed.
drop policy if exists "vendor staff delete products without orders" on public.products;

create policy "vendor staff delete products without orders"
on public.products
for delete
to authenticated
using (
  private.is_vendor_staff(vendor_id)
  and not private.product_has_order_history(id)
);
