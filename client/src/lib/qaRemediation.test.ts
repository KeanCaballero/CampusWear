import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countVendorOrdersByFilter, vendorOrderFilterOptions } from "./vendorOrderFilters";
import type { VendorOrder } from "./supabaseCatalog";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");
/** Comment-free source, so an assertion can never be satisfied by prose that merely mentions it. */
const code = (relative: string) =>
  read(relative).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

// -------------------------------------------------------------------------------------------
// Section A — the cart knew an item was out of stock and let checkout fail anyway
// -------------------------------------------------------------------------------------------
describe("A. out-of-stock lines block checkout before the student commits", () => {
  const cart = code("../pages/Cart.tsx");

  it("derives the blocked set from the catalogue's own availability, not a guess", () => {
    expect(cart).toContain('orderable.filter(line => line.availability === "out_of_stock")');
  });

  it("refuses to start checkout while such a line is present", () => {
    expect(cart).toContain("soldOut.length > 0");
    expect(cart).toMatch(/blocksCheckout\s*=\s*isFrozen \|\| !orderable\.length \|\| soldOut\.length > 0/);
  });

  it("explains the block as an alert, naming the affected items", () => {
    expect(cart).toContain('role="alert"');
    expect(cart).toContain("is out of stock");
    expect(cart).toContain("{line.productName}");
  });

  it("does NOT block merely low stock, because no quantity is available to justify it", () => {
    // get_public_catalog exposes an availability label, never a number. Blocking low_stock would
    // require inventing a threshold, and claiming "only N left" would require inventing N.
    expect(cart).not.toMatch(/blocksCheckout[^;]*low_stock/);
    expect(cart).not.toMatch(/only \d+ (left|available)/i);
  });

  it("keeps the backend's typed stock conflict as the final authority", () => {
    expect(cart).toContain("CheckoutStockConflictError");
  });

  it("still offers manual plus/minus quantity controls with real touch targets", () => {
    expect(cart).toContain('aria-label="Decrease quantity"');
    expect(cart).toContain('aria-label="Increase quantity"');
    expect(cart).toContain("size-11");
  });
});

// -------------------------------------------------------------------------------------------
// Section B — students were typing pickup locations the store already knows
// -------------------------------------------------------------------------------------------
describe("B. pickup is chosen from the stores' real collection points", () => {
  const cart = code("../pages/Cart.tsx");
  const catalog = code("./supabaseCatalog.ts");

  it("reads vendors.pickup_location rather than inventing options", () => {
    expect(catalog).toContain('from("vendors")');
    expect(catalog).toContain('.select("name, pickup_location")');
  });

  it("lets RLS decide readability and adds only matching display filters", () => {
    expect(catalog).toContain('.eq("is_active", true)');
    expect(catalog).toContain('.eq("is_authorized", true)');
  });

  it("drops stores with no declared location instead of showing a blank choice", () => {
    expect(catalog).toContain("vendor.pickup_location?.trim()");
  });

  it("offers a controlled Select when real options exist", () => {
    expect(cart).toContain("pickupOptions.length ?");
    expect(cart).toContain("<SelectItem key={option} value={option}>");
  });

  it("falls back to the original free-text field when none can be resolved", () => {
    expect(cart).toContain('id="pickupLocation"');
    expect(cart).toContain('{...form.register("pickupLocation")}');
  });

  it("reuses one cached query keyed by the cart's stores", () => {
    expect(cart).toContain("cartPickupLocationsQueryKey(storeNames)");
    expect(cart).toContain("enabled: storeNames.length > 0");
  });

  it("invents no address, hours, or delivery option", () => {
    // Comment-stripped: the module's own doc comment explains that hours are NOT shown, and that
    // prose must not be what satisfies (or fails) this assertion.
    const plaque = code("../components/campuswear/PickupPlaque.tsx");
    expect(plaque).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    expect(plaque).not.toMatch(/Mon–Fri|opening hours|deliver/i);
  });
});

// -------------------------------------------------------------------------------------------
// Section D — the order history never showed how many of each item was bought
// -------------------------------------------------------------------------------------------
describe("D. order history shows product, size, quantity and amount", () => {
  const orders = code("../pages/Orders.tsx");
  const catalog = code("./supabaseCatalog.ts");

  it("reads the real quantity and line total from the order_items snapshot", () => {
    expect(catalog).toContain("order_items(product_name, variant_size, quantity, line_total_in_centavos)");
    expect(catalog).toContain("quantity: item.quantity");
    expect(catalog).toContain("lineTotalInCentavos: item.line_total_in_centavos");
  });

  it("renders each line as product, size, quantity and amount", () => {
    expect(orders).toContain("{item.productName}");
    expect(orders).toContain("Size {item.size}");
    expect(orders).toContain("Qty × {item.quantity}");
    expect(orders).toContain("formatPeso(item.lineTotalInCentavos)");
  });

  it("does not recompute a price client-side", () => {
    expect(orders).not.toMatch(/unitPrice\s*\*\s*quantity/);
  });
});

// -------------------------------------------------------------------------------------------
// Section H — vendor filter counts, from data already loaded
// -------------------------------------------------------------------------------------------
describe("H. vendor order filters carry honest counts", () => {
  const order = (id: string, status: VendorOrder["status"], productName = "PE shirt"): VendorOrder => ({
    id,
    orderNumber: `CW-${id}`,
    status,
    pickupStatus: "scheduled",
    pickupLocation: "Canteen",
    placedAt: "2026-08-31T00:00:00Z",
    completedAt: null,
    totalInCentavos: 1000,
    items: [{ productName, size: "M", quantity: 1 }],
  });

  it("counts each status and totals them under All", () => {
    const orders = [
      order("1", "pending"), order("2", "pending"), order("3", "confirmed"),
      order("4", "completed"), order("5", "cancelled"),
    ];
    const counts = countVendorOrdersByFilter(orders);
    expect(counts.all).toBe(5);
    expect(counts.pending).toBe(2);
    expect(counts.confirmed).toBe(1);
    expect(counts.completed).toBe(1);
    expect(counts.cancelled).toBe(1);
  });

  it("reports a genuine zero rather than hiding the filter", () => {
    const counts = countVendorOrdersByFilter([order("1", "pending")]);
    expect(counts.rejected).toBe(0);
    expect(counts.ready_for_pickup).toBe(0);
    for (const option of vendorOrderFilterOptions) {
      expect(counts[option.value], option.value).toBeTypeOf("number");
    }
  });

  it("matches what clicking the filter will actually show, respecting the search term", () => {
    const orders = [order("1", "pending", "PE shirt"), order("2", "pending", "Blazer")];
    expect(countVendorOrdersByFilter(orders, "blazer").pending).toBe(1);
    expect(countVendorOrdersByFilter(orders, "blazer").all).toBe(1);
    expect(countVendorOrdersByFilter(orders, "nothing-matches").all).toBe(0);
  });

  it("is empty-safe", () => {
    const counts = countVendorOrdersByFilter([]);
    expect(counts.all).toBe(0);
    expect(counts.pending).toBe(0);
  });

  it("adds no network request — the page counts the array it already has", () => {
    const page = code("../pages/vendor/VendorOrders.tsx");
    expect(page).toContain("countVendorOrdersByFilter(allOrders, search)");
    expect(page).toContain("useMemo");
    expect(page).not.toMatch(/useQuery\([^)]*count/i);
  });

  it("exposes the count to assistive tech, not only as a glyph", () => {
    const page = code("../pages/vendor/VendorOrders.tsx");
    expect(page).toContain("aria-label={`${option.label}, ${filterCounts[option.value]} order");
    expect(page).toContain("aria-pressed={filter === option.value}");
  });
});

// -------------------------------------------------------------------------------------------
// Section J — cancelling was one mis-click away, with no way back
// -------------------------------------------------------------------------------------------
describe("J. destructive vendor transitions are confirmed first", () => {
  const page = code("../pages/vendor/VendorOrders.tsx");

  it("confirms exactly the two terminal outcomes, and nothing harmless", () => {
    expect(page).toContain('const DESTRUCTIVE_TRANSITIONS: ReadonlyArray<VendorOrder["status"]> = ["cancelled", "rejected"]');
    expect(page).toContain("if (DESTRUCTIVE_TRANSITIONS.includes(next)) setPendingChoice(next);");
    expect(page).toContain("else onStatusChange(next);");
  });

  it("warns that the step cannot be undone and that the student is told", () => {
    expect(page).toContain("This cannot be undone");
    expect(page).toContain("notified");
  });

  it("offers a way out that changes nothing", () => {
    expect(page).toContain("<AlertDialogCancel>Keep this order</AlertDialogCancel>");
  });

  it("only sends the transition after explicit confirmation", () => {
    expect(page).toContain("onClick={() => { if (pendingChoice) onStatusChange(pendingChoice); setPendingChoice(null); }}");
  });

  it("still goes through the authoritative RPC, never a direct status write", () => {
    const catalog = code("./supabaseCatalog.ts");
    expect(catalog).toContain('client.rpc("transition_order_status"');
    expect(catalog).not.toMatch(/from\("orders"\)[^;]*\.update\(/);
  });

  it("keeps per-order pending state, so one order's update cannot disable the rest", () => {
    expect(page).toContain("update.isPending && update.variables?.orderId === order.id");
  });
});

// -------------------------------------------------------------------------------------------
// Section K — "hidden" and "out of stock" are different things and must stay different
// -------------------------------------------------------------------------------------------
describe("K. visibility and stock stay separate concepts", () => {
  const shop = code("../pages/Shop.tsx");
  const detail = code("../pages/ProductDetail.tsx");
  const catalogRpc = read("../../../supabase/migrations/20260825071000_public_catalog.sql");

  it("hiding is a publishing control enforced by the server, not a stock state", () => {
    // products.is_active is what a vendor toggles; get_public_catalog filters on it, so a hidden
    // product is absent from the student catalogue entirely rather than shown as unavailable.
    expect(catalogRpc).toContain("where p.is_active");
  });

  it("stock is a separate, quantity-derived label", () => {
    expect(catalogRpc).toMatch(/quantity <= 0 then 'out_of_stock'/);
    expect(catalogRpc).toMatch(/quantity <= i\.low_stock_threshold then 'low_stock'/);
  });

  it("one sold-out size does NOT take the whole product down", () => {
    // A product is only out of stock when no variant is sellable.
    expect(shop).toContain('product.variants.some(variant => variant.availability === "in_stock")');
    expect(shop).toContain('product.variants.some(variant => variant.availability === "low_stock")');
  });

  it("available sizes stay usable while sold-out sizes are individually disabled", () => {
    expect(detail).toContain('const unavailable = variant.availability === "out_of_stock"');
    expect(detail).toContain('canAdd = Boolean(selected && selected.availability !== "out_of_stock")');
  });

  it("availability is announced in text, never by colour alone", () => {
    expect(detail).toContain('role="status"');
    expect(detail).toContain('aria-live="polite"');
    expect(detail).toContain('aria-describedby="selected-size-availability"');
  });

  it("no code path treats hidden as a stock value or vice versa", () => {
    // The two vocabularies must never be conflated: is_active is publishing, availability is
    // inventory. Neither page may branch on one while claiming the other.
    for (const source of [shop, detail]) {
      expect(source).not.toContain("isActive ? \"out_of_stock\"");
      expect(source).not.toContain("is_active === \"out_of_stock\"");
      expect(source).not.toContain("availability === \"hidden\"");
    }
  });
});

// -------------------------------------------------------------------------------------------
// Section N — availability was computed by hand in several places
// -------------------------------------------------------------------------------------------
describe("N. one authoritative availability predicate", () => {
  const catalog = code("./supabaseCatalog.ts");

  it("the data layer derives availability from the shared helper", () => {
    expect(catalog).toContain("getInventoryAvailability");
    expect(catalog).toContain('from "../../../server/campuswear/domain"');
  });

  it("no hand-rolled copy of the thresholds remains on the client", () => {
    expect(catalog).not.toMatch(/quantity <= 0 \? "out_of_stock"/);
    expect(catalog).not.toMatch(/<= (threshold|lowStockThreshold) \? "low_stock"/);
  });

  it("derives availability from the helper at every inventory site", () => {
    // Three sites compute it from a real quantity: the vendor catalogue, a freshly created
    // product, and the inventory table. Each must go through the shared predicate.
    const calls = catalog.match(/getInventoryAvailability\(/g) ?? [];
    expect(calls.length).toBe(3);
  });

  it("leaves the catalogue-miss sentinel alone, which is not an inventory computation", () => {
    // A cart line whose variant has left the public catalogue is marked out_of_stock as a
    // sentinel so it can be shown and removed. There is no quantity to derive it from.
    expect(catalog).toContain('availability: "out_of_stock" as Availability');
  });
});
