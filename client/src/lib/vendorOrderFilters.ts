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
