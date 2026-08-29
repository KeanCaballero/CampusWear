import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/vendor/VendorInventory.tsx", import.meta.url), "utf8");

describe("vendor inventory responsive markup", () => {
  it("keeps a card layout on small screens and the complete data table on desktop", () => {
    expect(source).toContain("function InventoryCard");
    expect(source).toContain('className="mt-5 md:hidden"');
    expect(source).toContain('className="rounded-xl border border-border bg-card mt-5 hidden overflow-x-auto md:block"');
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("md:block");
    expect(source).toContain("SKU (internal code)");
    expect(source).toContain("Save inventory");
  });
});
