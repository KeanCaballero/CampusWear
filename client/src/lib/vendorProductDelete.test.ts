import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ORIGINAL_POLICY = "supabase/migrations/20260828130000_add_vendor_product_delete_policy.sql";
const RECURSION_FIX = "supabase/migrations/20260830090000_fix_product_delete_policy_recursion.sql";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("migrations stay append-only", () => {
  it("leaves the original delete-policy migration exactly as it shipped", () => {
    const original = read(ORIGINAL_POLICY);

    // The fix must be a NEW migration. If this file were edited instead, already-migrated
    // databases would silently diverge from the migration history.
    expect(original).toContain('create policy "vendor staff delete products without orders"');
    expect(original).toContain("not exists");
    expect(original).toContain("public.order_items");
    expect(original).toContain("public.product_variants");
    expect(original).not.toContain("product_has_order_history");
  });
});

describe("the recursion fix migration", () => {
  const migration = read(RECURSION_FIX);

  it("moves the order-history check behind a SECURITY DEFINER helper", () => {
    // The subquery re-entered the products policies via product_variants' own SELECT policy.
    // SECURITY DEFINER reads those tables as the owner and also blocks SQL-function inlining,
    // so the cycle cannot be reintroduced by the planner.
    expect(migration).toContain("create or replace function private.product_has_order_history(target_product_id uuid)");
    expect(migration).toContain("security definer");
    expect(migration).toContain("stable");
  });

  it("pins the helper's search_path", () => {
    expect(migration).toMatch(/set search_path = public, auth, pg_temp/);
  });

  it("keeps the order-history predicate semantically identical to the original", () => {
    const original = read(ORIGINAL_POLICY);
    const normalise = (sql: string) =>
      sql
        .split("\n")
        .filter(line => !line.trim().startsWith("--"))
        .join("\n")
        .replace(/\s+/g, " ");

    // Same join, same direction, same existence test — only where it is evaluated changed.
    for (const fragment of ["from public.order_items oi", "join public.product_variants pv on pv.id = oi.variant_id"]) {
      expect(normalise(original)).toContain(fragment);
      expect(normalise(migration)).toContain(fragment);
    }
    expect(normalise(migration)).toContain("where pv.product_id = target_product_id");
  });

  it("grants execute narrowly and never to anon or PUBLIC", () => {
    expect(migration).toContain("revoke all on function private.product_has_order_history(uuid) from public;");
    expect(migration).toContain("grant execute on function private.product_has_order_history(uuid) to authenticated;");
    expect(migration).not.toMatch(/grant execute on function private\.product_has_order_history\(uuid\) to [^;]*anon/);
  });

  it("keeps RLS as the security boundary with vendor authorization intact", () => {
    expect(migration).toContain("for delete");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("private.is_vendor_staff(vendor_id)");
    expect(migration).toContain("not private.product_has_order_history(id)");
  });

  it("does not disable RLS, force-enable bypass, or widen any other policy", () => {
    expect(migration).not.toMatch(/disable row level security/i);
    expect(migration).not.toMatch(/bypassrls/i);
    expect(migration).not.toMatch(/to (anon|public)\b/i);
    // Only the delete policy is touched.
    expect(migration.match(/create policy/gi)).toHaveLength(1);
  });

  it("does not touch checkout or fulfillment functions", () => {
    expect(migration).not.toContain("create_order_from_cart");
    expect(migration).not.toContain("transition_order_status");
  });
});

describe("delete confirmation UI", () => {
  const page = read("client/src/pages/vendor/VendorProducts.tsx");

  it("renders a confirmation-gated delete action", () => {
    expect(page).toContain("AlertDialogTrigger");
    expect(page).toContain("Delete product");
    expect(page).toContain("deleteManagedProduct");
  });

  it("no longer tells every vendor their product cannot be deleted", () => {
    // The old copy asserted the blocked outcome unconditionally, including for brand-new
    // products with no orders at all.
    expect(page).not.toContain("Products referenced by an order cannot be deleted; hide them instead");
  });

  it("states the order-history rule conditionally instead of as a verdict", () => {
    expect(page).toContain("if this is one of them");
    expect(page).toContain("order history stays intact");
  });

  it("does not decide deletability on the client", () => {
    // The database is authoritative. No client-side order-history lookup may gate the action.
    expect(page).not.toMatch(/hasOrderHistory|orderCount|isDeletable/);
  });
});
