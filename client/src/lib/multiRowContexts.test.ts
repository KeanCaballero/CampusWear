import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Two tables in this schema can legitimately hand back more than one row for the current user, and
 * both were read as if they could not:
 *
 *   carts        UNIQUE (student_id, school_id)   -> one cart PER SCHOOL
 *   vendor_staff PRIMARY KEY (vendor_id, user_id) -> one person can staff SEVERAL vendors
 *
 * `.maybeSingle()` does not return the first row in that situation — PostgREST raises PGRST116. So
 * the cart page, the item count and every quantity change died the moment a student shopped two
 * schools, and the whole vendor workspace died the moment someone staffed two stores. Neither is
 * hypothetical: `get_public_catalog` applies no school filter, and `create_order_from_cart` already
 * loops over every cart the student owns, so the database was always the multi-row one.
 */
const harness = vi.hoisted(() => {
  const scenario = {
    cartIds: ["cart-1"] as string[],
    cartItems: [] as Array<{ variant_id: string; quantity: number }>,
    catalogRows: [] as any[],
    staffRows: [{ vendor_id: "vendor-1" }] as Array<{ vendor_id: string }>,
    /** Every read and write, with the scoping the data layer actually asked for. */
    calls: [] as Array<{ table: string; op: string; cartIds?: unknown; variantId?: string; order?: string; limit?: number }>,
  };

  function builder(table: string) {
    const state: any = { op: "select" };
    const settle = () => {
      scenario.calls.push({ table, op: state.op, cartIds: state.cartIds, variantId: state.variantId, order: state.order, limit: state.limit });
      if (table === "carts") return { data: scenario.cartIds.map(id => ({ id })), error: null };
      if (table === "vendor_staff") {
        // Faithful to PostgREST: .limit(n) truncates server-side.
        const rows = state.limit === undefined ? scenario.staffRows : scenario.staffRows.slice(0, state.limit);
        return { data: rows, error: null };
      }
      if (table === "cart_items") {
        if (state.op === "select") return { data: scenario.cartItems, error: null };
        return { data: [{ variant_id: state.variantId }], error: null };
      }
      if (table === "vendors") return { data: { school_id: "school-1", pickup_location: "Main gate", schools: { timezone: "Asia/Manila" } }, error: null };
      throw new Error(`unexpected table: ${table}`);
    };
    const b: any = {
      select: () => b,
      update: () => { state.op = "update"; return b; },
      delete: () => { state.op = "delete"; return b; },
      eq: (column: string, value: unknown) => { if (column === "variant_id") state.variantId = value; return b; },
      in: (column: string, values: unknown) => { if (column === "cart_id") state.cartIds = values; return b; },
      order: (column: string) => { state.order = column; return b; },
      limit: (n: number) => { state.limit = n; return b; },
      maybeSingle: () => Promise.resolve(settle()),
      single: () => Promise.resolve(settle()),
      then: (ok: any, err: any) => Promise.resolve(settle()).then(ok, err),
    };
    return b;
  }

  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } }, error: null }) },
    from: (table: string) => builder(table),
    rpc: (name: string) => {
      if (name === "get_public_catalog") return Promise.resolve({ data: scenario.catalogRows, error: null });
      throw new Error(`unexpected rpc: ${name}`);
    },
    storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }) }) },
  };

  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: harness.client, isSupabaseConfigured: true }));

const { listCart, updateCartItem, getVendorPickupLocation } = await import("./supabaseCatalog");

const catalogRow = (variantId: string, productId: string, name: string, school: string) => ({
  product_id: productId, product_name: name, product_description: "", image_path: null,
  price_in_centavos: 50000, category_name: null, vendor_name: `${school} store`, school_name: school,
  variant_id: variantId, variant_size: "M", availability: "in_stock",
});

beforeEach(() => {
  harness.scenario.cartIds = ["cart-1"];
  harness.scenario.cartItems = [];
  harness.scenario.catalogRows = [];
  harness.scenario.staffRows = [{ vendor_id: "vendor-1" }];
  harness.scenario.calls = [];
});

describe("a student shopping two schools holds two carts", () => {
  it("reads every cart rather than assuming one", async () => {
    harness.scenario.cartIds = ["cart-north", "cart-south"];
    harness.scenario.cartItems = [
      { variant_id: "v-north", quantity: 1 },
      { variant_id: "v-south", quantity: 2 },
    ];
    harness.scenario.catalogRows = [
      catalogRow("v-north", "p-north", "North PE shirt", "North Campus"),
      catalogRow("v-south", "p-south", "South blazer", "South Campus"),
    ];

    const lines = await listCart();

    expect(lines.map(line => line.productName)).toEqual(["North PE shirt", "South blazer"]);
    const itemRead = harness.scenario.calls.find(call => call.table === "cart_items" && call.op === "select");
    expect(itemRead?.cartIds, "cart_items must be scoped to every cart the student holds").toEqual(["cart-north", "cart-south"]);
  });

  it("does not lose the second school's lines from the total", async () => {
    harness.scenario.cartIds = ["cart-north", "cart-south"];
    harness.scenario.cartItems = [
      { variant_id: "v-north", quantity: 1 },
      { variant_id: "v-south", quantity: 2 },
    ];
    harness.scenario.catalogRows = [
      catalogRow("v-north", "p-north", "North PE shirt", "North Campus"),
      catalogRow("v-south", "p-south", "South blazer", "South Campus"),
    ];

    const lines = await listCart();
    expect(lines).toHaveLength(2);
    expect(lines.reduce((sum, line) => sum + line.unitPriceInCentavos * line.quantity, 0)).toBe(150000);
  });

  it("still treats no cart at all as an empty cart, not an error", async () => {
    harness.scenario.cartIds = [];
    await expect(listCart()).resolves.toEqual([]);
    expect(harness.scenario.calls.some(call => call.table === "cart_items")).toBe(false);
  });

  it("behaves exactly as before for the single-school student", async () => {
    harness.scenario.cartIds = ["cart-1"];
    harness.scenario.cartItems = [{ variant_id: "v1", quantity: 3 }];
    harness.scenario.catalogRows = [catalogRow("v1", "p1", "PE shirt", "Only Campus")];

    const lines = await listCart();
    expect(lines).toEqual([expect.objectContaining({ variantId: "v1", quantity: 3, productName: "PE shirt", isUnavailable: false })]);
  });
});

describe("changing a quantity reaches the right cart", () => {
  it("scopes an update across every cart the student holds", async () => {
    harness.scenario.cartIds = ["cart-north", "cart-south"];
    await updateCartItem({ variantId: "v-south", quantity: 2 });

    const write = harness.scenario.calls.find(call => call.table === "cart_items" && call.op === "update");
    expect(write?.cartIds).toEqual(["cart-north", "cart-south"]);
    expect(write?.variantId).toBe("v-south");
  });

  it("scopes a removal the same way", async () => {
    harness.scenario.cartIds = ["cart-north", "cart-south"];
    await updateCartItem({ variantId: "v-north", quantity: 0 });

    const write = harness.scenario.calls.find(call => call.table === "cart_items" && call.op === "delete");
    expect(write?.cartIds).toEqual(["cart-north", "cart-south"]);
    expect(write?.variantId).toBe("v-north");
  });

  it("refuses in the student's language when there is no cart to write to", async () => {
    harness.scenario.cartIds = [];
    await expect(updateCartItem({ variantId: "v1", quantity: 1 })).rejects.toThrow(/no longer available/i);
  });
});

describe("a person who staffs more than one vendor", () => {
  it("gets a working workspace instead of a PGRST116 crash", async () => {
    harness.scenario.staffRows = [{ vendor_id: "vendor-b" }, { vendor_id: "vendor-a" }];
    await expect(getVendorPickupLocation()).resolves.toBe("Main gate");
  });

  it("resolves the assignment deterministically, so the store cannot change between reloads", async () => {
    harness.scenario.staffRows = [{ vendor_id: "vendor-b" }, { vendor_id: "vendor-a" }];
    await getVendorPickupLocation();

    const staffRead = harness.scenario.calls.find(call => call.table === "vendor_staff");
    expect(staffRead?.order, "the assignment must be ordered, not left to row order").toBe("vendor_id");
    expect(staffRead?.limit).toBe(1);
  });

  it("still reports an unassigned account clearly", async () => {
    harness.scenario.staffRows = [];
    await expect(getVendorPickupLocation()).rejects.toThrow(/not assigned to an authorized vendor/i);
  });

  it("is unchanged for the ordinary single-vendor staffer", async () => {
    harness.scenario.staffRows = [{ vendor_id: "vendor-1" }];
    await expect(getVendorPickupLocation()).resolves.toBe("Main gate");
  });
});

describe("the source no longer contains the single-row assumption", () => {
  const source = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("never reads carts as a single row without a school_id predicate", () => {
    // (student_id, school_id) is UNIQUE, so maybeSingle() is correct when school_id is pinned and
    // wrong when it is not. This asserts the distinction rather than banning maybeSingle outright.
    const cartReads = source.match(/from\("carts"\)[^;]*/g) ?? [];
    expect(cartReads.length).toBeGreaterThan(0);
    const unscopedSingleRowReads = cartReads.filter(read => read.includes("maybeSingle()") && !read.includes('eq("school_id"'));
    expect(unscopedSingleRowReads, "a cart read with no school_id must not use maybeSingle()").toEqual([]);
  });

  it("does not read vendor_staff with maybeSingle()", () => {
    expect(source).not.toMatch(/from\("vendor_staff"\)[^;]*maybeSingle\(\)/);
  });

  it("still scopes the per-school cart lookup on add, which is genuinely single-row", () => {
    // addVariantToCart reads (student_id, school_id) — a UNIQUE pair, so maybeSingle is right there.
    expect(source).toMatch(/from\("carts"\)[^;]*eq\("school_id"[^;]*maybeSingle\(\)/);
  });
});
