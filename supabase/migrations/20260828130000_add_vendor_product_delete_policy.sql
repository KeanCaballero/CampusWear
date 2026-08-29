-- Allow authorized vendor staff to delete only their own products that are not
-- referenced by order history. Product variants and inventory rows retain their
-- existing ON DELETE CASCADE behavior; order_items retain historical snapshots
-- and prevent deletion when they reference a product variant.

create policy "vendor staff delete products without orders"
on public.products
for delete
to authenticated
using (
  private.is_vendor_staff(vendor_id)
  and not exists (
    select 1
    from public.order_items oi
    join public.product_variants pv on pv.id = oi.variant_id
    where pv.product_id = products.id
  )
);
