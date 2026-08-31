import { OrderStatus, PickupStatus, getOrderStatusLabel } from "../../../server/campuswear/domain";

/**
 * One place that decides how an order's state is presented, for students and vendors alike.
 *
 * It exists because the same question — "what does this order's pickup state mean right now?" —
 * was being answered differently in different components, and one of those answers was wrong.
 *
 * The governing fact, read from the live schema: `orders.pickup_status` DEFAULTS to `'scheduled'`
 * and is only ever written by `transition_order_status`, which sets `'ready'` when the status
 * becomes `ready_for_pickup` and `'picked_up'` when it becomes `completed`. Nothing else touches
 * it. So pickup_status carries NO information that the order status does not already carry, and
 * `'scheduled'` in particular is just the column default — it never means a pickup was scheduled.
 *
 * That is why a brand-new pending order, and even a cancelled one, both displayed the badge
 * "Pickup scheduled": not because a pickup existed, but because nobody had overwritten the default.
 *
 * Related fact: `orders.pickup_at` is never written. `create_order_from_cart` is called with
 * `pickup_at_input: null` and no other code path sets it, so a "Pickup date" field can only ever
 * render a placeholder. It is not surfaced as a value for that reason.
 */

/** Order states from which nothing further can happen. Mirrors the RPC's transition machine. */
export const TERMINAL_ORDER_STATUSES = ["completed", "cancelled", "rejected"] as const;

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return (TERMINAL_ORDER_STATUSES as readonly string[]).includes(status);
}

/** Terminal, but the order was stopped rather than fulfilled. No pickup will ever happen. */
export function isStoppedOrderStatus(status: OrderStatus): boolean {
  return status === "cancelled" || status === "rejected";
}

/**
 * Whether pickup logistics (location, collection guidance) still mean anything.
 *
 * A cancelled or rejected order has no pickup, so showing a pickup location beside it invites a
 * student to walk to a counter for something that will not be there.
 */
export function showsPickupDetails(status: OrderStatus): boolean {
  return !isStoppedOrderStatus(status);
}

/**
 * Whether a separate pickup-status badge should be rendered next to the order-status badge.
 *
 * Never, and deliberately so. Every value is derived from the order status, so a second badge can
 * only ever restate it ("Ready for pickup" + "Ready to collect", "Completed" + "Picked up") or
 * mislead ("Pending" + "Pickup scheduled"). The order status and the timeline carry the state.
 *
 * The argument is kept so call sites stay explicit about what they are choosing not to render, and
 * so this decision has one obvious place to change if pickup ever becomes independently scheduled.
 */
export function showsPickupStatusBadge(status: OrderStatus, pickupStatus: PickupStatus): boolean {
  void status;
  void pickupStatus;
  return false;
}

/** Plain-language closing line for a terminal order. Null while the order is still moving. */
export function terminalNote(status: OrderStatus): string | null {
  if (!isTerminalOrderStatus(status)) return null;
  return `${getOrderStatusLabel(status)} — no further updates.`;
}

/**
 * What a student should understand about a terminal order.
 *
 * There is no cancellation- or rejection-reason column anywhere in the schema, so no reason is
 * stated or implied here. The vendor's own notification, which the student already receives, is
 * the only place an explanation could come from.
 */
export function studentTerminalExplanation(status: OrderStatus): string | null {
  if (status === "completed") return "You have collected this order.";
  if (status === "cancelled") return "This order was cancelled and will not be prepared. Check your notifications, or contact the store if you need help.";
  if (status === "rejected") return "The store could not accept this order. Check your notifications, or contact the store if you need help.";
  return null;
}

/** The progress stages a live order moves through, in order. Terminal-stopped orders leave it. */
export const ORDER_PROGRESS_STAGES: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Order placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
];

/** Index into ORDER_PROGRESS_STAGES, or null for an order that left the track. */
export function orderProgressIndex(status: OrderStatus): number | null {
  if (isStoppedOrderStatus(status)) return null;
  const index = ORDER_PROGRESS_STAGES.findIndex(stage => stage.value === status);
  return index === -1 ? null : index;
}

/**
 * Whether the completion timestamp should be shown.
 *
 * `completed_at` is written only by the transition to `completed`, so it is the one real pickup
 * date the system holds — and it makes a separate "Picked up" badge redundant.
 */
export function showsCompletedAt(status: OrderStatus, completedAt: string | null): boolean {
  return status === "completed" && Boolean(completedAt);
}

/**
 * Whether to show the pickup code.
 *
 * Only once the store has marked the order ready. Before that there is nothing to collect, and
 * showing a collection code would invite a wasted trip; afterwards the order is already completed.
 * The code itself is `orders.order_number`, which already exists — no second identifier is derived.
 */
export function showsPickupCode(status: OrderStatus): boolean {
  return status === "ready_for_pickup";
}
