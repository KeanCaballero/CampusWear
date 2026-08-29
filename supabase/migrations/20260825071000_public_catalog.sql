-- Public catalog projection: exposes availability labels only, never raw stock quantities.
create or replace function public.get_public_catalog(p_search text default null, p_product_id uuid default null)
returns table (
  product_id uuid,
  product_name text,
  product_description text,
  image_path text,
  price_in_centavos integer,
  category_name text,
  vendor_name text,
  school_name text,
  variant_id uuid,
  variant_size text,
  availability text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.name, p.description, p.image_path, p.price_in_centavos, c.name, v.name, s.name,
         pv.id, pv.size,
         case when i.quantity <= 0 then 'out_of_stock'
              when i.quantity <= i.low_stock_threshold then 'low_stock'
              else 'in_stock' end
  from public.products p
  join public.vendors v on v.id = p.vendor_id and v.is_active and v.is_authorized
  join public.schools s on s.id = p.school_id and s.is_active
  left join public.categories c on c.id = p.category_id
  join public.product_variants pv on pv.product_id = p.id and pv.is_active
  join public.inventory i on i.variant_id = pv.id
  where p.is_active
    and (p_product_id is null or p.id = p_product_id)
    and (p_search is null or p.name ilike '%' || p_search || '%' or p.description ilike '%' || p_search || '%')
  order by p.name, pv.size;
$$;

revoke all on function public.get_public_catalog(text, uuid) from public;
grant execute on function public.get_public_catalog(text, uuid) to anon, authenticated;

