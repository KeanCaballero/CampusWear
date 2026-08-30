import { beforeEach, describe, expect, it, vi } from "vitest";

// Behavioural coverage for the cart and pickup-request contract.
//
// Two things this suite exists to pin down:
//
//   1. The database is authoritative about stock. create_order_from_cart locks inventory and
//      raises P0001 `Insufficient stock for {product} ({size})`. That product and size are the
//      only way a student can tell which line blocked them, so they must survive the trip to the
//      UI — while the raw Postgres text must NOT.
//
//   2. A cart line whose variant has left the public catalogue must be surfaced, not dropped.
//      Silently hiding it makes items disappear with no explanation.
const harness = vi.hoisted(() => {
  const scenario = {
    cartRow: { id: "cart-1" } as { id: string } | null,
    cartItems: [] as Array<{ variant_id: string; quantity: number }>,
    catalogRows: [] as any[],
    catalogError: null as { message: string } | null,
    writes: [] as Array<{ op: string; payload?: unknown; variantId?: string }>,
    writeError: null as { message: string } | null,
    rpcCalls: [] as Array<{ name: string; args: unknown }>,
    checkoutRows: [] as any[],
    checkoutError: null as { message: string; code?: string } | null,
  };

  function thenable(resolve: () => unknown) {
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        if (column === "variant_id") builder.__variantId = value;
        return builder;
      },
      order: () => builder,
      maybeSingle: () => Promise.resolve(resolve()),
      single: () => Promise.resolve(resolve()),
      then: (ok: any, err: any) => Promise.resolve(resolve()).then(ok, err),
    };
    return builder;
  }

  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } }, error: null }) },
    from: (table: string) => {
      if (table === "carts") return thenable(() => ({ data: scenario.cartRow, error: null }));
      if (table === "cart_items") {
        const builder: any = thenable(() => ({ data: scenario.cartItems, error: null }));
        builder.delete = () => {
          const b = thenable(() => {
            scenario.writes.push({ op: "delete", variantId: b.__variantId });
            return { data: null, error: scenario.writeError };
          });
          return b;
        };
        builder.update = (payload: unknown) => {
          const b = thenable(() => {
            scenario.writes.push({ op: "update", payload, variantId: b.__variantId });
            return { data: null, error: scenario.writeError };
          });
          return b;
        };
        return builder;
      }
      throw new Error(`unexpected table: ${table}`);
    },
    rpc: (name: string, args: unknown) => {
      scenario.rpcCalls.push({ name, args });
      if (name === "get_public_catalog") return Promise.resolve({ data: scenario.catalogRows, error: scenario.catalogError });
      if (name === "create_order_from_cart") return Promise.resolve({ data: scenario.checkoutRows, error: scenario.checkoutError });
      throw new Error(`unexpected rpc: ${name}`);
    },
    storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }) }) },
  };

  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: harness.client, isSupabaseConfigured: true }));

const {
  cartItemCount,
  cartStoreNames,
  cartTotalInCentavos,
  checkoutCart,
  CheckoutFailedError,
  CheckoutStockConflictError,
  groupCartByStore,
  listCart,
  orderableCartLines,
  updateCartItem,
  UserFacingError,
} = await import("@/lib/supabaseCatalog");

const catalogRow = (over: Partial<Record<string, unknown>> = {}) => ({
  product_id: "p1",
  product_name: "BSIT Uniform",
  product_description: "",
  image_path: null,
  price_in_centavos: 39900,
  category_name: null,
  vendor_name: "UC Main Store",
  school_name: "UC",
  variant_id: "v1",
  variant_size: "M",
  availability: "in_stock",
  ...over,
});

async function capture(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (thrown) {
    return thrown as Error;
  }
  throw new Error("expected the call to reject, but it resolved");
}

beforeEach(() => {
  harness.scenario.cartRow = { id: "cart-1" };
  harness.scenario.cartItems = [];
  harness.scenario.catalogRows = [];
  harness.scenario.catalogError = null;
  harness.scenario.writes = [];
  harness.scenario.writeError = null;
  harness.scenario.rpcCalls = [];
  harness.scenario.checkoutRows = [];
  harness.scenario.checkoutError = null;
});

describe("listCart", () => {
  it("returns an empty cart as genuinely empty", async () => {
    harness.scenario.cartItems = [];
    await expect(listCart()).resolves.toEqual([]);
  });

  it("returns an empty list when the student has no cart at all", async () => {
    harness.scenario.cartRow = null;
    await expect(listCart()).resolves.toEqual([]);
  });

  it("maps a live catalogue line with its size, store, price and availability", async () => {
    harness.scenario.cartItems = [{ variant_id: "v1", quantity: 2 }];
    harness.scenario.catalogRows = [catalogRow()];

    const [line] = await listCart();

    expect(line).toMatchObject({
      variantId: "v1",
      productName: "BSIT Uniform",
      size: "M",
      vendorName: "UC Main Store",
      unitPriceInCentavos: 39900,
      quantity: 2,
      availability: "in_stock",
      isUnavailable: false,
    });
  });

  it("KEEPS a line whose variant has left the catalogue instead of dropping it", async () => {
    harness.scenario.cartItems = [{ variant_id: "gone", quantity: 3 }];
    harness.scenario.catalogRows = [];

    const lines = await listCart();

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ variantId: "gone", quantity: 3, isUnavailable: true });
  });

  it("never invents a price or size for an unavailable line", async () => {
    harness.scenario.cartItems = [{ variant_id: "gone", quantity: 3 }];

    const [line] = await listCart();

    expect(line.unitPriceInCentavos).toBe(0);
    expect(line.size).toBeNull();
    expect(line.vendorName).toBeNull();
  });

  it("keeps available and unavailable lines side by side", async () => {
    harness.scenario.cartItems = [{ variant_id: "v1", quantity: 1 }, { variant_id: "gone", quantity: 1 }];
    harness.scenario.catalogRows = [catalogRow()];

    const lines = await listCart();

    expect(lines.map(l => l.isUnavailable)).toEqual([false, true]);
  });
});

describe("totals never count what cannot be ordered", () => {
  const lines = [
    { variantId: "a", productId: "p1", productName: "A", imageUrl: null, size: "M", vendorName: "Store One", unitPriceInCentavos: 1000, quantity: 2, availability: "in_stock" as const, isUnavailable: false },
    { variantId: "b", productId: null, productName: "gone", imageUrl: null, size: null, vendorName: null, unitPriceInCentavos: 0, quantity: 5, availability: "out_of_stock" as const, isUnavailable: true },
    { variantId: "c", productId: "p2", productName: "C", imageUrl: null, size: "L", vendorName: "Store Two", unitPriceInCentavos: 500, quantity: 1, availability: "low_stock" as const, isUnavailable: false },
  ];

  it("excludes unavailable lines from the orderable set", () => {
    expect(orderableCartLines(lines).map(l => l.variantId)).toEqual(["a", "c"]);
  });

  it("excludes them from the money total", () => {
    expect(cartTotalInCentavos(lines)).toBe(2500);
  });

  it("excludes them from the item count", () => {
    expect(cartItemCount(lines)).toBe(3);
  });

  it("lists each distinct store exactly once", () => {
    expect(cartStoreNames(lines)).toEqual(["Store One", "Store Two"]);
  });

  it("groups by store and keeps unavailable lines in their own group", () => {
    const groups = groupCartByStore(lines);
    expect(groups.map(g => g.vendorName)).toEqual(["Store One", null, "Store Two"]);
    expect(groups.find(g => g.vendorName === null)?.lines).toHaveLength(1);
  });

  it("puts two lines from the same store in one group", () => {
    const same = [lines[0], { ...lines[0], variantId: "a2" }];
    expect(groupCartByStore(same)).toHaveLength(1);
  });
});

describe("updateCartItem", () => {
  it("removes the line when the quantity drops to zero", async () => {
    await updateCartItem({ variantId: "v1", quantity: 0 });
    expect(harness.scenario.writes).toEqual([{ op: "delete", variantId: "v1" }]);
  });

  it("clamps to the 10-unit cap so a stale page cannot exceed it", async () => {
    await updateCartItem({ variantId: "v1", quantity: 99 });
    expect(harness.scenario.writes[0]).toMatchObject({ op: "update", payload: { quantity: 10 } });
  });

  it("writes the requested quantity when it is within the cap", async () => {
    await updateCartItem({ variantId: "v1", quantity: 3 });
    expect(harness.scenario.writes[0]).toMatchObject({ op: "update", payload: { quantity: 3 } });
  });

  it("reports a failure in the student's language, not the database's", async () => {
    harness.scenario.writeError = { message: 'null value in column "quantity" violates not-null constraint' };

    const error = await capture(updateCartItem({ variantId: "v1", quantity: 2 }));

    expect(error).toBeInstanceOf(UserFacingError);
    expect(error.message).not.toMatch(/null value|constraint|column/i);
    expect(error.message).toMatch(/could not update that quantity/i);
  });
});

describe("checkoutCart — success", () => {
  it("returns one placed order per vendor", async () => {
    harness.scenario.checkoutRows = [
      { id: "o1", order_number: "CW-AAAAAAAAAA", total_in_centavos: 39900, pickup_location: "Student Center" },
      { id: "o2", order_number: "CW-BBBBBBBBBB", total_in_centavos: 42000, pickup_location: "Student Center" },
    ];

    const orders = await checkoutCart("Student Center");

    expect(orders).toHaveLength(2);
    expect(orders[0]).toEqual({ id: "o1", orderNumber: "CW-AAAAAAAAAA", totalInCentavos: 39900, pickupLocation: "Student Center" });
  });

  it("sends the trimmed pickup location and no invented scheduling fields", async () => {
    await checkoutCart("  Student Center counter  ");

    expect(harness.scenario.rpcCalls[0]).toEqual({
      name: "create_order_from_cart",
      args: { pickup_location_input: "Student Center counter", pickup_at_input: null, pickup_slot_input: null },
    });
  });
});

describe("checkoutCart — stock conflict names the blocking item", () => {
  it("parses the product and size out of the database refusal", async () => {
    harness.scenario.checkoutError = { message: "Insufficient stock for PE Uniform Set (L)", code: "P0001" };

    const error = await capture(checkoutCart("Student Center"));

    expect(error).toBeInstanceOf(CheckoutStockConflictError);
    expect((error as InstanceType<typeof CheckoutStockConflictError>).productName).toBe("PE Uniform Set");
    expect((error as InstanceType<typeof CheckoutStockConflictError>).size).toBe("L");
  });

  it("names the item in the message the student reads", async () => {
    harness.scenario.checkoutError = { message: "Insufficient stock for PE Uniform Set (L)", code: "P0001" };

    const error = await capture(checkoutCart("Student Center"));

    expect(error.message).toContain("PE Uniform Set");
    expect(error.message).toContain("size L");
  });

  it("copes with a product name that itself contains brackets", async () => {
    harness.scenario.checkoutError = { message: "Insufficient stock for BSIT Uniform (Navy) (M)", code: "P0001" };

    const error = await capture(checkoutCart("Student Center"));

    expect((error as InstanceType<typeof CheckoutStockConflictError>).productName).toBe("BSIT Uniform (Navy)");
    expect((error as InstanceType<typeof CheckoutStockConflictError>).size).toBe("M");
  });

  it("still recognises a stock refusal it cannot fully parse", async () => {
    harness.scenario.checkoutError = { message: "insufficient stock", code: "P0001" };

    const error = await capture(checkoutCart("Student Center"));

    expect(error).toBeInstanceOf(CheckoutStockConflictError);
    expect((error as InstanceType<typeof CheckoutStockConflictError>).productName).toBeNull();
    expect(error.message).toMatch(/update your cart/i);
  });

  it("tells the student their cart is untouched, which the transactional RPC guarantees", async () => {
    harness.scenario.checkoutError = { message: "Insufficient stock for PE Uniform Set (L)", code: "P0001" };

    const error = await capture(checkoutCart("Student Center"));

    expect(error.message).toMatch(/place your order again/i);
  });
});

describe("checkoutCart — other failures stay safe", () => {
  it("does not present an unrelated fault as a stock problem", async () => {
    harness.scenario.checkoutError = { message: "could not serialize access due to concurrent update", code: "40001" };

    const error = await capture(checkoutCart("Student Center"));

    expect(error).toBeInstanceOf(CheckoutFailedError);
    expect(error).not.toBeInstanceOf(CheckoutStockConflictError);
  });

  it("never leaks raw Postgres text to the student", async () => {
    harness.scenario.checkoutError = { message: 'infinite recursion detected in policy for relation "orders"', code: "42P17" };

    const error = await capture(checkoutCart("Student Center"));

    expect(error.message).not.toMatch(/infinite recursion|policy for relation|42P17/i);
    expect(error.message).toMatch(/could not place your order/i);
  });

  it("keeps the underlying error as `cause` for diagnostics", async () => {
    const raw = { message: "boom", code: "XX000" };
    harness.scenario.checkoutError = raw;

    const error = await capture(checkoutCart("Student Center"));

    expect(error.cause).toEqual(raw);
  });

  it("marks every checkout failure as safe to display", async () => {
    harness.scenario.checkoutError = { message: "Insufficient stock for A (M)", code: "P0001" };
    await expect(checkoutCart("x")).rejects.toBeInstanceOf(UserFacingError);

    harness.scenario.checkoutError = { message: "boom", code: "XX000" };
    await expect(checkoutCart("x")).rejects.toBeInstanceOf(UserFacingError);
  });
});
