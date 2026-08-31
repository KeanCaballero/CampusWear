-- Restore inventory when an order is cancelled or rejected.
--
-- THE BUG
-- create_order_from_cart decrements public.inventory at checkout and records the consumption in
-- public.inventory_movements as reason 'order_placed' with a negative quantity_delta.
-- transition_order_status then moved orders into 'cancelled' or 'rejected' while touching only
-- public.orders and public.notifications. Nothing anywhere gave the stock back: an audit of the
-- live database found exactly one routine that mutates inventory quantity, and it only subtracts.
-- There are no triggers on orders, order_items, inventory or inventory_movements.
--
-- The result is silent, permanent shrinkage. Every cancelled or rejected order destroys the stock
-- it reserved, and the vendor has no way to tell — the inventory table simply reads lower than the
-- shelf. Two production orders have already lost 5 units this way.
--
-- WHY BOTH TERMINAL-STOPPED STATES RESTORE
-- Verified against the real lifecycle rather than assumed from the status name. An order only
-- exists after create_order_from_cart has committed, and that function is the only thing that
-- creates one — so the decrement has always already happened by the time any transition runs.
-- 'rejected' is reachable only from 'pending', and 'cancelled' only from pending / confirmed /
-- preparing / ready_for_pickup. Every one of those is a post-checkout state. Both production
-- examples confirm it: the rejected order holds an 'order_placed' movement for 1 unit and the
-- cancelled order one for 4. 'completed' keeps its decrement, because the goods left the shelf.
--
-- WHAT IS RESTORED
-- The movement ledger, not order_items.quantity. The ledger is the record of what inventory
-- actually gave up, which is the quantity that must come back. The two agree exactly today — a
-- full comparison across every order found zero disagreement — but if they ever diverge, the
-- ledger is the one describing inventory. Only negative net movement is reversed, so a positive
-- adjustment can never be turned into free stock.
--
-- IDEMPOTENCY
-- inventory_movements had no unique constraint of any kind, so nothing structurally prevented a
-- retry from crediting stock twice. The partial unique index below makes one restoration per
-- (order, variant) the only possibility the database will accept. The restoring UPDATE then reads
-- from the INSERT's RETURNING rows, so when the insert is skipped as a conflict there is nothing
-- to add and the second attempt changes no quantity. The guarantee is in the schema, not in
-- application code.
--
-- The order-status machine already refuses a second terminal transition (a cancelled order has no
-- legal next state and raises 22023), so this index is the belt to that machine's braces. It is
-- deliberately partial: it constrains only restoration rows, leaving 'order_placed' and any future
-- manual adjustment free to repeat.
--
-- ATOMICITY
-- Everything happens inside the single transaction the function already runs in, after the
-- SELECT ... FOR UPDATE that serialises concurrent transitions of the same order. The status
-- change, the restoration and the notification commit together or not at all; there is no window
-- in which an order reads cancelled while its stock is still consumed.

create unique index if not exists inventory_movements_one_restoration_per_order_variant
  on public.inventory_movements (order_id, variant_id)
  where reason in ('order_cancelled', 'order_rejected');

comment on index public.inventory_movements_one_restoration_per_order_variant is
  'Makes inventory restoration idempotent: an order may credit a variant back at most once, however many times a terminal transition is retried.';

create or replace function public.transition_order_status(p_order_id uuid, p_new_status order_status)
returns orders
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  current_order public.orders%rowtype;
  updated_order public.orders%rowtype;
  notification_title text;
  notification_body text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  select * into current_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if not private.is_vendor_staff(current_order.vendor_id) then
    raise exception 'You are not authorized to update this order' using errcode = '42501';
  end if;

  if not (
    (current_order.status = 'pending' and p_new_status in ('confirmed', 'rejected', 'cancelled')) or
    (current_order.status = 'confirmed' and p_new_status in ('preparing', 'cancelled')) or
    (current_order.status = 'preparing' and p_new_status in ('ready_for_pickup', 'cancelled')) or
    (current_order.status = 'ready_for_pickup' and p_new_status in ('completed', 'cancelled'))
  ) then
    raise exception 'This order status transition is not allowed' using errcode = '22023';
  end if;

  update public.orders
  set status = p_new_status,
      pickup_status = case
        when p_new_status = 'ready_for_pickup' then 'ready'::public.pickup_status
        when p_new_status = 'completed' then 'picked_up'::public.pickup_status
        else pickup_status
      end,
      completed_at = case when p_new_status = 'completed' then now() else completed_at end,
      updated_at = now()
  where id = p_order_id
  returning * into updated_order;

  -- Give back exactly what checkout took, and only for the two states that end an order without
  -- the goods leaving the shelf. The insert is attempted first: the partial unique index turns a
  -- repeat into a no-op, and because the update reads the insert's RETURNING rows, a skipped
  -- insert restores nothing. having sum(...) < 0 keeps this a reversal of real consumption rather
  -- than a way to manufacture stock.
  if p_new_status in ('cancelled', 'rejected') then
    with consumed as (
      select m.variant_id, sum(m.quantity_delta) as net_delta
      from public.inventory_movements m
      where m.order_id = p_order_id
        and m.reason = 'order_placed'
        and m.variant_id is not null
      group by m.variant_id
      having sum(m.quantity_delta) < 0
    ),
    restored as (
      insert into public.inventory_movements (variant_id, quantity_delta, reason, order_id, created_by)
      select c.variant_id, -c.net_delta, 'order_' || p_new_status::text, p_order_id, auth.uid()
      from consumed c
      on conflict do nothing
      returning variant_id, quantity_delta
    )
    update public.inventory i
    set quantity = i.quantity + r.quantity_delta,
        updated_at = now()
    from restored r
    where i.variant_id = r.variant_id;
  end if;

  notification_title := case p_new_status
    when 'confirmed' then 'Order confirmed'
    when 'preparing' then 'Order is being prepared'
    when 'ready_for_pickup' then 'Ready for pickup'
    when 'completed' then 'Order completed'
    when 'cancelled' then 'Order cancelled'
    else 'Order update'
  end;
  notification_body := case p_new_status
    when 'ready_for_pickup' then 'Order ' || updated_order.order_number || ' is ready at ' || updated_order.pickup_location || '.'
    when 'completed' then 'Order ' || updated_order.order_number || ' has been marked as completed.'
    when 'cancelled' then 'Order ' || updated_order.order_number || ' has been cancelled. Contact your vendor for assistance.'
    else 'Order ' || updated_order.order_number || ' has been updated to ' || replace(p_new_status::text, '_', ' ') || '.'
  end;

  insert into public.notifications (recipient_user_id, school_id, order_id, type, title, body)
  values (updated_order.student_id, updated_order.school_id, updated_order.id, 'order_' || p_new_status::text, notification_title, notification_body);

  return updated_order;
end;
$function$;

-- Unchanged from the existing grants: authenticated callers only, still gated inside the function
-- by auth.uid() and private.is_vendor_staff(). Nothing is broadened, and anon gains nothing.
revoke all on function public.transition_order_status(uuid, order_status) from public;
grant execute on function public.transition_order_status(uuid, order_status) to authenticated, service_role;
