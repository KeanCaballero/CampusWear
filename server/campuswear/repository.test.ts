import { describe, expect, it } from "vitest";
import { toProductSummary } from "./repository";

describe("CampusWear public catalog contract", () => {
  it("returns size-level availability without exposing raw inventory quantity", () => {
    const [product] = toProductSummary([{
      productId: 1,
      name: "Campus uniform",
      description: "A test catalog product with enough description.",
      imageUrl: null,
      priceInCentavos: 85000,
      vendorName: "Authorized Vendor",
      schoolName: "Campus",
      categoryName: "Uniforms",
      variantId: 10,
      size: "M",
      quantity: 4,
      lowStockThreshold: 5,
    }]);

    expect(product?.variants[0]).toEqual({ id: 10, size: "M", availability: "low_stock" });
    expect(product?.variants[0]).not.toHaveProperty("quantity");
  });
});

