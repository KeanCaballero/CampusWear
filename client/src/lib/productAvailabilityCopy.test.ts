import { describe, expect, it } from "vitest";
import { catalogAvailabilitySummary, selectedVariantAvailabilityCopy } from "./productAvailabilityCopy";

describe("product availability copy", () => {
  it("keeps catalog-card size and availability summaries readable", () => {
    expect(catalogAvailabilitySummary("M", 1)).toBe("Size M · 1 size available");
    expect(catalogAvailabilitySummary("L", 3)).toBe("Size L · 3 sizes available");
  });

  it("identifies the selected size in every product-detail availability state", () => {
    expect(selectedVariantAvailabilityCopy("M", "in_stock")).toBe("Size M is available for pickup.");
    expect(selectedVariantAvailabilityCopy("L", "low_stock")).toBe("Size L has limited availability — request soon.");
    expect(selectedVariantAvailabilityCopy("XL", "out_of_stock")).toBe("Size XL is currently unavailable.");
  });
});
