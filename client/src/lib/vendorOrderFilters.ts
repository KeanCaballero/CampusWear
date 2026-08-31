import type { VendorOrder } from "@/lib/supabaseCatalog";

export const vendorOrderFilterOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
] as const;

export type VendorOrderFilter = (typeof vendorOrderFilterOptions)[number]["value"];

export function filterVendorOrders(orders: VendorOrder[], filter: VendorOrderFilter) {
  return filter === "all" ? orders : orders.filter(order => order.status === filter);
}

/**
 * Narrows an already-loaded order list by order number, product name, or size.
 *
 * Purely client-side: listVendorOrders() takes no arguments and this adds none. An empty or
 * whitespace-only term returns the input untouched, so search composes with the status filter
 * without changing its semantics.
 */
export function searchVendorOrders(orders: VendorOrder[], term: string) {
  const needle = term.trim().toLowerCase();
  if (!needle) return orders;
  return orders.filter(order =>
    order.orderNumber.toLowerCase().includes(needle) ||
    order.items.some(item => item.productName.toLowerCase().includes(needle) || item.size.toLowerCase().includes(needle)),
  );
}

/**
 * How many orders each status filter would show, given the current search term.
 *
 * Derived entirely from the order array already in memory — no extra request, and nothing counted
 * that the vendor cannot already see, because the list itself is scoped by the orders SELECT
 * policy. Counts respect the search term so a badge always matches what clicking the filter
 * produces; a genuine zero is reported as zero rather than hidden.
 */
export function countVendorOrdersByFilter(orders: VendorOrder[], term = ""): Record<VendorOrderFilter, number> {
  const searched = searchVendorOrders(orders, term);
  const counts = Object.fromEntries(vendorOrderFilterOptions.map(option => [option.value, 0])) as Record<VendorOrderFilter, number>;
  counts.all = searched.length;
  for (const order of searched) {
    if (order.status in counts) counts[order.status as VendorOrderFilter] += 1;
  }
  return counts;
}
