import { describe, expect, it } from "vitest";
import { cartQueryKey, groupCatalogRows, notificationsQueryKey, platformAccountsQueryKey, platformOverviewQueryKey, platformTeamQueryKey, schoolAdminOverviewQueryKey, studentOrdersQueryKey, vendorDashboardQueryKey, vendorInventoryQueryKey, vendorManagedProductsQueryKey, vendorOrdersQueryKey, vendorPickupLocationQueryKey } from "./supabaseCatalog";

describe("public catalog mapping", () => {
  it("groups size rows without exposing raw inventory quantities", () => {
    const products = groupCatalogRows([
      { product_id: "p1", product_name: "Uniform", product_description: "A campus uniform item.", image_path: null, price_in_centavos: 85000, category_name: "Uniforms", vendor_name: "Vendor", school_name: "School", variant_id: "v1", variant_size: "M", availability: "in_stock" },
      { product_id: "p1", product_name: "Uniform", product_description: "A campus uniform item.", image_path: null, price_in_centavos: 85000, category_name: "Uniforms", vendor_name: "Vendor", school_name: "School", variant_id: "v2", variant_size: "L", availability: "low_stock" },
    ]);
    expect(products).toHaveLength(1);
    expect(products[0].variants).toEqual([{ id: "v1", size: "M", availability: "in_stock" }, { id: "v2", size: "L", availability: "low_stock" }]);
    expect(products[0]).toMatchObject({ vendorName: "Vendor", schoolName: "School" });
    expect(JSON.stringify(products)).not.toContain("quantity");
  });
});

describe("cart cache isolation", () => {
  it("uses an account-specific query key so prior-user cart data is not reused", () => {
    expect(cartQueryKey("student-a")).toEqual(["supabase-cart", "student-a"]);
    expect(cartQueryKey("student-b")).toEqual(["supabase-cart", "student-b"]);
    expect(cartQueryKey("student-a")).not.toEqual(cartQueryKey("student-b"));
  });
});

describe("student-owned cache isolation", () => {
  it("uses distinct account-specific keys for orders and notifications", () => {
    expect(studentOrdersQueryKey("student-a")).toEqual(["supabase-student-orders", "student-a"]);
    expect(studentOrdersQueryKey("student-a")).not.toEqual(studentOrdersQueryKey("student-b"));
    expect(notificationsQueryKey("student-a")).toEqual(["supabase-notifications", "student-a"]);
    expect(notificationsQueryKey("student-a")).not.toEqual(notificationsQueryKey("student-b"));
  });
});

describe("platform query readiness", () => {
  it("isolates platform account and team query caches by the active administrator", () => {
    expect(platformTeamQueryKey("admin-a")).toEqual(["supabase-platform-team", "admin-a"]);
    expect(platformTeamQueryKey("admin-a")).not.toEqual(platformTeamQueryKey("admin-b"));
    expect(platformAccountsQueryKey("admin-a", "  Kean  ")).toEqual(["supabase-platform-accounts", "admin-a", "Kean"]);
    expect(platformAccountsQueryKey("admin-a", "Kean")).not.toEqual(platformAccountsQueryKey("admin-b", "Kean"));
    expect(platformOverviewQueryKey("admin-a")).toEqual(["supabase-platform-overview", "admin-a"]);
    expect(platformOverviewQueryKey("admin-a")).not.toEqual(platformOverviewQueryKey("admin-b"));
    expect(schoolAdminOverviewQueryKey("admin-a")).toEqual(["supabase-school-admin-overview", "admin-a"]);
    expect(schoolAdminOverviewQueryKey("admin-a")).not.toEqual(schoolAdminOverviewQueryKey("admin-b"));
  });
});

describe("vendor workspace cache isolation", () => {
  it("uses the authenticated account in every vendor workspace cache key", () => {
    expect(vendorDashboardQueryKey("vendor-a")).toEqual(["supabase-vendor-dashboard", "vendor-a"]);
    expect(vendorPickupLocationQueryKey("vendor-a")).toEqual(["supabase-vendor-pickup-location", "vendor-a"]);
    expect(vendorManagedProductsQueryKey("vendor-a")).toEqual(["supabase-managed-products", "vendor-a"]);
    expect(vendorInventoryQueryKey("vendor-a")).toEqual(["supabase-vendor-inventory", "vendor-a"]);
    expect(vendorOrdersQueryKey("vendor-a")).toEqual(["supabase-vendor-orders", "vendor-a"]);
    expect(vendorOrdersQueryKey("vendor-a")).not.toEqual(vendorOrdersQueryKey("vendor-b"));
  });
});
