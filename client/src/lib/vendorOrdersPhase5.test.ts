import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterVendorOrders, searchVendorOrders } from "./vendorOrderFilters";
import { VendorOrderTransitionControl } from "@/pages/vendor/VendorOrders";


// ---------------------------------------------------------------------------------------------
// I. Safe RPC error handling
//
// transition_order_status raises deliberate, vendor-safe messages (28000 / P0002 / 42501 / 22023).
// supabase-js hands them back as PLAIN OBJECTS, not Error instances, so the page's old
// `error instanceof Error` check replaced every one of them with generic copy.
// ---------------------------------------------------------------------------------------------
const rpcHarness = vi.hoisted(() => {
  const scenario = { rpcError: null as { message: string; code?: string } | null, calls: [] as Array<{ fn: string; params: unknown }> };
  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "staff-1" } }, error: null }) },
    rpc: (fn: string, params: unknown) => {
      scenario.calls.push({ fn, params });
      return Promise.resolve({ data: null, error: scenario.rpcError });
    },
  };
  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: rpcHarness.client, isSupabaseConfigured: true }));

const raw = readFileSync(new URL("../pages/vendor/VendorOrders.tsx", import.meta.url), "utf8");
// Comments explain the JSX-transform and label decisions. Assertions about what the page EXECUTES
// read the stripped source, never the prose.
const page = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const order = (over: Partial<any> = {}): any => ({
  id: "o1",
  orderNumber: "CW-1001",
  status: "pending",
  pickupStatus: "scheduled",
  pickupLocation: "Main campus bookstore",
  placedAt: "2026-08-30T01:00:00.000Z",
  completedAt: null,
  totalInCentavos: 45000,
  items: [{ productName: "BSIT Uniform", size: "M", quantity: 2 }],
  ...over,
});

const queue = [
  order({ id: "o1", orderNumber: "CW-1001", status: "pending", items: [{ productName: "BSIT Uniform", size: "M", quantity: 2 }] }),
  order({ id: "o2", orderNumber: "CW-1002", status: "ready_for_pickup", items: [{ productName: "PE Set", size: "L", quantity: 1 }] }),
  order({ id: "o3", orderNumber: "CW-2003", status: "completed", completedAt: "2026-08-30T09:00:00.000Z", items: [{ productName: "Lanyard", size: "One size", quantity: 3 }] }),
];

// A / B / C — search fields
describe("A-C. client-side search matches order number, product name, and size", () => {
  it("A. matches an order number", () => {
    expect(searchVendorOrders(queue, "CW-1002").map(o => o.id)).toEqual(["o2"]);
  });

  it("B. matches a product name", () => {
    expect(searchVendorOrders(queue, "lanyard").map(o => o.id)).toEqual(["o3"]);
  });

  it("C. matches a variant size", () => {
    expect(searchVendorOrders(queue, "One size").map(o => o.id)).toEqual(["o3"]);
  });

  it("is case-insensitive and trims the term", () => {
    expect(searchVendorOrders(queue, "  bsit UNIFORM  ").map(o => o.id)).toEqual(["o1"]);
  });

  it("returns the list untouched for an empty term, so it composes cleanly", () => {
    expect(searchVendorOrders(queue, "")).toBe(queue);
    expect(searchVendorOrders(queue, "   ")).toBe(queue);
  });
});

// D — search combined with the status filter
describe("D. search composes with the existing status filter", () => {
  it("narrows within a status rather than replacing it", () => {
    const readyOnly = filterVendorOrders(queue, "ready_for_pickup");
    expect(searchVendorOrders(readyOnly, "PE Set").map(o => o.id)).toEqual(["o2"]);
    // The same term outside that status yields nothing — the filter still applies.
    expect(searchVendorOrders(readyOnly, "Lanyard")).toHaveLength(0);
  });

  it("leaves filterVendorOrders semantics unchanged", () => {
    expect(filterVendorOrders(queue, "all")).toBe(queue);
    expect(filterVendorOrders(queue, "completed").map(o => o.id)).toEqual(["o3"]);
  });

  it("the page composes status filtering first, then search", () => {
    expect(page).toContain("searchVendorOrders(filterVendorOrders(allOrders, filter), search)");
  });

  it("adds no backend search argument", () => {
    expect(page).toContain("queryFn: listVendorOrders");
    expect(page).not.toMatch(/listVendorOrders\([^)]+\)/);
    expect(page).not.toMatch(/\.limit\(/);
    expect(page.match(/useQuery\(/g)?.length).toBe(1);
  });
});

// E / F — filtered-empty and clearing
describe("E-F. filtered-empty is distinct and escapable", () => {
  it("E. does not reuse the real empty state when filters exclude everything", () => {
    expect(page).toContain('title="No orders match your filters"');
    expect(page).toContain('title="No orders need attention"');
  });

  it("F. offers a clear action that resets both search and status", () => {
    expect(page).toContain("const clearFilters = ()");
    expect(page).toContain('setSearch("")');
    expect(page).toContain('setFilter("all")');
    expect(page).toContain('label: "Clear filters"');
  });

  it("keeps the count announcement live and shows the total once filtering", () => {
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain("filtersActive ? ` of ${allOrders.length}`");
  });

  it("still decides offline and error before any empty state", () => {
    const offline = page.indexOf("isStalledWithoutData(orders)");
    const error = page.indexOf("orders.isError");
    const empty = page.indexOf("orders.data?.length ?");
    expect(offline).toBeGreaterThan(-1);
    expect(offline).toBeLessThan(error);
    expect(error).toBeLessThan(empty);
  });
});

// G — state noun vs action verb
describe("G. status wording distinguishes current state from the action", () => {
  const cases: Array<[string, string]> = [
    ["pending", "Pending"],
    ["confirmed", "Confirmed"],
    ["preparing", "Preparing"],
    ["ready_for_pickup", "Ready for pickup"],
  ];

  for (const [status, noun] of cases) {
    it(`announces "${noun}" as the current state for ${status}`, () => {
      const markup = renderToStaticMarkup(
        createElement(VendorOrderTransitionControl, { status: status as any, isPending: false, onStatusChange: () => undefined }),
      );
      expect(markup).toContain(`Update order status from ${noun}`);
    });
  }

  it("a confirmed order no longer announces the verb form", () => {
    const markup = renderToStaticMarkup(
      createElement(VendorOrderTransitionControl, { status: "confirmed", isPending: false, onStatusChange: () => undefined }),
    );
    expect(markup).toContain("Update order status from Confirmed");
    expect(markup).not.toContain("Update order status from Confirm<");
  });

  it("completed remains terminal with no selector at all", () => {
    const markup = renderToStaticMarkup(
      createElement(VendorOrderTransitionControl, { status: "completed", isPending: false, onStatusChange: () => undefined }),
    );
    expect(markup).toContain('role="status"');
    // "Finalized" read identically for a fulfilled pickup and an abandoned one. The terminal note
    // now names the actual outcome, and still promises nothing beyond it.
    expect(markup).toContain("Completed — no further updates.");
    expect(markup).not.toContain("Update status");
  });

  it("keeps both label maps, with the transition vocabulary unchanged", () => {
    expect(page).toContain("const statusStateLabels");
    expect(page).toContain("const statusActionLabels");
    expect(page).toContain('confirmed: "Confirmed"');
    expect(page).toContain('confirmed: "Confirm"');
    expect(page).toContain("statusStateLabels[status]");
    expect(page).toContain("statusActionLabels[nextStatus]");
  });
});

// H — per-order pending
describe("H. pending state is scoped to the order being transitioned", () => {
  it("gates on the mutation's own variables", () => {
    expect(page).toContain("isPending={update.isPending && update.variables?.orderId === order.id}");
  });

  it("no longer disables every control from a single flag", () => {
    expect(page).not.toContain("isPending={update.isPending}");
  });

  it("an unrelated order stays interactive while another is pending", () => {
    // isPending=false is what a non-matching order receives, and it must still render an ENABLED
    // selector. Assert the real attribute: the class string legitimately contains Tailwind
    // `disabled:` variants, so a bare substring check would always match.
    const markup = renderToStaticMarkup(
      createElement(VendorOrderTransitionControl, { status: "pending", isPending: false, onStatusChange: () => undefined }),
    );
    expect(markup).toContain("Update status");
    expect(markup).not.toContain('disabled=""');
    expect(markup).not.toContain('data-disabled=""');
  });

  it("the order actually being transitioned IS disabled", () => {
    const markup = renderToStaticMarkup(
      createElement(VendorOrderTransitionControl, { status: "pending", isPending: true, onStatusChange: () => undefined }),
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('data-disabled=""');
  });
});

// J — completedAt
describe("J. completedAt is shown only where it exists", () => {
  it("renders the completed date from the real field", () => {
    expect(page).toContain("order.completedAt ?");
    expect(page).toContain("Completed {formatShortDate(order.completedAt)}");
  });

  it("is guarded, so a non-completed order shows nothing", () => {
    expect(page).toContain("{order.completedAt ? <>");
    expect(page).toContain(": null}");
  });

  it("invents no other order field", () => {
    for (const invented of [/order\.studentName/, /order\.customer/, /order\.payment/, /order\.email/, /order\.phone/]) {
      expect(page).not.toMatch(invented);
    }
  });
});

describe("contracts and security are unchanged", () => {
  it("keeps the role gate and RLS-only tenancy", () => {
    expect(page).toContain('allowedRoles={["vendor_staff", "platform_admin", "admin"]}');
    expect(page).not.toMatch(/vendor_id/);
  });

  it("keeps the transition mutation payload exactly", () => {
    expect(page).toContain("update.mutate({ orderId: order.id, status })");
    expect(page).toContain("mutationFn: transitionVendorOrder");
  });

  it("keeps the shared foundation and the radius token", () => {
    expect(page).toContain("<WorkspacePage");
    expect(page).toContain("<WorkspacePanel");
    expect(page).toContain("rounded-[var(--radius)]");
  });
});

describe("I. deliberate RPC refusals reach the vendor; anything else does not", () => {
  beforeEach(() => {
    rpcHarness.scenario.rpcError = null;
    rpcHarness.scenario.calls = [];
  });

  it("calls the RPC with the unchanged parameter names", async () => {
    const { transitionVendorOrder } = await import("@/lib/supabaseCatalog");
    await transitionVendorOrder({ orderId: "order-1", status: "confirmed" });
    expect(rpcHarness.scenario.calls).toEqual([
      { fn: "transition_order_status", params: { p_order_id: "order-1", p_new_status: "confirmed" } },
    ]);
  });

  it("surfaces the authorization refusal verbatim", async () => {
    const { transitionVendorOrder, VendorFacingError } = await import("@/lib/supabaseCatalog");
    rpcHarness.scenario.rpcError = { message: "You are not authorized to update this order", code: "42501" };
    await expect(transitionVendorOrder({ orderId: "order-1", status: "confirmed" }))
      .rejects.toThrow("You are not authorized to update this order");
    const error = await transitionVendorOrder({ orderId: "order-1", status: "confirmed" }).catch(e => e);
    expect(error).toBeInstanceOf(VendorFacingError);
  });

  it("surfaces the illegal-transition refusal verbatim", async () => {
    const { transitionVendorOrder, VendorFacingError } = await import("@/lib/supabaseCatalog");
    rpcHarness.scenario.rpcError = { message: "This order status transition is not allowed", code: "22023" };
    const error = await transitionVendorOrder({ orderId: "order-1", status: "completed" }).catch(e => e);
    expect(error).toBeInstanceOf(VendorFacingError);
    expect((error as Error).message).toBe("This order status transition is not allowed");
  });

  it("does NOT dress up an unexpected fault as vendor-safe copy", async () => {
    const { transitionVendorOrder, VendorFacingError } = await import("@/lib/supabaseCatalog");
    rpcHarness.scenario.rpcError = { message: 'relation "orders" does not exist', code: "42P01" };
    const error = await transitionVendorOrder({ orderId: "order-1", status: "confirmed" }).catch(e => e);
    expect(error).not.toBeInstanceOf(VendorFacingError);
    expect((error as { code: string }).code).toBe("42P01");
  });

  it("the page narrows on VendorFacingError, never on instanceof Error", () => {
    expect(page).toContain("error instanceof VendorFacingError ? error.message :");
    expect(page).not.toMatch(/instanceof Error/);
    expect(page).toContain("The order status could not be updated.");
  });
});
