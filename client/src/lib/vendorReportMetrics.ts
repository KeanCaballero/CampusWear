import type { VendorInventoryItem, VendorOrder } from "@/lib/supabaseCatalog";

/**
 * Pure report arithmetic, extracted from VendorReports so it can be tested on its own.
 *
 * Money stays in integer centavos throughout and is only divided at the presentation boundary, so
 * nothing here accumulates floating-point error. No date logic lives in this module: the codebase
 * currently mixes UTC day boundaries with locally-formatted dates, and any time bucketing would
 * silently inherit that mismatch.
 */

/** The lifecycle states, in the order the pipeline actually moves through them. */
export const REPORT_STATUS_ORDER = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
  "rejected",
] as const;

export type ReportStatus = (typeof REPORT_STATUS_ORDER)[number];

export type StatusSlice = { status: ReportStatus; label: string; count: number };
export type ProductUnits = { productName: string; units: number };

export type VendorReport = {
  totalOrders: number;
  statusCounts: Record<ReportStatus, number>;
  /** Chart-ready, always all seven states in pipeline order. */
  statusDistribution: StatusSlice[];
  completedOrders: number;
  /** Integer centavos. */
  completedSalesInCentavos: number;
  /** Integer centavos, floored. Zero when nothing is completed — never NaN. */
  averageOrderValueInCentavos: number;
  /** 0–100, rounded. Zero when there are no orders — never NaN. */
  fulfilmentRatePercent: number;
  /** Descending by units, then by name so equal counts are stable. */
  unitsSoldByProduct: ProductUnits[];
  totalUnitsSold: number;
};

/** "ready_for_pickup" -> "Ready for pickup". Chart axes get a shorter form below. */
export function statusLabel(status: string): string {
  const spaced = status.replaceAll("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Compact axis labels so seven categories stay legible on a narrow screen. */
export const SHORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

function emptyStatusCounts(): Record<ReportStatus, number> {
  return { pending: 0, confirmed: 0, preparing: 0, ready_for_pickup: 0, completed: 0, cancelled: 0, rejected: 0 };
}

/**
 * Counts every order by status.
 *
 * A status outside the known set is ignored rather than crashing or inventing a bucket — the
 * database enum is authoritative, and a value this client does not recognise is not something the
 * report should guess about.
 */
export function countByStatus(orders: readonly VendorOrder[]): Record<ReportStatus, number> {
  const counts = emptyStatusCounts();
  for (const order of orders ?? []) {
    const status = order?.status as ReportStatus | undefined;
    if (status && status in counts) counts[status] += 1;
  }
  return counts;
}

/** Total units per product name, from the order items the payload already carries. */
export function unitsSoldByProduct(orders: readonly VendorOrder[]): ProductUnits[] {
  const totals = new Map<string, number>();
  for (const order of orders ?? []) {
    for (const item of order?.items ?? []) {
      if (!item?.productName) continue;
      const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
      totals.set(item.productName, (totals.get(item.productName) ?? 0) + quantity);
    }
  }
  return Array.from(totals, ([productName, units]) => ({ productName, units }))
    .sort((a, b) => b.units - a.units || a.productName.localeCompare(b.productName));
}

/** Sizes at or below their threshold, matching the predicate the Inventory page already uses. */
export function inventoryNeedingAttention(inventory: readonly VendorInventoryItem[]): number {
  return (inventory ?? []).filter(item => item?.availability === "low_stock" || item?.availability === "out_of_stock").length;
}

export function buildVendorReport(
  orders: readonly VendorOrder[] | undefined,
  inventory: readonly VendorInventoryItem[] | undefined,
): VendorReport & { inventoryNeedingAttention: number } {
  const safeOrders = orders ?? [];
  const statusCounts = countByStatus(safeOrders);
  const completedOrders = statusCounts.completed;

  // Integer centavos only; no division until the UI formats it.
  const completedSalesInCentavos = safeOrders
    .filter(order => order?.status === "completed")
    .reduce((sum, order) => sum + (Number.isFinite(order.totalInCentavos) ? order.totalInCentavos : 0), 0);

  const products = unitsSoldByProduct(safeOrders);

  return {
    totalOrders: safeOrders.length,
    statusCounts,
    statusDistribution: REPORT_STATUS_ORDER.map(status => ({ status, label: SHORT_STATUS_LABEL[status], count: statusCounts[status] })),
    completedOrders,
    completedSalesInCentavos,
    // Guarded so a store with nothing completed reports zero rather than NaN.
    averageOrderValueInCentavos: completedOrders > 0 ? Math.floor(completedSalesInCentavos / completedOrders) : 0,
    fulfilmentRatePercent: safeOrders.length > 0 ? Math.round((completedOrders / safeOrders.length) * 100) : 0,
    unitsSoldByProduct: products,
    totalUnitsSold: products.reduce((sum, entry) => sum + entry.units, 0),
    inventoryNeedingAttention: inventoryNeedingAttention(inventory ?? []),
  };
}
