import { beforeEach, describe, expect, it, vi } from "vitest";

// Behavioral coverage for the vendor product deletion contract.
//
// The database stays authoritative: the RLS delete policy on public.products filters out
// products that order history still references. A filtered delete is NOT an error — PostgREST
// returns success with zero rows — so these tests pin the two outcomes that matter:
//   1. no order history  -> the row comes back, deletion is real, the stored image is cleaned up
//   2. has order history -> zero rows come back, deletion is refused, the image is left alone
const harness = vi.hoisted(() => {
  const scenario = {
    productRow: { id: "product-1", image_path: "vendor-1/product-1/photo.jpg" } as { id: string; image_path: string | null } | null,
    deletedRows: [] as Array<{ id: string }>,
    removedPaths: [] as string[][],
    removeError: null as { message: string } | null,
    deleteError: null as { message: string } | null,
  };

  function tableBuilder(resolveFor: (deleted: boolean) => unknown) {
    const state = { deleted: false };
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => {
        state.deleted = true;
        return builder;
      },
      maybeSingle: () => Promise.resolve(resolveFor(state.deleted)),
      single: () => Promise.resolve(resolveFor(state.deleted)),
      then: (onFulfilled: any, onRejected: any) => Promise.resolve(resolveFor(state.deleted)).then(onFulfilled, onRejected),
    };
    return builder;
  }

  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "staff-1" } }, error: null }),
    },
    from: (table: string) => {
      if (table === "vendor_staff") return tableBuilder(() => ({ data: { vendor_id: "vendor-1" }, error: null }));
      if (table === "vendors") return tableBuilder(() => ({ data: { school_id: "school-1" }, error: null }));
      if (table === "products") {
        return tableBuilder(deleted =>
          deleted
            ? { data: scenario.deletedRows, error: scenario.deleteError }
            : { data: scenario.productRow, error: null },
        );
      }
      throw new Error(`unexpected table: ${table}`);
    },
    storage: {
      from: () => ({
        remove: (paths: string[]) => {
          scenario.removedPaths.push(paths);
          return Promise.resolve({ error: scenario.removeError });
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
        upload: () => Promise.resolve({ error: null }),
      }),
    },
  };

  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({
  supabase: harness.client,
  isSupabaseConfigured: true,
}));

const { deleteManagedProduct, ProductDeleteBlockedError, setManagedProductVisibility } = await import("@/lib/supabaseCatalog");

beforeEach(() => {
  harness.scenario.productRow = { id: "product-1", image_path: "vendor-1/product-1/photo.jpg" };
  harness.scenario.deletedRows = [];
  harness.scenario.removedPaths = [];
  harness.scenario.removeError = null;
  harness.scenario.deleteError = null;
});

describe("deleteManagedProduct — product with no order history", () => {
  it("permanently deletes the product and removes its stored image", async () => {
    harness.scenario.deletedRows = [{ id: "product-1" }];

    await expect(deleteManagedProduct({ id: "product-1" })).resolves.toEqual({ imageRemoved: true });
    expect(harness.scenario.removedPaths).toEqual([["vendor-1/product-1/photo.jpg"]]);
  });

  it("reports the image as not removed when storage cleanup fails, but still counts as deleted", async () => {
    harness.scenario.deletedRows = [{ id: "product-1" }];
    harness.scenario.removeError = { message: "storage unavailable" };

    await expect(deleteManagedProduct({ id: "product-1" })).resolves.toEqual({ imageRemoved: false });
  });
});

describe("deleteManagedProduct — product referenced by an order", () => {
  it("refuses the deletion instead of reporting success", async () => {
    harness.scenario.deletedRows = [];

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toBeInstanceOf(ProductDeleteBlockedError);
  });

  it("does NOT remove the stored product image when the deletion was blocked", async () => {
    harness.scenario.deletedRows = [];

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow();
    expect(harness.scenario.removedPaths).toEqual([]);
  });

  it("tells the vendor to hide the product so order history stays intact", async () => {
    harness.scenario.deletedRows = [];

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow(/hide it instead/i);
    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow(/order history/i);
  });

  it("carries the product id so the UI can offer the hide action", async () => {
    harness.scenario.deletedRows = [];

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toMatchObject({ productId: "product-1" });
  });
});

describe("deleteManagedProduct — genuine failures stay visible", () => {
  it("surfaces a real database error rather than treating it as a block", async () => {
    harness.scenario.deleteError = { message: "connection lost" };

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.not.toBeInstanceOf(ProductDeleteBlockedError);
    expect(harness.scenario.removedPaths).toEqual([]);
  });

  it("refuses to act on a product outside the vendor's own catalog", async () => {
    harness.scenario.productRow = null;

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow(/no longer available/i);
    expect(harness.scenario.removedPaths).toEqual([]);
  });
});

describe("setManagedProductVisibility — the hide fallback", () => {
  it("deactivates the product without deleting anything", async () => {
    await expect(setManagedProductVisibility({ id: "product-1", isActive: false })).resolves.toBeUndefined();
    expect(harness.scenario.removedPaths).toEqual([]);
  });
});
