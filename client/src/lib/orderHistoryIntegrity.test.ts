import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Order history must survive a product being deleted OR hidden.
//
// It does so because order_items carries its own snapshot of what was bought (product_name,
// variant_size, unit price, quantity) and the history queries read those snapshots rather than
// joining back to products/product_variants. These assertions pin that contract: if someone
// later "optimises" the order queries into a join on products, historical orders would start
// depending on a mutable row and this suite fails.
const catalog = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8");
const baseMigration = readFileSync(new URL("../../../supabase/migrations/20260824190000_campuswear_mvp.sql", import.meta.url), "utf8");
const catalogRpc = readFileSync(new URL("../../../supabase/migrations/20260825071000_public_catalog.sql", import.meta.url), "utf8");

function statementFor(marker: string) {
  const line = catalog.split(/\r?\n/).find(candidate => candidate.includes(marker));
  if (!line) throw new Error(`could not locate query containing: ${marker}`);
  return line;
}

const studentOrdersQuery = statementFor('order_items(product_name, variant_size)');
const vendorOrdersQuery = statementFor('order_items(product_name, variant_size, quantity)');

describe("order_items stores an immutable snapshot of the purchase", () => {
  it("records the product name and size on the line item itself", () => {
    expect(baseMigration).toMatch(/create table if not exists public\.order_items[\s\S]*product_name text not null/);
    expect(baseMigration).toMatch(/create table if not exists public\.order_items[\s\S]*variant_size text not null/);
  });

  it("records the price and quantity paid, independent of the current product row", () => {
    expect(baseMigration).toMatch(/create table if not exists public\.order_items[\s\S]*unit_price_in_centavos integer not null/);
    expect(baseMigration).toMatch(/create table if not exists public\.order_items[\s\S]*line_total_in_centavos integer not null/);
  });

  it("keeps the line item when its variant disappears rather than cascading the row away", () => {
    const orderItems = /create table if not exists public\.order_items[\s\S]*?\);/.exec(baseMigration)?.[0] ?? "";

    expect(orderItems).toContain("variant_id uuid references public.product_variants(id) on delete set null");
    expect(orderItems).not.toMatch(/variant_id[^\n]*on delete cascade/);
  });
});

describe("history reads snapshots, never the live product row", () => {
  it("student order history does not join products or product_variants", () => {
    expect(studentOrdersQuery).toContain("order_items(product_name, variant_size)");
    expect(studentOrdersQuery).not.toContain("products(");
    expect(studentOrdersQuery).not.toContain("product_variants(");
  });

  it("vendor order history does not join products or product_variants", () => {
    expect(vendorOrdersQuery).toContain("order_items(product_name, variant_size, quantity)");
    expect(vendorOrdersQuery).not.toContain("products(");
    expect(vendorOrdersQuery).not.toContain("product_variants(");
  });
});

describe("hiding a product removes it from the student catalogue", () => {
  it("the public catalogue RPC filters on is_active", () => {
    expect(catalogRpc).toContain("where p.is_active");
  });

  it("the hide action toggles exactly that column through the existing update path", () => {
    const hide = /export async function setManagedProductVisibility[\s\S]*?\n}/.exec(catalog)?.[0] ?? "";

    expect(hide).toContain('.from("products")');
    expect(hide).toContain("update({ is_active: input.isActive })");
    expect(hide).toContain('.eq("vendor_id", context.vendorId)');
    expect(hide).not.toContain(".delete(");
    expect(hide).not.toContain("storage");
  });

  it("relies on the pre-existing vendor update policy rather than a new one", () => {
    expect(baseMigration).toContain('create policy "vendor staff update products" on public.products for update to authenticated using (private.is_vendor_staff(vendor_id))');
  });
});
