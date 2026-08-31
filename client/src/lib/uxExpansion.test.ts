import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { summarizeVendorAttention, vendorAttentionSummary } from "./vendorAttention";
import { showsPickupCode } from "./orderPresentation";
import { ORDER_STATUSES, type OrderStatus } from "../../../server/campuswear/domain";
import type { VendorInventoryItem } from "./supabaseCatalog";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
/** Comment-free source, so prose can never satisfy an assertion. */
const code = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const item = (size: string, availability: VendorInventoryItem["availability"]): VendorInventoryItem => ({
  variantId: `v-${size}-${availability}`,
  productName: "BSIT Uniform",
  size,
  sku: `SKU-${size}`,
  quantity: availability === "out_of_stock" ? 0 : 2,
  lowStockThreshold: 5,
  availability,
});

// -------------------------------------------------------------------------------------------
describe("vendor low-stock attention", () => {
  it("separates low stock from out of stock", () => {
    const a = summarizeVendorAttention([item("S", "low_stock"), item("M", "out_of_stock"), item("L", "in_stock")]);
    expect(a.lowStock).toHaveLength(1);
    expect(a.outOfStock).toHaveLength(1);
    expect(a.total).toBe(2);
  });

  it("leads with out of stock, the more urgent state", () => {
    const a = summarizeVendorAttention([item("S", "low_stock"), item("M", "out_of_stock")]);
    expect(a.items[0].availability).toBe("out_of_stock");
  });

  it("counts nothing when every size is healthy, and says so honestly", () => {
    const a = summarizeVendorAttention([item("S", "in_stock"), item("M", "in_stock")]);
    expect(a.total).toBe(0);
    expect(vendorAttentionSummary(a)).toBeNull();
  });

  it("is empty-safe", () => {
    for (const input of [[], undefined, null]) {
      const a = summarizeVendorAttention(input as VendorInventoryItem[] | undefined | null);
      expect(a.total).toBe(0);
      expect(vendorAttentionSummary(a)).toBeNull();
    }
  });

  it("summarises both states in one honest sentence", () => {
    const both = summarizeVendorAttention([item("S", "low_stock"), item("M", "out_of_stock")]);
    expect(vendorAttentionSummary(both)).toBe("1 size out of stock · 1 size low in stock");
    const onlyLow = summarizeVendorAttention([item("S", "low_stock"), item("M", "low_stock")]);
    expect(vendorAttentionSummary(onlyLow)).toBe("2 sizes low in stock");
  });

  it("re-derives no threshold — it only reads the availability already computed", () => {
    const helper = code("./vendorAttention.ts");
    expect(helper).not.toMatch(/quantity\s*<=|lowStockThreshold\s*[<>]/);
    expect(helper).toContain('availability === "low_stock"');
    expect(helper).toContain('availability === "out_of_stock"');
  });

  it("adds no query — the split rides on the dashboard fetch that already happened", () => {
    const catalog = code("./supabaseCatalog.ts");
    expect(catalog).toContain("attention: summarizeVendorAttention(inventory)");
    const dashboard = code("../pages/vendor/VendorDashboard.tsx");
    expect(dashboard).toContain("dashboard.data?.attention");
    expect(dashboard).not.toMatch(/useQuery\([^)]*attention/i);
  });
});

// -------------------------------------------------------------------------------------------
describe("pickup code", () => {
  it("appears only once the store has marked the order ready", () => {
    expect(showsPickupCode("ready_for_pickup")).toBe(true);
    for (const status of ORDER_STATUSES.filter(s => s !== "ready_for_pickup") as OrderStatus[]) {
      expect(showsPickupCode(status), status).toBe(false);
    }
  });

  it("reuses order_number and derives no second identifier", () => {
    const component = code("../components/campuswear/PickupCode.tsx");
    expect(component).toContain("{orderNumber}");
    // No slicing, reformatting or hashing into a shorter "code".
    expect(component).not.toMatch(/orderNumber\.(slice|substring|replace|split)/);
  });

  it("renders no QR and implies no scanning flow", () => {
    const component = read("../components/campuswear/PickupCode.tsx");
    expect(component).not.toMatch(/<canvas|qrcode|QRCode|<svg/i);
    // It must not claim the code completes or verifies anything.
    expect(code("../components/campuswear/PickupCode.tsx")).not.toMatch(/scan to (complete|confirm)|mark(ed)? as picked up/i);
  });

  it("exposes no personal data — only the order reference", () => {
    const component = code("../components/campuswear/PickupCode.tsx");
    for (const forbidden of ["studentName", "email", "student_id", "recipient"]) {
      expect(component).not.toContain(forbidden);
    }
  });

  it("is announced accessibly when copied", () => {
    const component = code("../components/campuswear/PickupCode.tsx");
    expect(component).toContain('role="status"');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain("aria-label={`Copy pickup code");
  });
});

// -------------------------------------------------------------------------------------------
describe("size guide invents no measurements", () => {
  // Comment-stripped: the module's doc comment explains WHY chest/length are absent, and that
  // explanation must not be what trips the assertion.
  const component = code("../components/campuswear/SizeGuide.tsx");

  it("states no chest, waist, length or numeric measurement", () => {
    expect(component).not.toMatch(/\bchest\b|\bwaist\b|\bsleeve\b|\bshoulder\b/i);
    // Unit words only. A bare digit-then-quote also matches Tailwind classes such as p-4", which
    // says nothing about measurements.
    expect(component).not.toMatch(/\d+(\.\d+)?\s?(cm|mm|inches|inch)/i);
  });

  it("says who will supply the real measurements, without naming a school it invented", () => {
    expect(component).toContain("Official measurements will be provided by the");
    expect(component).toContain("schoolName");
    expect(component).not.toContain("University of Cebu");
  });

  it("lists only the sizes the product genuinely offers", () => {
    expect(component).toContain("{sizes.map(");
    expect(component).toContain("No sizes have been published for this item yet.");
  });
});

// -------------------------------------------------------------------------------------------
describe("school identity comes from data, never a literal", () => {
  it("no application source hard-codes a university name", () => {
    for (const file of ["../pages/StudentHome.tsx", "../components/campuswear/StudentShell.tsx", "../components/campuswear/SizeGuide.tsx", "../pages/Favorites.tsx"]) {
      expect(read(file), file).not.toContain("University of Cebu");
    }
  });

  it("the student home reads the school name off the loaded catalogue", () => {
    const home = code("../pages/StudentHome.tsx");
    expect(home).toContain("catalog.data?.[0]?.schoolName");
    // Falls back to a generic label rather than inventing a campus.
    expect(home).toContain('"Student workspace"');
  });
});

// -------------------------------------------------------------------------------------------
describe("how it works describes only what the product does", () => {
  const component = code("../components/campuswear/HowItWorks.tsx");

  it("uses the five real steps in order", () => {
    for (const step of ["Browse", "Choose", "Order", "Track", "Collect"]) {
      expect(component).toContain(`title: "${step}"`);
    }
  });

  it("promises no delivery, online payment or scheduling", () => {
    expect(component).not.toMatch(/deliver|ship|pay online|schedule a (slot|time)/i);
    expect(component).toContain("Nothing is paid online");
  });

  it("is an ordered list, since the sequence is real", () => {
    expect(component).toContain("<ol");
  });
});

// -------------------------------------------------------------------------------------------
describe("add-to-cart confirmation", () => {
  const page = code("../pages/ProductDetail.tsx");

  it("fires only from onSuccess, so a failed add can never look successful", () => {
    expect(page).toMatch(/onSuccess: \(_result, variables\) => \{[\s\S]*?toast\.success\("Added to cart"/);
    expect(page).toMatch(/onError: error => toast\.error/);
  });

  it("reports what was actually added, read back from the mutation variables", () => {
    expect(page).toContain("variables.variantId");
    expect(page).toContain("variables.quantity");
  });

  it("offers a route to the cart without blocking further shopping", () => {
    expect(page).toContain('action: { label: "View cart"');
    // A toast, not a modal.
    expect(page).not.toMatch(/<Dialog[^>]*>[\s\S]*Added to cart/);
  });

  it("refreshes the shared cart cache so the header badge follows", () => {
    expect(page).toContain("queryClient.invalidateQueries({ queryKey: cartQueryKey(user?.id) })");
  });

  it("keeps the existing signed-out redirect", () => {
    expect(page).toContain("if (!isAuthenticated)");
    expect(page).toContain("/auth?next=");
  });
});

// -------------------------------------------------------------------------------------------
describe("notification popover", () => {
  const component = code("../components/campuswear/NotificationPopover.tsx");
  const shell = code("../components/campuswear/StudentShell.tsx");

  it("renders data the shell already fetched, adding no query of its own", () => {
    expect(component).not.toContain("useQuery");
    expect(component).not.toContain("listNotifications");
    expect(shell).toContain("notifications={notifications.data}");
  });

  it("never marks anything read — opening a menu is not reading", () => {
    expect(component).not.toContain("markNotificationRead");
    expect(component).not.toContain("mutate");
  });

  it("distinguishes unread by more than colour", () => {
    expect(component).toContain("font-extrabold");
    expect(component).toContain('<span className="sr-only">{unread ? " · Unread" : " · Read"}</span>');
  });

  it("offers a route to the full page and an honest empty state", () => {
    expect(component).toContain("View all notifications");
    expect(component).toContain("You&apos;re all caught up");
  });

  it("keeps a visible focus state on its rows and trigger", () => {
    expect((component.match(/focus-visible:ring-2/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
