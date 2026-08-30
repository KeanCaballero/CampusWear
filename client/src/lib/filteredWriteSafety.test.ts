import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Production-hardening regression: an RLS-filtered UPDATE or DELETE must never look like success.
 *
 * PostgREST answers 200 with an empty array when a write matches no rows. Without asking for a
 * representation the caller cannot tell that apart from a real change, so the UI showed a success
 * toast, invalidated the query, and refetched the unchanged row. This repo had already fixed that
 * three times — product delete, notification mark-as-read, announcement update/withdraw — and this
 * file covers the remaining write paths found by the final audit.
 *
 * INSERT is deliberately absent: an RLS-blocked insert raises 42501 rather than matching zero rows,
 * so it already surfaces as a real error.
 */
const harness = vi.hoisted(() => {
  const scenario = {
    /** false models the filtered write: 200 with zero rows and no error. */
    writeMatchesRow: true,
    writeError: null as { message: string; code?: string } | null,
    productRow: { id: "product-1", image_path: "vendor-1/p.jpg" } as Record<string, unknown> | null,
    /** PostgREST returns the student's carts as an array — one per school. */
    cartIds: ["cart-1"] as string[],
    calls: [] as Array<{ table: string; op: string; selected?: string }>,
  };

  const selectResultFor = (table: string) =>
    table === "vendors" ? { school_id: "school-1", schools: { timezone: "Asia/Manila" } } : scenario.productRow;

  function builder(table: string) {
    const state = { op: "select", selected: undefined as string | undefined };
    const settle = () => {
      if (state.op === "select") return { data: selectResultFor(table), error: null };
      scenario.calls.push({ table, op: state.op, selected: state.selected });
      return { data: scenario.writeMatchesRow ? [{ id: "product-1", variant_id: "variant-1" }] : [], error: scenario.writeError };
    };
    const b: any = {
      select: (cols: string) => { if (state.op !== "select") state.selected = cols; return b; },
      update: () => { state.op = "update"; return b; },
      delete: () => { state.op = "delete"; return b; },
      eq: () => b,
      in: () => b,
      order: () => b,
      maybeSingle: () => Promise.resolve(state.op === "select" ? { data: selectResultFor(table), error: null } : settle()),
      single: () => Promise.resolve(settle()),
      then: (ok: any, err: any) => Promise.resolve(settle()).then(ok, err),
    };
    return b;
  }

  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "user-1" } }, error: null }) },
    from: (table: string) => {
      // vendorContext() reads vendor_staff as an ordered, limited LIST: the table is keyed
      // (vendor_id, user_id), so one user can staff several vendors.
      if (table === "vendor_staff") { const b: any = { select: () => b, eq: () => b, order: () => b, limit: () => b, then: (ok: any, err: any) => Promise.resolve({ data: [{ vendor_id: "vendor-1" }], error: null }).then(ok, err) }; return b; }
      // vendors is both read (vendorContext) and written (setVendorAuthorization), so it must use
      // the generic builder rather than a bespoke object that would swallow .update().
      if (table === "vendors") return builder("vendors");
      if (table === "carts") { const b: any = { select: () => b, eq: () => b, then: (ok: any, err: any) => Promise.resolve({ data: scenario.cartIds.map(id => ({ id })), error: null }).then(ok, err) }; return b; }
      return builder(table);
    },
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), remove: () => Promise.resolve({ error: null }), getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }) }) },
  };

  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: harness.client, isSupabaseConfigured: true }));

const {
  setManagedProductVisibility,
  updateManagedProduct,
  updateVendorInventory,
  setVendorAuthorization,
  updateCartItem,
  VendorFacingError,
  UserFacingError,
} = await import("@/lib/supabaseCatalog");

const capture = async (promise: Promise<unknown>) => {
  try { await promise; } catch (error) { return error; }
  throw new Error("expected a rejection, but the write reported success");
};

beforeEach(() => {
  harness.scenario.writeMatchesRow = true;
  harness.scenario.writeError = null;
  harness.scenario.productRow = { id: "product-1", image_path: "vendor-1/p.jpg" };
  harness.scenario.cartIds = ["cart-1"];
  harness.scenario.calls = [];
});

describe("every guarded write asks PostgREST for a representation", () => {
  const cases: Array<[string, () => Promise<unknown>, string]> = [
    ["setManagedProductVisibility", () => setManagedProductVisibility({ id: "product-1", isActive: false }), "id"],
    ["updateManagedProduct", () => updateManagedProduct({ id: "product-1", name: "Name", description: "A description", priceInCentavos: 1000, isActive: true }), "id"],
    ["updateVendorInventory", () => updateVendorInventory({ variantId: "variant-1", quantity: 3, lowStockThreshold: 1 }), "variant_id"],
    ["setVendorAuthorization", () => setVendorAuthorization({ vendorId: "vendor-1", isAuthorized: true }), "id"],
  ];

  for (const [name, run, column] of cases) {
    it(`${name} selects "${column}" after writing`, async () => {
      await run();
      const write = harness.scenario.calls.find(c => c.op === "update");
      expect(write, `${name} issued no update`).toBeDefined();
      expect(write?.selected).toBe(column);
    });
  }
});

describe("a filtered write is reported as a failure, not a success", () => {
  it("setManagedProductVisibility — the fallback offered when a delete is refused", async () => {
    harness.scenario.writeMatchesRow = false;
    const error = await capture(setManagedProductVisibility({ id: "product-1", isActive: false }));
    expect(error).toBeInstanceOf(VendorFacingError);
    // The vendor must not be told a product is hidden while students can still buy it.
    expect((error as Error).message).toContain("could not be hidden");
  });

  it("setManagedProductVisibility — restoring visibility", async () => {
    harness.scenario.writeMatchesRow = false;
    const error = await capture(setManagedProductVisibility({ id: "product-1", isActive: true }));
    expect((error as Error).message).toContain("could not be made visible");
  });

  it("updateManagedProduct", async () => {
    harness.scenario.writeMatchesRow = false;
    const error = await capture(updateManagedProduct({ id: "product-1", name: "Name", description: "A description", priceInCentavos: 1000, isActive: true }));
    expect(error).toBeInstanceOf(VendorFacingError);
    expect((error as Error).message).toContain("could not be updated");
  });

  it("updateVendorInventory — the vendor's core daily action", async () => {
    harness.scenario.writeMatchesRow = false;
    const error = await capture(updateVendorInventory({ variantId: "variant-1", quantity: 5, lowStockThreshold: 2 }));
    expect(error).toBeInstanceOf(VendorFacingError);
    expect((error as Error).message).toContain("could not be updated");
  });

  it("setVendorAuthorization — a school admin must not believe a vendor was authorized", async () => {
    harness.scenario.writeMatchesRow = false;
    const error = await capture(setVendorAuthorization({ vendorId: "vendor-1", isAuthorized: true }));
    expect(error).toBeInstanceOf(VendorFacingError);
    expect((error as Error).message).toContain("authorization could not be changed");
  });

  it("updateCartItem — changing a quantity", async () => {
    harness.scenario.writeMatchesRow = false;
    const error = await capture(updateCartItem({ variantId: "variant-1", quantity: 3 }));
    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as Error).message).toContain("no longer in your cart");
  });

  it("updateCartItem — removing a line at quantity zero", async () => {
    harness.scenario.writeMatchesRow = false;
    const error = await capture(updateCartItem({ variantId: "variant-1", quantity: 0 }));
    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as Error).message).toContain("no longer in your cart");
  });
});

describe("a write that really changed a row still succeeds", () => {
  it("resolves for every guarded path when a row comes back", async () => {
    harness.scenario.writeMatchesRow = true;
    await expect(setManagedProductVisibility({ id: "product-1", isActive: false })).resolves.toBeUndefined();
    await expect(updateManagedProduct({ id: "product-1", name: "Name", description: "A description", priceInCentavos: 1000, isActive: true })).resolves.toBeUndefined();
    await expect(updateVendorInventory({ variantId: "variant-1", quantity: 3, lowStockThreshold: 1 })).resolves.toBeUndefined();
    await expect(setVendorAuthorization({ vendorId: "vendor-1", isAuthorized: true })).resolves.toBeUndefined();
    await expect(updateCartItem({ variantId: "variant-1", quantity: 3 })).resolves.toBeUndefined();
  });
});

describe("the guard does not replace RLS", () => {
  it("adds no client-side vendor predicate to the product update", async () => {
    const catalog = await import("node:fs").then(fs =>
      fs.readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8"));
    const start = catalog.indexOf("export async function updateManagedProduct");
    const fn = catalog.slice(start, catalog.indexOf("export async function", start + 10));
    // Vendor ownership is enforced by the products UPDATE policy; a client filter here would be
    // security theatre and would mask a policy problem rather than surface it.
    expect(fn).not.toContain("vendor_id");
    expect(fn).toContain('.select("id")');
  });

  it("still throws the real error when the database genuinely fails", async () => {
    harness.scenario.writeError = { message: "connection reset", code: "08006" };
    const error = await capture(updateVendorInventory({ variantId: "variant-1", quantity: 1, lowStockThreshold: 1 }));
    // An unexpected fault must stay unexpected, not be dressed up as a friendly refusal.
    expect(error).not.toBeInstanceOf(VendorFacingError);
    expect((error as { code: string }).code).toBe("08006");
  });
});
