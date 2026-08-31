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
    /** PostgREST returns the patched rows when the write asks for a representation. */
    updatedRows: [{ id: "product-1" }] as Array<{ id: string }>,
    removedPaths: [] as string[][],
    removeError: null as { message: string } | null,
    deleteError: null as { message: string } | null,
  };

  function tableBuilder(resolveFor: (deleted: boolean, updated?: boolean) => unknown) {
    const state = { deleted: false, updated: false };
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      in: () => builder,
      insert: () => builder,
      update: () => {
        state.updated = true;
        return builder;
      },
      delete: () => {
        state.deleted = true;
        return builder;
      },
      maybeSingle: () => Promise.resolve(resolveFor(state.deleted, state.updated)),
      single: () => Promise.resolve(resolveFor(state.deleted, state.updated)),
      then: (onFulfilled: any, onRejected: any) => Promise.resolve(resolveFor(state.deleted, state.updated)).then(onFulfilled, onRejected),
    };
    return builder;
  }

  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "staff-1" } }, error: null }),
    },
    from: (table: string) => {
      // vendorContext() reads vendor_staff as an ordered, limited LIST — the table is keyed
      // (vendor_id, user_id), so one user can staff several vendors — hence an array here.
      if (table === "vendor_staff") return tableBuilder(() => ({ data: [{ vendor_id: "vendor-1" }], error: null }));
      if (table === "vendors") return tableBuilder(() => ({ data: { school_id: "school-1" }, error: null }));
      if (table === "products") {
        return tableBuilder((deleted, updated) =>
          deleted
            ? { data: scenario.deletedRows, error: scenario.deleteError }
            : updated
              ? { data: scenario.updatedRows, error: null }
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

const { deleteManagedProduct, ProductDeleteBlockedError, ProductDeleteFailedError, setManagedProductVisibility, VendorFacingError } = await import("@/lib/supabaseCatalog");

/** The exact error the recursive delete policy produced in production before the fix. */
const RECURSION_ERROR = {
  message: 'infinite recursion detected in policy for relation "products"',
  code: "42P17",
  details: "",
  hint: "",
};

/** Resolves with the thrown error, or fails loudly if the call unexpectedly succeeded. */
async function captureError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (thrown) {
    return thrown as Error;
  }
  throw new Error("expected the deletion to be rejected, but it resolved");
}

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

// CASE 1 — a brand-new product, created moments ago, with no orders and no uploaded photo.
// This is the case the recursive policy broke: it was refused exactly like an order-linked one.
describe("deleteManagedProduct — brand-new product with zero order history", () => {
  it("deletes it instead of claiming it is order-linked", async () => {
    harness.scenario.productRow = { id: "new-product", image_path: null };
    harness.scenario.deletedRows = [{ id: "new-product" }];

    // `imageRemoved: true` means nothing was left behind — here there was no image to begin with.
    await expect(deleteManagedProduct({ id: "new-product" })).resolves.toEqual({ imageRemoved: true });
  });

  it("makes no storage call when the product never had a stored image", async () => {
    harness.scenario.productRow = { id: "new-product", image_path: null };
    harness.scenario.deletedRows = [{ id: "new-product" }];

    await deleteManagedProduct({ id: "new-product" });

    expect(harness.scenario.removedPaths).toEqual([]);
  });

  it("leaves an externally hosted image alone rather than trying to delete a URL", async () => {
    harness.scenario.productRow = { id: "new-product", image_path: "https://cdn.example/photo.jpg" };
    harness.scenario.deletedRows = [{ id: "new-product" }];

    // Deletion still succeeds; `imageRemoved: false` flags that a hosted image was left in place.
    await expect(deleteManagedProduct({ id: "new-product" })).resolves.toEqual({ imageRemoved: false });
    expect(harness.scenario.removedPaths).toEqual([]);
  });
});

// CASE 4 — an unexpected database fault must never be dressed up as a policy refusal, and its
// raw Postgres text must never reach a vendor.
describe("deleteManagedProduct — unexpected database errors stay safe", () => {
  it("reports a vendor-safe message instead of raw Postgres internals", async () => {
    harness.scenario.deleteError = RECURSION_ERROR;

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toBeInstanceOf(ProductDeleteFailedError);
  });

  it("never leaks the SQLSTATE text, policy name, or relation name", async () => {
    harness.scenario.deleteError = RECURSION_ERROR;

    const error = await captureError(deleteManagedProduct({ id: "product-1" }));

    expect(error.message).not.toMatch(/infinite recursion/i);
    expect(error.message).not.toMatch(/policy for relation/i);
    expect(error.message).not.toMatch(/42P17/);
    expect(error.message).not.toContain(RECURSION_ERROR.message);
  });

  it("preserves the underlying error as `cause` for diagnostics", async () => {
    harness.scenario.deleteError = RECURSION_ERROR;

    const error = await captureError(deleteManagedProduct({ id: "product-1" }));

    expect(error.cause).toEqual(RECURSION_ERROR);
  });

  it("does not offer the order-history explanation for a fault that is not a refusal", async () => {
    harness.scenario.deleteError = RECURSION_ERROR;

    const error = await captureError(deleteManagedProduct({ id: "product-1" }));

    expect(error).not.toBeInstanceOf(ProductDeleteBlockedError);
    expect(error.message).not.toMatch(/student order/i);
  });

  it("keeps the stored image when the delete errored", async () => {
    harness.scenario.deleteError = RECURSION_ERROR;

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow();

    expect(harness.scenario.removedPaths).toEqual([]);
  });

  it("keeps a failed lookup safe too", async () => {
    harness.scenario.productRow = null;

    const error = await captureError(deleteManagedProduct({ id: "product-1" }));

    expect(error).toBeInstanceOf(VendorFacingError);
    expect(error.message).toMatch(/no longer available/i);
  });
});

// Every error the UI renders verbatim must be one we wrote.
describe("vendor-facing error contract", () => {
  it("marks both delete outcomes as safe to display", async () => {
    harness.scenario.deletedRows = [];
    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toBeInstanceOf(VendorFacingError);

    harness.scenario.deleteError = RECURSION_ERROR;
    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toBeInstanceOf(VendorFacingError);
  });

  it("still identifies the refusal specifically so the UI can offer the hide action", async () => {
    harness.scenario.deletedRows = [];

    const error = await captureError(deleteManagedProduct({ id: "product-1" }));

    expect(error).toBeInstanceOf(ProductDeleteBlockedError);
    expect(error).toBeInstanceOf(VendorFacingError);
  });
});
