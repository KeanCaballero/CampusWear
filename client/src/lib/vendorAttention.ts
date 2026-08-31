import type { VendorInventoryItem } from "@/lib/supabaseCatalog";

/**
 * Splits the vendor's inventory into the two states that need different responses.
 *
 * The dashboard already counted "not in stock" as one number, which conflates two situations a
 * vendor treats differently: low stock is a reorder reminder, out of stock is lost sales happening
 * right now. Separating them costs nothing — both values are already on every inventory row.
 *
 * No threshold is defined or re-derived here. `availability` was computed once by
 * getInventoryAvailability from the row's own quantity and low_stock_threshold, and this only reads
 * the result, so the dashboard can never disagree with the inventory table about what is low.
 */

export type VendorAttention = {
  lowStock: VendorInventoryItem[];
  outOfStock: VendorInventoryItem[];
  /** Everything needing a look, out-of-stock first — the more urgent state leads. */
  items: VendorInventoryItem[];
  total: number;
};

export function summarizeVendorAttention(inventory: readonly VendorInventoryItem[] | undefined | null): VendorAttention {
  const rows = inventory ?? [];
  const lowStock = rows.filter(item => item?.availability === "low_stock");
  const outOfStock = rows.filter(item => item?.availability === "out_of_stock");
  return { lowStock, outOfStock, items: [...outOfStock, ...lowStock], total: lowStock.length + outOfStock.length };
}

/** One honest sentence, or null when there is genuinely nothing to act on. */
export function vendorAttentionSummary(attention: VendorAttention): string | null {
  if (attention.total === 0) return null;
  const parts: string[] = [];
  if (attention.outOfStock.length) {
    parts.push(`${attention.outOfStock.length} size${attention.outOfStock.length === 1 ? "" : "s"} out of stock`);
  }
  if (attention.lowStock.length) {
    parts.push(`${attention.lowStock.length} size${attention.lowStock.length === 1 ? "" : "s"} low in stock`);
  }
  return parts.join(" · ");
}
