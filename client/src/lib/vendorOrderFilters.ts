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
