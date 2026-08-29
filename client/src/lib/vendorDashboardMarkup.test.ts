import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/vendor/VendorDashboard.tsx", import.meta.url), "utf8");

describe("vendor dashboard priority markup", () => {
  it("makes operational metric cards actionable without changing their data source", () => {
    expect(source).toContain('href: "/vendor/orders"');
    expect(source).toContain('href: "/vendor/inventory"');
    expect(source).toContain('href: "/vendor/reports"');
    expect(source).toContain('aria-label="Vendor priorities"');
  });

  it("keeps pickup-location help connected to the editable vendor field", () => {
    expect(source).toContain('id="vendor-pickup-location-help"');
    expect(source).toContain('aria-describedby="vendor-pickup-location-help"');
    expect(source).toContain('autoComplete="street-address"');
  });
});
