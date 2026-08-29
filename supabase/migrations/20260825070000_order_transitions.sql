-- Vendor-authorized status changes with a controlled lifecycle and real student notifications.
create or replace function public.transition_order_status(p_order_id uuid, p_new_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
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
$$;

revoke all on function public.transition_order_status(uuid, public.order_status) from public;
grant execute on function public.transition_order_status(uuid, public.order_status) to authenticated;

