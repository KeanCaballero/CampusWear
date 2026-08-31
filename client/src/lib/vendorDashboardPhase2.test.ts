import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const raw = readFileSync(new URL("../pages/vendor/VendorDashboard.tsx", import.meta.url), "utf8");
// The file carries doc comments that quote old class names and explain the campus-panel layering
// rule. Assertions about what the page RENDERS read stripped code, never the prose.
const dashboard = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the attention area is real triage, not decoration", () => {
  it("renders only when something actually needs action", () => {
    expect(dashboard).toContain("attention.length > 0 &&");
    expect(dashboard).toContain('aria-label="Needs attention"');
  });

  it("builds its text from counts the dashboard already loads", () => {
    expect(dashboard).toContain("pendingCount > 0 ?");
    expect(dashboard).toContain("lowStockCount > 0 ?");
    expect(dashboard).toContain("awaiting review");
    expect(dashboard).toContain("low or out of stock");
  });

  it("offers each action only when that condition is present", () => {
    expect(dashboard).toContain("{pendingCount > 0 && (");
    expect(dashboard).toContain("{lowStockCount > 0 && (");
  });

  it("singularises counts rather than printing \"1 orders\"", () => {
    expect(dashboard).toContain('pendingCount === 1 ? "" : "s"');
    expect(dashboard).toContain('lowStockCount === 1 ? "" : "s"');
  });
});

describe("the low-stock tile no longer cries wolf", () => {
  it("emphasises only when the count is above zero", () => {
    // Previously `emphasis: true` was hardcoded, so a healthy store still showed a destructive
    // red tile reading "Low stock alerts 0".
    expect(dashboard).toContain("emphasis: lowStockCount > 0");
    expect(dashboard).not.toContain("emphasis: true");
  });

  it("swaps the icon chip to a neutral tone when there is nothing to alert on", () => {
    expect(dashboard).toContain('lowStockCount > 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"');
  });

  it("keeps the destructive treatment available for the alarm case", () => {
    expect(dashboard).toContain("border-destructive/30");
  });
});

describe("recent orders surface data the model already returns", () => {
  it("summarises order items on both the table and the mobile list", () => {
    expect(dashboard.match(/orderItemSummary\(order\.items\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(dashboard).toContain("order.items.length > 0 &&");
  });

  it("formats only — it fetches, derives and invents nothing", () => {
    const helper = dashboard.slice(dashboard.indexOf("function orderItemSummary"), dashboard.indexOf("export default"));
    for (const forbidden of [/useQuery/, /fetch\(/, /\.reduce\(/, /Math\./, /Date\(/]) {
      expect(helper).not.toMatch(forbidden);
    }
  });

  it("keeps every existing order column and its data source", () => {
    // order.pickupStatus is deliberately absent. It is written only by transition_order_status as a
    // function of the order status ('ready' at ready_for_pickup, 'picked_up' at completed, the
    // 'scheduled' column default otherwise), so a second badge could only restate order.status or,
    // on a pending or cancelled order, contradict it.
    for (const field of ["order.orderNumber", "order.pickupLocation", "order.placedAt", "order.status", "order.totalInCentavos"]) {
      expect(dashboard).toContain(field);
    }
    expect(dashboard).not.toContain("order.pickupStatus");
  });
});

describe("no fabricated data", () => {
  it("invents no metric the vendor data model does not provide", () => {
    for (const forbidden of [/revenue/i, /growth/i, /conversion/i, /\bcustomers?\b/i, /vs\.? last (week|month)/i, /%\s*(up|down)/i, /trend/i]) {
      expect(dashboard).not.toMatch(forbidden);
    }
  });

  it("invents no customer identity, which listVendorOrders does not return", () => {
    for (const forbidden of [/order\.studentName/, /order\.customer/, /order\.buyer/, /order\.email/]) {
      expect(dashboard).not.toMatch(forbidden);
    }
  });

  it("keeps every metric bound to the real dashboard query", () => {
    for (const binding of ["dashboard.data?.todaysSalesInCentavos", "dashboard.data?.pendingOrders", "dashboard.data?.readyForPickup", "dashboard.data?.lowStock", "dashboard.data?.recentOrders", "dashboard.data?.lowStockItems"]) {
      expect(dashboard).toContain(binding);
    }
  });

  it("adds no new query or mutation", () => {
    expect(dashboard.match(/useQuery\(/g)?.length).toBe(2);
    expect(dashboard.match(/useMutation\(/g)?.length).toBe(1);
  });
});

describe("query states are preserved and correctly ordered", () => {
  it("keeps all five branches", () => {
    for (const branch of ["dashboard.isLoading", "isStalledWithoutData(dashboard)", "dashboard.isError", "recentOrders.length ?", "lowStockItems.length ?"]) {
      expect(dashboard).toContain(branch);
    }
  });

  it("evaluates offline before error, so a paused query is never a false empty state", () => {
    const body = dashboard.slice(dashboard.indexOf("return ("));
    expect(body.indexOf("dashboard.isLoading")).toBeLessThan(body.indexOf("isStalledWithoutData(dashboard)"));
    expect(body.indexOf("isStalledWithoutData(dashboard)")).toBeLessThan(body.indexOf("dashboard.isError"));
  });

  it("keeps the separate pickup-location query states", () => {
    for (const branch of ["pickupLocation.isLoading", "isStalledWithoutData(pickupLocation)", "pickupLocation.isError"]) {
      expect(dashboard).toContain(branch);
    }
  });
});

describe("security and business logic are untouched", () => {
  it("keeps the role gate exactly as it was", () => {
    expect(dashboard).toContain('allowedRoles={["vendor_staff", "platform_admin", "admin"]}');
  });

  it("keeps the pickup-location mutation and its accessibility wiring", () => {
    expect(dashboard).toContain("savePickupLocation.mutate(pickupDraft)");
    expect(dashboard).toContain('id="vendor-pickup-location-help"');
    expect(dashboard).toContain('aria-describedby="vendor-pickup-location-help"');
  });

  it("every link targets a route that exists", () => {
    const routes = dashboard.match(/href="\/vendor[^"]*"/g) ?? [];
    const allowed = new Set(['href="/vendor/orders"', 'href="/vendor/inventory"', 'href="/vendor/reports"', 'href="/vendor/products"']);
    for (const route of routes) expect(allowed.has(route)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });
});

describe("accessibility and branding", () => {
  it("gives keyboard users a visible focus state on the navigation tiles", () => {
    expect(dashboard).toContain("focus-visible:ring-2");
    expect(dashboard).not.toMatch(/<div[^>]*onClick/);
  });

  it("keeps semantic sections and labelled regions", () => {
    expect(dashboard).toContain('aria-label="Store priorities"');
    expect(dashboard).toContain('aria-label="Recent orders"');
    expect(dashboard).toContain('aria-label="Inventory alerts"');
    expect(dashboard).toContain('aria-label="Pickup location"');
  });

  it("carries no competing brand mark", () => {
    expect(dashboard).not.toContain("GraduationCap");
    expect(dashboard).not.toContain("BrandMark");
    expect(dashboard).not.toContain("<svg");
  });

  it("uses shared tokens rather than raw brand hex values", () => {
    expect(dashboard).not.toMatch(/#0[Ff]2747|#2563[Ee][Bb]|#[Ff]4[Bb]942/);
  });

  it("keeps one radius for panel surfaces", () => {
    expect(dashboard).toContain("rounded-[var(--radius)]");
    // Only controls (two buttons) and the input skeleton may keep a control radius.
    expect((dashboard.match(/rounded-xl/g) ?? []).length).toBeLessThanOrEqual(3);
  });
});
