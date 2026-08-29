import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/vendor/VendorInventory.tsx", import.meta.url), "utf8");

describe("latest reference vendor inventory revamp", () => {
  it("retains responsive size-level inventory editing and scoped update behavior", () => {
    expect(page).toContain("vendorInventoryQueryKey(user?.id)");
    expect(page).toContain("updateVendorInventory");
    expect(page).toContain("Available now");
    expect(page).toContain("Low-stock alert");
    expect(page).toContain('aria-label="Mobile inventory records"');
  });

  it("uses an operational inventory ledger hierarchy on larger screens", () => {
    expect(page).toContain("STOCK LEDGER");
    expect(page).toContain('aria-labelledby="inventory-table-title"');
    expect(page).toContain("Need attention");
  });
});
