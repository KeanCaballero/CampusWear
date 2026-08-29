-- Make the intended function audience explicit. Checkout and fulfillment always require a real JWT.
revoke execute on function public.create_order_from_cart(text, timestamptz, uuid) from anon;
revoke execute on function public.transition_order_status(uuid, public.order_status) from anon;

-- The public catalog remains anonymously executable by design. Its SECURITY DEFINER body is
-- schema-pinned and returns only availability labels, never inventory counts.
revoke all on function public.get_public_catalog(text, uuid) from public;
grant execute on function public.get_public_catalog(text, uuid) to anon, authenticated;
