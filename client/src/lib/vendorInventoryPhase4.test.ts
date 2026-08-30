import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const raw = readFileSync(new URL("../pages/vendor/VendorInventory.tsx", import.meta.url), "utf8");
// Comments explain the grouping and layering rules. Assertions about what the page EXECUTES read
// the stripped source, never the prose.
const page = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("search and the attention filter are client-side only", () => {
  it("adds no argument to the existing query", () => {
    expect(page).toContain("queryFn: listVendorInventory");
    expect(page).not.toMatch(/listVendorInventory\([^)]+\)/);
    expect(page.match(/useQuery\(/g)?.length).toBe(1);
  });

  it("narrows the list already in memory", () => {
    expect(page).toContain("const records = inventory.data ?? []");
    expect(page).toContain("useMemo(");
    expect(page).toContain("item.productName.toLowerCase().includes(term)");
    expect(page).toContain("item.size.toLowerCase().includes(term)");
    expect(page).toContain("item.sku.toLowerCase().includes(term)");
  });

  it("reuses the existing low-stock predicate rather than inventing a threshold", () => {
    expect(page).toContain('item.availability === "low_stock" || item.availability === "out_of_stock"');
    // One shared helper drives both the summary count and the filter.
    expect(page.match(/needsAttention/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("creates no new inventory state", () => {
    for (const invented of [/backorder/i, /reserved/i, /incoming/i, /discontinued/i]) {
      expect(page).not.toMatch(invented);
    }
  });
});

describe("grouping preserves order and hides nothing", () => {
  it("groups by consecutive runs instead of re-sorting", () => {
    // listVendorInventory orders products by name. Building groups from consecutive runs keeps
    // that ordering exactly; a sort or a keyed map would silently impose a different one.
    expect(page).toContain("groups[groups.length - 1]");
    expect(page).not.toMatch(/\.sort\(/);
  });

  it("renders every variant of every group", () => {
    expect(page).toContain("group.items.map(item => <InventoryRow");
    expect(page).toContain("group.items.length");
    // No slicing or capping anywhere in the render path.
    expect(page).not.toMatch(/\.slice\(/);
  });

  it("states the product once per group rather than on every row", () => {
    expect(page).toContain("grouped.map(group => <tbody");
    expect(page).toContain("{group.productName}");
  });

  it("keeps the mobile card list, which already names its own product", () => {
    expect(page).toContain("function InventoryCard");
    expect(page).toContain('aria-label="Mobile inventory records"');
    expect(page).toContain("filtered.map(item => <InventoryCard");
  });
});

describe("empty states stay truthful", () => {
  it("separates no-inventory from filters matching nothing", () => {
    expect(page).toContain('title="No variants yet"');
    expect(page).toContain('title="No variants match your filters"');
    expect(page).toContain('label: "Clear filters"');
  });

  it("decides offline and error BEFORE either empty state", () => {
    const offline = page.indexOf("isStalledWithoutData(inventory)");
    const error = page.indexOf("inventory.isError");
    const empty = page.indexOf("records.length ?");
    expect(offline).toBeGreaterThan(-1);
    expect(offline).toBeLessThan(error);
    expect(error).toBeLessThan(empty);
  });

  it("does not state a count before the query resolves", () => {
    expect(page.match(/inventory\.isLoading \? "—"/g)?.length).toBe(2);
  });
});

describe("inventory writes are untouched", () => {
  it("keeps the exact mutation payload", () => {
    expect(page.match(/update\.mutate\(\{ variantId: item\.variantId, quantity, lowStockThreshold: threshold \}\)/g)?.length).toBe(2);
    expect(page).toContain("mutationFn: updateVendorInventory");
  });

  it("keeps the dirty check that gates saving", () => {
    expect(page.match(/const unchanged = quantity === item\.quantity && threshold === item\.lowStockThreshold/g)?.length).toBe(2);
    expect(page.match(/disabled=\{update\.isPending \|\| unchanged\}/g)?.length).toBe(2);
  });

  it("keeps the existing success and failure handling", () => {
    expect(page).toContain('toast.success("Inventory updated.")');
    expect(page).toContain("Inventory could not be updated.");
    expect(page).toContain('invalidateQueries({ queryKey: ["supabase-catalog"] })');
  });
});

describe("no invented data", () => {
  it("adds nothing the inventory model does not provide", () => {
    for (const invented of [/supplier/i, /warehouse/i, /forecast/i, /reorder/i, /\bdemand\b/i, /units sold/i, /lead time/i, /\bbulk\b/i]) {
      expect(page).not.toMatch(invented);
    }
  });

  it("binds every displayed field to the real record", () => {
    for (const binding of ["item.productName", "item.size", "item.sku", "item.quantity", "item.lowStockThreshold", "item.availability", "item.variantId"]) {
      expect(page).toContain(binding);
    }
  });

  it("derives availability from the existing StatusBadge rather than new logic", () => {
    expect(page).toContain('<StatusBadge kind="inventory" value={item.availability} />');
  });
});

describe("accessibility", () => {
  it("scopes every table header", () => {
    expect(page.match(/<th scope="col"/g)?.length).toBe(6);
    expect(page).toContain('<th scope="colgroup"');
  });

  it("labels the search field and the attention toggle", () => {
    expect(page).toContain('htmlFor="vendor-inventory-search"');
    expect(page).toContain('id="vendor-inventory-search"');
    expect(page).toContain("aria-pressed={attentionOnly}");
    expect(page).toContain('aria-live="polite"');
  });

  it("keeps per-input labels naming the product and size", () => {
    expect(page.match(/aria-label=\{`Quantity for \$\{item\.productName\} size \$\{item\.size\}`\}/g)?.length).toBe(2);
    expect(page.match(/aria-label=\{`Low-stock threshold for \$\{item\.productName\} size \$\{item\.size\}`\}/g)?.length).toBe(2);
  });

  it("uses semantic controls and usable touch targets", () => {
    expect(page).not.toMatch(/<div[^>]*onClick/);
    expect(page).toContain("min-h-11 bg-card pl-9");
    expect(page).toContain('type="button"');
  });
});

describe("design language and branding", () => {
  it("reuses the Phase 1 foundation", () => {
    expect(page).toContain("<WorkspacePage");
    expect(page).toContain("<WorkspacePanel");
  });

  it("uses the shared radius token for surfaces", () => {
    expect(page.match(/rounded-\[var\(--radius\)\]/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("carries no competing brand mark", () => {
    expect(page).not.toContain("GraduationCap");
    expect(page).not.toContain("BrandMark");
  });

  it("keeps the role gate exactly as it was", () => {
    expect(page).toContain('allowedRoles={["vendor_staff", "platform_admin", "admin"]}');
  });
});
