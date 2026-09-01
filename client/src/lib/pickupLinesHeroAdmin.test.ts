import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const code = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const sql = (rel: string) => read(rel).replace(/^\s*--.*$/gm, "");

// -------------------------------------------------------------------------------------------
// 1. Vendor pickup shows each line the way the student's own order page shows it
// -------------------------------------------------------------------------------------------
describe("vendor pickup item lines carry size, quantity and price", () => {
  const page = code("../pages/vendor/VendorPickup.tsx");
  const catalog = code("./supabaseCatalog.ts");
  const orders = code("../pages/Orders.tsx");

  it("selects the line total, so a price can be shown at all", () => {
    const select = /\.select\("id, order_number, status, pickup_location, order_items\(([^)]*)\)"\)/.exec(catalog)?.[1] ?? "";
    expect(select).toContain("product_name");
    expect(select).toContain("variant_size");
    expect(select).toContain("quantity");
    expect(select).toContain("line_total_in_centavos");
  });

  it("still selects no student identity — adding a price must not widen the query", () => {
    const select = /\.from\("orders"\)\s*\.select\("([^"]*)"\)\s*\.eq\("order_number"/.exec(catalog)?.[1] ?? "";
    expect(select).not.toBe("");
    for (const forbidden of ["student_id", "email", "full_name", "profiles"]) {
      expect(select).not.toContain(forbidden);
    }
  });

  it("carries the line total onto the mapped item", () => {
    expect(catalog).toContain("lineTotalInCentavos: item.line_total_in_centavos ?? 0");
    expect(catalog).toMatch(/PickupOrderItem = \{[^}]*lineTotalInCentavos: number/);
  });

  it("renders name, then size and quantity, then price — matching the student's order card", () => {
    expect(page).toContain("Size {item.size} · <span className=\"tabular-nums\">Qty × {item.quantity}</span>");
    expect(page).toContain("{formatPeso(item.lineTotalInCentavos)}");
    // The student page is the reference. If its markup changes, this pairing should be revisited.
    expect(orders).toContain("Size {item.size} · <span className=\"tabular-nums\">Qty × {item.quantity}</span>");
    expect(orders).toContain("{formatPeso(item.lineTotalInCentavos)}");
  });

  it("puts the quantity on its own line rather than crushing it against the name", () => {
    // The old single-line form read "BSIT UNI M   Size L · x1" with no price at all.
    expect(page).not.toContain("Size {item.size} · ×{item.quantity}");
  });

  it("keeps money right-aligned and non-shrinking on a narrow phone", () => {
    expect(page).toMatch(/shrink-0[^"]*tabular-nums[^"]*">\{formatPeso\(item\.lineTotalInCentavos\)\}/);
  });
});

// -------------------------------------------------------------------------------------------
// 2. The student hero wears the CampusWear mark, not a stock mortarboard
// -------------------------------------------------------------------------------------------
describe("student hero eyebrow uses the real brand mark", () => {
  const page = code("../pages/StudentHome.tsx");

  it("renders the CampusWear mark", () => {
    expect(page).toContain("<CampusWearMark");
    expect(page).toContain('from "@/components/campuswear/BrandMark"');
  });

  it("no longer renders the generic graduation cap, nor imports it", () => {
    expect(page).not.toContain("GraduationCap");
  });

  it("uses the mono lockup so the mark takes the eyebrow's gold", () => {
    // The colour lockup is navy-on-blue and would vanish against this navy hero.
    expect(page).toMatch(/<CampusWearMark\s+variant="mono"/);
  });

  it("hides the decorative mark from readers, which already hear \"CampusWear\" in the line", () => {
    expect(page).toMatch(/aria-hidden="true"[\s\S]{0,80}<CampusWearMark/);
  });
});

// -------------------------------------------------------------------------------------------
// 3. The platform account directory RPC returns rows instead of raising 42804
// -------------------------------------------------------------------------------------------
describe("list_platform_accounts migration", () => {
  const migration = sql("../../../supabase/migrations/20260901090000_fix_list_platform_accounts_email_type.sql");

  it("casts the varchar email to text, which is the whole defect", () => {
    expect(migration).toContain("u.email::text");
  });

  it("keeps the platform-administrator gate ahead of any row read", () => {
    expect(migration).toContain("not private.is_platform_admin()");
    expect(migration).toContain("errcode = '42501'");
    const gate = migration.indexOf("is_platform_admin");
    const firstRead = migration.indexOf("return query");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(firstRead);
  });

  it("stays SECURITY DEFINER with a pinned search_path", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public, private, auth, pg_temp");
  });

  it("keeps the 100-row cap", () => {
    expect(migration).toContain("limit 100");
  });

  it("changes no grant, policy, role or row", () => {
    expect(migration).not.toMatch(/\bgrant\b/i);
    expect(migration).not.toMatch(/\brevoke\b/i);
    expect(migration).not.toMatch(/\b(create|alter|drop)\s+policy\b/i);
    expect(migration).not.toMatch(/\b(insert into|update\s+\w+\s+set|delete from)\b/i);
    expect(migration).not.toMatch(/\bservice_role\b/);
  });

  it("touches only this one function", () => {
    expect((migration.match(/create or replace function/gi) ?? [])).toHaveLength(1);
    expect(migration).toContain("public.list_platform_accounts");
    expect(migration).not.toContain("list_platform_team_members");
  });
});
