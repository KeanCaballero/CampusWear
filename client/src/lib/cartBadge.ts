import { cartItemCount, type CartLine } from "@/lib/supabaseCatalog";

/**
 * Count logic for the header cart badge, kept pure so it can be tested without a browser.
 *
 * The number is TOTAL QUANTITY, not the number of distinct lines — two polos and one pair of
 * trousers reads 3, not 2. That is what `cartItemCount` already computes for the cart page, so the
 * badge and the page can never disagree about how full the cart is.
 *
 * It counts orderable lines only. A line whose variant has left the public catalogue is shown on
 * the cart page so the student can remove it, but it contributes nothing to a total and cannot be
 * ordered, so counting it would promise something checkout will refuse.
 *
 * There is no separate cart query behind this: the shell reads the same `cartQueryKey` the cart
 * page uses, so both are served from one TanStack cache entry and every existing invalidation —
 * quantity change, removal, checkout — updates the badge for free.
 */

/** Above this, the badge shows "9+" rather than widening enough to disturb the header. */
export const CART_BADGE_MAX = 9;

/** Total orderable units in the cart. Safe on undefined while the query is still loading. */
export function cartBadgeCount(lines: readonly CartLine[] | undefined | null): number {
  if (!lines?.length) return 0;
  return cartItemCount(lines as CartLine[]);
}

/** What the badge prints. Empty string when there is nothing to show, so the caller renders none. */
export function cartBadgeText(count: number): string {
  if (count <= 0) return "";
  return count > CART_BADGE_MAX ? `${CART_BADGE_MAX}+` : String(count);
}

/**
 * The accessible name for the cart control.
 *
 * The count must not be carried by the badge glyph alone — it is decorative once the control itself
 * is named, and a reader that never sees the badge still hears the real number even when the
 * printed form has been capped at "9+".
 */
export function cartAriaLabel(count: number): string {
  if (count <= 0) return "Cart, empty";
  return `Cart, ${count} ${count === 1 ? "item" : "items"}`;
}
