-- Vendor staff need a separate INSERT policy to create initial stock for a newly created size.
-- Updates remain governed by the existing vendor_staff_adjust_inventory policy.
create policy "vendor staff create inventory" on public.inventory
for insert to authenticated
with check (
  private.is_vendor_staff((
    select p.vendor_id
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = variant_id
  ))
);
