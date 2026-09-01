import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pickupQrAltText, pickupQrFilename, pickupQrPayload } from "./pickupQr";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const code = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const ORDER = "CW-B6F24BB318";

// -------------------------------------------------------------------------------------------
describe("QR payload carries the order number and nothing else", () => {
  it("encodes exactly the order number", () => {
    expect(pickupQrPayload(ORDER)).toBe(ORDER);
    expect(pickupQrPayload(`  ${ORDER}  `)).toBe(ORDER);
  });

  it("encodes no student identity, contact detail or token", () => {
    const payload = pickupQrPayload(ORDER);
    for (const forbidden of ["@", "student", "email", "uuid", "token", "jwt", "Bearer", "eyJ"]) {
      expect(payload.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
    // A bare order number, not a URL that could carry query parameters.
    expect(payload).not.toMatch(/^https?:/);
    expect(payload).toMatch(/^CW-[0-9A-F]+$/);
  });

  it("names the order in the alt text so the image is meaningful without sight", () => {
    expect(pickupQrAltText(ORDER)).toBe(`Pickup QR code for order ${ORDER}`);
  });

  it("keeps personal data out of the download filename", () => {
    expect(pickupQrFilename(ORDER)).toBe(`CampusWear-${ORDER}.png`);
    expect(pickupQrFilename(ORDER)).not.toMatch(/@|student|email|uuid/i);
  });
});

describe("the QR is produced locally, so a saved image survives a dead connection", () => {
  const helper = code("./pickupQr.ts");

  it("performs no network call to build the code", () => {
    expect(helper).not.toMatch(/\bfetch\(|XMLHttpRequest|axios|supabase/i);
  });

  it("renders to a canvas and exports PNG for download", () => {
    expect(helper).toContain('canvas.toDataURL("image/png")');
    expect(helper).toContain("getContext(\"2d\")");
  });

  it("keeps the spec quiet zone, or scanners cannot find the symbol", () => {
    expect(helper).toContain("QUIET_ZONE");
  });
});

describe("the student card is honest about what works offline", () => {
  const component = code("../components/campuswear/PickupCode.tsx");

  it("tells the student to save the image and says the saved image opens offline", () => {
    expect(component).toContain("the saved image still opens without internet access");
  });

  it("never claims pickup or verification works offline", () => {
    expect(component).not.toMatch(/pickup works offline|verif\w* offline|works without internet\b(?!.*saved)/i);
  });

  it("performs no order mutation — showing a code is not completing an order", () => {
    expect(component).not.toContain("useMutation");
    expect(component).not.toContain("transition_order_status");
  });

  it("labels both actions accessibly", () => {
    expect(component).toContain("aria-label={`Copy pickup code ${orderNumber}`}");
    expect(component).toContain("aria-label={`Download pickup QR code for order ${orderNumber}`}");
  });
});

// -------------------------------------------------------------------------------------------
// Vendor lookup — behavioural, against a faithful PostgREST mock
// -------------------------------------------------------------------------------------------
const harness = vi.hoisted(() => {
  const scenario = {
    /** null models BOTH "no such order" and "another vendor's order": RLS returns zero rows. */
    row: null as any,
    error: null as { message: string } | null,
    selected: "" as string,
    filtered: null as unknown,
  };
  const builder = () => {
    const b: any = {
      select: (cols: string) => { scenario.selected = cols; return b; },
      eq: (_c: string, v: unknown) => { scenario.filtered = v; return b; },
      maybeSingle: () => Promise.resolve({ data: scenario.row, error: scenario.error }),
    };
    return b;
  };
  return {
    scenario,
    client: {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "staff-1" } }, error: null }) },
      from: () => builder(),
    },
  };
});
vi.mock("@/lib/supabase", () => ({ supabase: harness.client, isSupabaseConfigured: true }));
const { lookupPickupOrder } = await import("./supabaseCatalog");

const orderRow = (status: string) => ({
  id: "order-1",
  order_number: ORDER,
  status,
  pickup_location: "Ground Floor",
  order_items: [{ product_name: "BSIT UNI M", variant_size: "S", quantity: 1, line_total_in_centavos: 39900 }],
});

beforeEach(() => {
  harness.scenario.row = orderRow("ready_for_pickup");
  harness.scenario.error = null;
  harness.scenario.selected = "";
  harness.scenario.filtered = null;
});

describe("vendor pickup lookup", () => {
  it("returns a confirmable order when it is ready", async () => {
    const result = await lookupPickupOrder(ORDER);
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.order.orderNumber).toBe(ORDER);
      expect(result.order.pickupLocation).toBe("Ground Floor");
      expect(result.order.items).toEqual([{ productName: "BSIT UNI M", size: "S", quantity: 1, lineTotalInCentavos: 39900 }]);
    }
  });

  it("normalises the typed code, so lower case still matches", async () => {
    await lookupPickupOrder("  cw-b6f24bb318 ");
    expect(harness.scenario.filtered).toBe(ORDER);
  });

  it("treats an unknown order and another vendor's order identically", async () => {
    // RLS filters a foreign order to zero rows, which is the same shape as "does not exist".
    harness.scenario.row = null;
    expect((await lookupPickupOrder(ORDER)).kind).toBe("not_available");
    expect((await lookupPickupOrder("CW-DOESNOTEXIST")).kind).toBe("not_available");
  });

  it("refuses an empty code without touching the database", async () => {
    harness.scenario.filtered = null;
    expect((await lookupPickupOrder("   ")).kind).toBe("not_available");
    expect(harness.scenario.filtered).toBeNull();
  });

  it("reports an in-progress order as not ready, and offers no confirmation", async () => {
    for (const status of ["pending", "confirmed", "preparing"]) {
      harness.scenario.row = orderRow(status);
      expect((await lookupPickupOrder(ORDER)).kind, status).toBe("not_ready");
    }
  });

  it("reports a finished or stopped order as closed", async () => {
    for (const status of ["completed", "cancelled", "rejected"]) {
      harness.scenario.row = orderRow(status);
      expect((await lookupPickupOrder(ORDER)).kind, status).toBe("closed");
    }
  });

  it("selects no student identity — data minimisation is in the query itself", async () => {
    await lookupPickupOrder(ORDER);
    for (const forbidden of ["student_id", "email", "full_name", "profiles"]) {
      expect(harness.scenario.selected).not.toContain(forbidden);
    }
    expect(harness.scenario.selected).toContain("order_number");
    expect(harness.scenario.selected).toContain("pickup_location");
    // The vendor's own commercial figure is fine; it is identity that must stay out.
    expect(harness.scenario.selected).toContain("line_total_in_centavos");
  });

  it("propagates a transport failure rather than pretending the order is missing", async () => {
    harness.scenario.error = { message: "network down" };
    await expect(lookupPickupOrder(ORDER)).rejects.toBeTruthy();
  });
});

// -------------------------------------------------------------------------------------------
describe("confirmation goes through the authoritative transition, unchanged", () => {
  const page = code("../pages/vendor/VendorPickup.tsx");
  const catalog = code("./supabaseCatalog.ts");

  it("completes via transitionVendorOrder, never a direct status write", () => {
    expect(page).toContain('transitionVendorOrder({ orderId: order.id, status: "completed" })');
    expect(page).not.toMatch(/from\("orders"\)[^;]*\.update\(/);
    expect(catalog).toContain('client.rpc("transition_order_status"');
  });

  it("requires an explicit confirmation dialog — scanning alone never completes", () => {
    expect(page).toContain("<AlertDialog");
    expect(page).toContain("Confirm pickup?");
    expect(page).toContain("setPendingConfirm");
    // The scan callback looks the order up; it does not mutate.
    expect(page).toMatch(/result => \{[\s\S]{0,200}runLookup/);
  });

  it("only a ready order is offered a Confirm button", () => {
    expect(page).toContain('const ready = lookup.kind === "found"');
    expect(page).toContain("{ready ? (");
  });

  it("leans on the RPC for double-submission safety rather than client guesswork", () => {
    // transition_order_status locks the row and permits only ready_for_pickup -> completed, so a
    // second phone gets 22023 rather than a duplicate completion.
    const migration = read("../../../supabase/migrations/20260831060000_restore_inventory_on_terminal_orders.sql");
    expect(migration).toContain("for update");
    expect(migration).toContain("(current_order.status = 'ready_for_pickup' and p_new_status in ('completed', 'cancelled'))");
  });

  it("completing does NOT restore inventory, while cancelled and rejected still do", () => {
    const migration = read("../../../supabase/migrations/20260831060000_restore_inventory_on_terminal_orders.sql");
    const guard = /if p_new_status in \(([^)]*)\) then/.exec(migration.replace(/^\s*--.*$/gm, ""))?.[1] ?? "";
    expect(guard).toContain("'cancelled'");
    expect(guard).toContain("'rejected'");
    expect(guard).not.toContain("'completed'");
  });

  it("adds no new RPC and no migration of its own", () => {
    expect(page).not.toMatch(/\.rpc\(/);
    expect(catalog).not.toContain("lookup_pickup_order");
  });
});

// -------------------------------------------------------------------------------------------
describe("scanner safety and accessibility", () => {
  const page = code("../pages/vendor/VendorPickup.tsx");

  it("prefers the rear camera, which is what points at a student's phone", () => {
    expect(page).toContain('preferredCamera: "environment"');
  });

  it("always releases the camera — on stop, on result, and on unmount", () => {
    expect(page).toContain("scannerRef.current?.stop()");
    expect(page).toContain("scannerRef.current?.destroy()");
    expect(page).toContain("useEffect(() => stopScanner, [stopScanner])");
    // Stops before looking up, so no stream runs behind the result card.
    expect(page).toMatch(/stopScanner\(\);\s*void runLookup/);
  });

  it("falls back to manual entry instead of locking the vendor out", () => {
    expect(page).toContain("Camera access is unavailable");
    expect(page).toContain("Enter order number manually");
    expect(page).toContain("hasCamera()");
  });

  it("uses the same lookup for manual entry as for scanning", () => {
    // Two call sites, one function: a separate manual path would be a second place for
    // authorization to drift.
    expect(page).toContain("void runLookup(result.data)");
    expect(page).toContain("void runLookup(manualCode)");
    expect((page.match(/runLookup\(/g) ?? [])).toHaveLength(2);
  });

  it("announces errors and success to assistive tech", () => {
    expect(page).toContain('role="alert"');
    expect(page).toContain('role="status"');
    expect(page).toContain('aria-live="polite"');
  });

  it("labels the camera preview and the manual field", () => {
    expect(page).toContain('aria-label="Camera preview for scanning a pickup QR code"');
    expect(page).toContain('htmlFor="pickup-order-number"');
    expect(page).toContain('id="pickup-order-number"');
  });

  it("never exposes raw database errors to a vendor at a counter", () => {
    expect(page).toContain("Unable to verify this order. Check your connection and try again.");
    expect(page).toContain("error instanceof VendorFacingError");
  });

  it("keeps every control at a real touch size", () => {
    const controls = page.match(/className="[^"]*min-h-12[^"]*"/g) ?? [];
    expect(controls.length).toBeGreaterThanOrEqual(5);
  });
});
