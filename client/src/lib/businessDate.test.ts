import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  businessDateIn,
  FALLBACK_BUSINESS_TIME_ZONE,
  isSameBusinessDate,
  isValidTimeZone,
  resolveBusinessTimeZone,
} from "./businessDate";

const MANILA = "Asia/Manila"; // UTC+8, no DST

// ---------------------------------------------------------------------------------------------
// A / B / C — the actual defect
// ---------------------------------------------------------------------------------------------
describe("A/B/C. the UTC-versus-school-date defect", () => {
  it("A. an instant just after midnight in Manila belongs to the Manila date", () => {
    // 2026-08-30T16:05Z is 2026-08-31 00:05 in Manila.
    const instant = "2026-08-30T16:05:00Z";
    expect(businessDateIn(instant, MANILA)).toBe("2026-08-31");
    // The old implementation produced this, which is the bug.
    expect(new Date(instant).toISOString().slice(0, 10)).toBe("2026-08-30");
  });

  it("A. reproduces the exact instant recorded during the investigation", () => {
    // db now = 2026-08-30 20:11 UTC, Manila date = 2026-08-31.
    expect(businessDateIn("2026-08-30T20:11:00Z", MANILA)).toBe("2026-08-31");
    expect(businessDateIn("2026-08-30T20:11:00Z", "UTC")).toBe("2026-08-30");
  });

  it("B. the boundary flips exactly at local midnight, not before", () => {
    // 15:59:59Z is 23:59:59 on the 30th in Manila; 16:00:00Z is 00:00:00 on the 31st.
    expect(businessDateIn("2026-08-30T15:59:59Z", MANILA)).toBe("2026-08-30");
    expect(businessDateIn("2026-08-30T16:00:00Z", MANILA)).toBe("2026-08-31");
  });

  it("C. a sale from the previous Manila day is not today", () => {
    const now = "2026-08-30T16:30:00Z";        // 2026-08-31 00:30 Manila
    const yesterday = "2026-08-30T14:00:00Z";  // 2026-08-30 22:00 Manila
    expect(isSameBusinessDate(yesterday, now, MANILA)).toBe(false);
    // Both share a UTC date, which is precisely why the old comparison was wrong.
    expect(new Date(now).toISOString().slice(0, 10)).toBe(new Date(yesterday).toISOString().slice(0, 10));
  });
});

// ---------------------------------------------------------------------------------------------
// D — genuinely generic
// ---------------------------------------------------------------------------------------------
describe("D. the helper is generic across zones, including DST and negative offsets", () => {
  it("resolves the same instant differently per zone", () => {
    const instant = "2026-08-30T20:11:00Z";
    expect(businessDateIn(instant, "Asia/Manila")).toBe("2026-08-31");
    expect(businessDateIn(instant, "UTC")).toBe("2026-08-30");
    expect(businessDateIn(instant, "America/New_York")).toBe("2026-08-30"); // 16:11 EDT
    expect(businessDateIn(instant, "Pacific/Kiritimati")).toBe("2026-08-31"); // UTC+14
  });

  it("handles a negative offset crossing back a day", () => {
    // 2026-08-31T03:00Z is still 2026-08-30 in Los Angeles (20:00 PDT).
    expect(businessDateIn("2026-08-31T03:00:00Z", "America/Los_Angeles")).toBe("2026-08-30");
  });

  it("respects daylight saving rather than a fixed offset", () => {
    // London is UTC+1 in summer, UTC+0 in winter.
    expect(businessDateIn("2026-06-30T23:30:00Z", "Europe/London")).toBe("2026-07-01"); // BST
    expect(businessDateIn("2026-12-31T23:30:00Z", "Europe/London")).toBe("2026-12-31"); // GMT
  });

  it("pads month and day to two digits", () => {
    expect(businessDateIn("2026-01-05T04:00:00Z", MANILA)).toBe("2026-01-05");
    expect(businessDateIn("2026-01-05T12:00:00Z", MANILA)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------------------------
// H — explicit, safe behaviour for bad configuration
// ---------------------------------------------------------------------------------------------
describe("H. missing or invalid timezone is explicit and never browser-local", () => {
  it("falls back to UTC, which is documented and deterministic", () => {
    expect(FALLBACK_BUSINESS_TIME_ZONE).toBe("UTC");
    for (const bad of [null, undefined, "", "   "]) {
      expect(resolveBusinessTimeZone(bad)).toBe("UTC");
    }
  });

  it("falls back rather than throwing on an unknown IANA name", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(resolveBusinessTimeZone("Not/AZone")).toBe("UTC");
    expect(businessDateIn("2026-08-30T20:11:00Z", "Not/AZone")).toBe("2026-08-30");
  });

  it("keeps a valid zone untouched and trims surrounding whitespace", () => {
    expect(resolveBusinessTimeZone(MANILA)).toBe(MANILA);
    expect(resolveBusinessTimeZone("  Asia/Manila  ")).toBe(MANILA);
    expect(isValidTimeZone(MANILA)).toBe(true);
  });

  it("never silently adopts the runtime's own timezone", () => {
    // Whatever this machine is set to, an unusable value must resolve to UTC, not to local.
    const runtime = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const resolved = resolveBusinessTimeZone(undefined);
    expect(resolved).toBe("UTC");
    if (runtime !== "UTC") expect(resolved).not.toBe(runtime);
  });

  it("rejects an unusable instant loudly instead of inventing a date", () => {
    expect(() => businessDateIn("not-a-date", MANILA)).toThrow(RangeError);
    expect(() => businessDateIn(Number.NaN, MANILA)).toThrow(RangeError);
  });

  it("accepts Date, ISO string and epoch millis alike", () => {
    const iso = "2026-08-30T16:05:00Z";
    const expected = "2026-08-31";
    expect(businessDateIn(iso, MANILA)).toBe(expected);
    expect(businessDateIn(new Date(iso), MANILA)).toBe(expected);
    expect(businessDateIn(new Date(iso).getTime(), MANILA)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------------------------
// E / F / G — how the dashboard aggregates with it
// ---------------------------------------------------------------------------------------------
describe("E/F/G. aggregating completed sales by school business date", () => {
  type Sale = { completedAt: string | null; totalInCentavos: number; status: string };

  /** Mirrors the dashboard's filter, so the aggregation itself is exercised, not just the helper. */
  const todaysSales = (orders: Sale[], now: string, timeZone: string) => {
    const today = businessDateIn(now, timeZone);
    return orders
      .filter(order => order.status === "completed" && Boolean(order.completedAt) && businessDateIn(order.completedAt as string, timeZone) === today)
      .reduce((sum, order) => sum + order.totalInCentavos, 0);
  };

  const sale = (completedAt: string | null, totalInCentavos: number, status = "completed"): Sale => ({ completedAt, totalInCentavos, status });

  it("E. no completed orders totals zero", () => {
    expect(todaysSales([], "2026-08-30T20:11:00Z", MANILA)).toBe(0);
    expect(todaysSales([sale(null, 5000, "pending")], "2026-08-30T20:11:00Z", MANILA)).toBe(0);
  });

  it("F. orders spanning UTC midnight but sharing a Manila date all count", () => {
    // 2026-08-30 17:00Z = 31st 01:00 Manila; 2026-08-31 09:00Z = 31st 17:00 Manila.
    const now = "2026-08-31T10:00:00Z"; // 31st 18:00 Manila
    const total = todaysSales([sale("2026-08-30T17:00:00Z", 10000), sale("2026-08-31T09:00:00Z", 25000)], now, MANILA);
    expect(total).toBe(35000);
    // Under the old UTC comparison the first sale would have been dropped.
    expect(new Date("2026-08-30T17:00:00Z").toISOString().slice(0, 10)).toBe("2026-08-30");
  });

  it("G. an order from a different Manila day is excluded", () => {
    const now = "2026-08-31T10:00:00Z";
    const total = todaysSales([
      sale("2026-08-31T09:00:00Z", 25000), // today in Manila
      sale("2026-08-30T02:00:00Z", 99000), // 30th 10:00 Manila
    ], now, MANILA);
    expect(total).toBe(25000);
  });

  it("G. the same data yields a different total under a different school timezone", () => {
    const orders = [sale("2026-08-30T17:00:00Z", 10000)];
    const now = "2026-08-30T20:00:00Z";
    // Manila: both are the 31st -> counted. UTC: now is the 30th, sale is the 30th -> also counted.
    expect(todaysSales(orders, now, MANILA)).toBe(10000);
    expect(todaysSales(orders, now, "UTC")).toBe(10000);
    // But shift "now" past UTC midnight and only the school-local view still agrees.
    expect(todaysSales(orders, "2026-08-31T01:00:00Z", "UTC")).toBe(0);
    expect(todaysSales(orders, "2026-08-31T01:00:00Z", MANILA)).toBe(10000);
  });

  it("ignores non-completed orders even on the right date", () => {
    const now = "2026-08-31T10:00:00Z";
    expect(todaysSales([sale("2026-08-31T09:00:00Z", 25000, "cancelled")], now, MANILA)).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Narrow call-site contract. The aggregation above is behavioural, but vendorDashboardData cannot
// be reached without mocking the whole client, so these few assertions pin that the real code path
// actually uses the helper and that the defect is gone.
// ---------------------------------------------------------------------------------------------
describe("the dashboard call site uses the school timezone", () => {
  const catalog = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer derives a business date from the UTC ISO string", () => {
    expect(catalog).not.toContain("toISOString().slice(0, 10)");
  });

  it("derives today, and each sale's date, in the school's timezone", () => {
    expect(catalog).toContain("businessDateIn(new Date(), context.schoolTimeZone)");
    expect(catalog).toContain("businessDateIn(order.completedAt as string, context.schoolTimeZone) === today");
  });

  it("carries the timezone on the existing vendor context, with no extra round trip", () => {
    expect(catalog).toContain("schoolTimeZone: string");
    expect(catalog).toContain('select("school_id, schools(timezone)")');
    expect(catalog).toContain("resolveBusinessTimeZone(school?.timezone)");
  });

  it("hard-codes no timezone", () => {
    expect(catalog).not.toContain("Asia/Manila");
  });
});
