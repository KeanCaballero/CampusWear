import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildVendorReport,
  countByStatus,
  inventoryNeedingAttention,
  REPORT_STATUS_ORDER,
  SHORT_STATUS_LABEL,
  statusLabel,
  unitsSoldByProduct,
} from "./vendorReportMetrics";

/** Minimal VendorOrder shaped for arithmetic; only the fields the metrics read matter. */
const order = (over: Partial<any> = {}): any => ({
  id: "o", orderNumber: "CW-1", status: "pending", pickupStatus: "scheduled",
  pickupLocation: "Store", placedAt: "2026-08-30T01:00:00Z", completedAt: null,
  totalInCentavos: 10000, items: [], ...over,
});

const item = (productName: string, size: string, quantity: number) => ({ productName, size, quantity });
const stock = (availability: string): any => ({ variantId: "v", productName: "P", size: "M", sku: "S", quantity: 1, lowStockThreshold: 5, availability });

// ---------------------------------------------------------------------------------------------
// A / I / R — nothing to divide by
// ---------------------------------------------------------------------------------------------
describe("A/I/R. zero orders never produce NaN or a division by zero", () => {
  it("A. reports all zeros for an empty order list", () => {
    const r = buildVendorReport([], []);
    expect(r.totalOrders).toBe(0);
    expect(r.completedOrders).toBe(0);
    expect(r.completedSalesInCentavos).toBe(0);
    expect(r.unitsSoldByProduct).toEqual([]);
    expect(r.totalUnitsSold).toBe(0);
  });

  it("R. average and fulfilment rate are finite zeros, not NaN", () => {
    const r = buildVendorReport([], []);
    expect(r.averageOrderValueInCentavos).toBe(0);
    expect(r.fulfilmentRatePercent).toBe(0);
    expect(Number.isNaN(r.averageOrderValueInCentavos)).toBe(false);
    expect(Number.isNaN(r.fulfilmentRatePercent)).toBe(false);
  });

  it("I. zero completed orders yields a zero average, not a division by zero", () => {
    const r = buildVendorReport([order({ status: "pending" }), order({ status: "cancelled" })], []);
    expect(r.completedOrders).toBe(0);
    expect(r.averageOrderValueInCentavos).toBe(0);
    expect(r.fulfilmentRatePercent).toBe(0);
  });

  it("tolerates undefined inputs", () => {
    const r = buildVendorReport(undefined, undefined);
    expect(r.totalOrders).toBe(0);
    expect(r.inventoryNeedingAttention).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// B / D / E / O / P — status counting
// ---------------------------------------------------------------------------------------------
describe("B/D/E/O/P. status counting", () => {
  it("B. a single pending order counts once and nowhere else", () => {
    const counts = countByStatus([order({ status: "pending" })]);
    expect(counts.pending).toBe(1);
    expect(counts.completed).toBe(0);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("D. cancelled orders are counted", () => {
    expect(countByStatus([order({ status: "cancelled" }), order({ status: "cancelled" })]).cancelled).toBe(2);
  });

  it("E. rejected orders are counted separately from cancelled", () => {
    const counts = countByStatus([order({ status: "rejected" }), order({ status: "cancelled" })]);
    expect(counts.rejected).toBe(1);
    expect(counts.cancelled).toBe(1);
  });

  it("O. every one of the seven statuses is represented", () => {
    const counts = countByStatus(REPORT_STATUS_ORDER.map(status => order({ status })));
    for (const status of REPORT_STATUS_ORDER) expect(counts[status]).toBe(1);
  });

  it("P. a mixed queue sums to the order count", () => {
    const orders = [
      order({ status: "pending" }), order({ status: "pending" }),
      order({ status: "preparing" }), order({ status: "completed" }),
      order({ status: "rejected" }),
    ];
    const r = buildVendorReport(orders, []);
    expect(r.statusCounts.pending).toBe(2);
    expect(r.totalOrders).toBe(5);
    expect(Object.values(r.statusCounts).reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("ignores an unrecognised status rather than inventing a bucket", () => {
    const counts = countByStatus([order({ status: "archived" }), order({ status: "pending" })]);
    expect(counts.pending).toBe(1);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(1);
    expect(counts as Record<string, number>).not.toHaveProperty("archived");
  });
});

// ---------------------------------------------------------------------------------------------
// C / H / Q — money
// ---------------------------------------------------------------------------------------------
describe("C/H/Q. sales arithmetic stays in integer centavos", () => {
  it("C. sums only completed orders", () => {
    const r = buildVendorReport([
      order({ status: "completed", totalInCentavos: 45000 }),
      order({ status: "pending", totalInCentavos: 99900 }),
      order({ status: "cancelled", totalInCentavos: 12300 }),
    ], []);
    expect(r.completedSalesInCentavos).toBe(45000);
  });

  it("H. sums several completed orders exactly", () => {
    const r = buildVendorReport([
      order({ status: "completed", totalInCentavos: 45000 }),
      order({ status: "completed", totalInCentavos: 32550 }),
      order({ status: "completed", totalInCentavos: 1 }),
    ], []);
    expect(r.completedSalesInCentavos).toBe(77551);
    expect(Number.isInteger(r.completedSalesInCentavos)).toBe(true);
  });

  it("Q. centavo values that would drift as floats stay exact", () => {
    // 0.10 + 0.20 !== 0.30 in floating point; in centavos it is simply 10 + 20 === 30.
    const r = buildVendorReport([
      order({ status: "completed", totalInCentavos: 10 }),
      order({ status: "completed", totalInCentavos: 20 }),
    ], []);
    expect(r.completedSalesInCentavos).toBe(30);
    expect(r.averageOrderValueInCentavos).toBe(15);
    expect(Number.isInteger(r.averageOrderValueInCentavos)).toBe(true);
  });

  it("treats a non-finite total as zero rather than poisoning the sum", () => {
    const r = buildVendorReport([
      order({ status: "completed", totalInCentavos: 5000 }),
      order({ status: "completed", totalInCentavos: Number.NaN }),
    ], []);
    expect(r.completedSalesInCentavos).toBe(5000);
  });
});

// ---------------------------------------------------------------------------------------------
// F / G — derived rates
// ---------------------------------------------------------------------------------------------
describe("F/G. fulfilment rate and average order value", () => {
  it("G. average is completed sales divided by completed count", () => {
    const r = buildVendorReport([
      order({ status: "completed", totalInCentavos: 30000 }),
      order({ status: "completed", totalInCentavos: 10000 }),
    ], []);
    expect(r.averageOrderValueInCentavos).toBe(20000);
  });

  it("G. average floors rather than emitting a fractional centavo", () => {
    const r = buildVendorReport([
      order({ status: "completed", totalInCentavos: 10 }),
      order({ status: "completed", totalInCentavos: 10 }),
      order({ status: "completed", totalInCentavos: 11 }),
    ], []);
    expect(r.averageOrderValueInCentavos).toBe(10); // 31 / 3 = 10.33…
    expect(Number.isInteger(r.averageOrderValueInCentavos)).toBe(true);
  });

  it("F. fulfilment rate is completed over total, as a whole percentage", () => {
    const r = buildVendorReport([
      order({ status: "completed" }), order({ status: "completed" }),
      order({ status: "pending" }), order({ status: "cancelled" }),
    ], []);
    expect(r.fulfilmentRatePercent).toBe(50);
  });

  it("F. a fully fulfilled store reports 100", () => {
    expect(buildVendorReport([order({ status: "completed" })], []).fulfilmentRatePercent).toBe(100);
  });

  it("F. the rate counts only completed, not other closed states", () => {
    const r = buildVendorReport([order({ status: "cancelled" }), order({ status: "rejected" })], []);
    expect(r.fulfilmentRatePercent).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// K / L / M / N — units sold
// ---------------------------------------------------------------------------------------------
describe("K/L/M/N. units sold by product", () => {
  it("K. totals units for one product", () => {
    const r = buildVendorReport([order({ items: [item("BSIT Uniform", "M", 2)] })], []);
    expect(r.unitsSoldByProduct).toEqual([{ productName: "BSIT Uniform", units: 2 }]);
    expect(r.totalUnitsSold).toBe(2);
  });

  it("L. aggregates the same product across several orders, ranked by units", () => {
    const r = buildVendorReport([
      order({ items: [item("Lanyard", "One size", 1)] }),
      order({ items: [item("BSIT Uniform", "M", 2)] }),
      order({ items: [item("BSIT Uniform", "L", 3)] }),
    ], []);
    expect(r.unitsSoldByProduct).toEqual([
      { productName: "BSIT Uniform", units: 5 },
      { productName: "Lanyard", units: 1 },
    ]);
  });

  it("M. merges multiple sizes of one product within a single order", () => {
    const r = buildVendorReport([order({ items: [item("PE Set", "S", 1), item("PE Set", "M", 4)] })], []);
    expect(r.unitsSoldByProduct).toEqual([{ productName: "PE Set", units: 5 }]);
  });

  it("N. survives missing, empty and malformed item arrays", () => {
    const r = buildVendorReport([
      order({ items: [] }),
      order({ items: undefined }),
      order({ items: [{ productName: "", size: "M", quantity: 3 }] }),
      order({ items: [item("Real Product", "M", 2)] }),
    ], []);
    expect(r.unitsSoldByProduct).toEqual([{ productName: "Real Product", units: 2 }]);
  });

  it("orders equal counts by name so the table is stable", () => {
    const r = buildVendorReport([order({ items: [item("Zeta", "M", 2), item("Alpha", "M", 2)] })], []);
    expect(r.unitsSoldByProduct.map(e => e.productName)).toEqual(["Alpha", "Zeta"]);
  });

  it("counts a non-finite quantity as zero", () => {
    expect(unitsSoldByProduct([order({ items: [{ productName: "P", size: "M", quantity: Number.NaN }] })]))
      .toEqual([{ productName: "P", units: 0 }]);
  });
});

// ---------------------------------------------------------------------------------------------
// J — inventory
// ---------------------------------------------------------------------------------------------
describe("J. inventory needing attention", () => {
  it("counts low and out of stock, and nothing else", () => {
    expect(inventoryNeedingAttention([stock("in_stock"), stock("low_stock"), stock("out_of_stock"), stock("in_stock")])).toBe(2);
  });

  it("is zero for a healthy catalogue and for an empty one", () => {
    expect(inventoryNeedingAttention([stock("in_stock")])).toBe(0);
    expect(inventoryNeedingAttention([])).toBe(0);
  });

  it("flows through buildVendorReport", () => {
    expect(buildVendorReport([order()], [stock("out_of_stock")]).inventoryNeedingAttention).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
// Chart distribution
// ---------------------------------------------------------------------------------------------
describe("status distribution feeding the chart", () => {
  it("always returns all seven states, in pipeline order, even at zero", () => {
    const r = buildVendorReport([order({ status: "completed" })], []);
    expect(r.statusDistribution).toHaveLength(7);
    expect(r.statusDistribution.map(s => s.status)).toEqual([...REPORT_STATUS_ORDER]);
    expect(r.statusDistribution.find(s => s.status === "completed")?.count).toBe(1);
    expect(r.statusDistribution.find(s => s.status === "pending")?.count).toBe(0);
  });

  it("carries short labels so seven categories stay legible", () => {
    expect(SHORT_STATUS_LABEL.ready_for_pickup).toBe("Ready");
    const r = buildVendorReport([order()], []);
    expect(r.statusDistribution.every(s => s.label.length <= 10)).toBe(true);
  });

  it("statusLabel humanises the raw enum value", () => {
    expect(statusLabel("ready_for_pickup")).toBe("Ready for pickup");
    expect(statusLabel("pending")).toBe("Pending");
  });

  it("distribution counts always sum to the order total", () => {
    const orders = REPORT_STATUS_ORDER.flatMap(status => [order({ status }), order({ status })]);
    const r = buildVendorReport(orders, []);
    expect(r.statusDistribution.reduce((sum, s) => sum + s.count, 0)).toBe(r.totalOrders);
  });
});

// ---------------------------------------------------------------------------------------------
// Page contract
// ---------------------------------------------------------------------------------------------
describe("the page honours the phase constraints", () => {
  const page = readFileSync(new URL("../pages/vendor/VendorReports.tsx", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("shows a real empty state instead of zeroed cards", () => {
    expect(page).toContain("report.totalOrders === 0 ?");
    expect(page).toContain('title="No orders to report yet"');
    const empty = page.indexOf("report.totalOrders === 0");
    expect(page.indexOf("orders.isError")).toBeLessThan(empty);
    expect(page.indexOf("isStalledWithoutData(orders)")).toBeLessThan(page.indexOf("orders.isError"));
  });

  it("hides the SVG from assistive tech and exposes a real data table", () => {
    expect(page).toContain('aria-hidden="true"');
    expect(page).toContain('<table className="sr-only">');
    expect(page).toContain("<caption>Order counts by lifecycle state</caption>");
    expect(page).toContain("{slice.count}");
  });

  it("ties both panels to their headings", () => {
    expect(page).toContain('aria-labelledby="order-pipeline-title"');
    expect(page).toContain('id="order-pipeline-title"');
    expect(page).toContain('aria-labelledby="units-sold-title"');
    expect(page).toContain('id="units-sold-title"');
  });

  it("uses tokens, never raw hex", () => {
    expect(page).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(page).toContain("var(--primary)");
    expect(page).toContain("var(--muted-foreground)");
  });

  it("uses the shared radius token for skeletons", () => {
    expect(page).toContain("rounded-[var(--radius)]");
    expect(page).not.toContain("rounded-2xl");
  });

  it("renders horizontal bars so labels stay readable on a narrow screen", () => {
    expect(page).toContain('layout="vertical"');
    expect(page).toContain('type="category" dataKey="label"');
  });

  it("surfaces the status counts it already computes", () => {
    for (const metric of ["report.statusCounts.pending", "report.statusCounts.completed", "report.statusCounts.cancelled", "report.statusCounts.rejected"]) {
      expect(page).toContain(metric);
    }
    expect(page).toContain("Fulfilment rate");
    expect(page).toContain("Average completed order");
  });

  it("delegates every calculation to the tested module", () => {
    expect(page).toContain("buildVendorReport(orders.data, inventory.data)");
    expect(page).not.toMatch(/\.reduce\(/);
    expect(page).not.toMatch(/\.filter\(order =>/);
  });

  it("adds no date logic, per the timezone warning", () => {
    for (const forbidden of [/toISOString/, /new Date\(/, /placedAt/, /completedAt/, /dateRange/i]) {
      expect(page).not.toMatch(forbidden);
    }
  });

  it("keeps the shared query keys so no duplicate request is issued", () => {
    expect(page).toContain("vendorOrdersQueryKey(user?.id)");
    expect(page).toContain("vendorInventoryQueryKey(user?.id)");
    expect(page.match(/useQuery\(/g)?.length).toBe(2);
    expect(page).not.toMatch(/vendor_id/);
  });

  it("keeps the foundation and the role gate", () => {
    expect(page).toContain('allowedRoles={["vendor_staff", "platform_admin", "admin"]}');
    expect(page).toContain("<WorkspacePage");
    expect(page).toContain("<WorkspacePanel");
    expect(page).toContain("<MetricCard");
  });
});

describe("the metrics module stays pure", () => {
  const module = readFileSync(new URL("./vendorReportMetrics.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("performs no I/O, no date maths and no formatting", () => {
    // The single supabaseCatalog reference is a TYPE-only import, erased at compile time — so the
    // check targets actual client usage rather than the module path.
    // `.from(` is deliberately not checked: Array.from is legitimate here.
    for (const forbidden of [/useQuery/, /fetch\(/, /requireSupabase/, /createClient/, /client\./, /\.rpc\(/, /new Date\(/, /toISOString/, /formatPeso/]) {
      expect(module).not.toMatch(forbidden);
    }
    expect(module).toContain('import type { VendorInventoryItem, VendorOrder }');
  });
});
