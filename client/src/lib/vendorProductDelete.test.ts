import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("vendor product deletion safety contract", () => {
  it("keeps deletion vendor-scoped and blocks products referenced by orders", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260828130000_add_vendor_product_delete_policy.sql"), "utf8");
    expect(migration).toContain('for delete');
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("private.is_vendor_staff(vendor_id)");
    expect(migration).toContain("not exists");
    expect(migration).toContain("public.order_items");
    expect(migration).toContain("public.product_variants");
  });

  it("renders a confirmation-gated delete action and preserves order history messaging", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/vendor/VendorProducts.tsx"), "utf8");
    expect(page).toContain("AlertDialogTrigger");
    expect(page).toContain("Delete product");
    expect(page).toContain("Products referenced by an order cannot be deleted");
    expect(page).toContain("deleteManagedProduct");
  });
});
