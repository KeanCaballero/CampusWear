import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, type OrderStatus } from "../../../server/campuswear/domain";
import {
  isStoppedOrderStatus,
  isTerminalOrderStatus,
  ORDER_PROGRESS_STAGES,
  orderProgressIndex,
  showsCompletedAt,
  showsPickupDetails,
  showsPickupStatusBadge,
  studentTerminalExplanation,
  terminalNote,
} from "./orderPresentation";

const LIVE: OrderStatus[] = ["pending", "confirmed", "preparing", "ready_for_pickup"];
const STOPPED: OrderStatus[] = ["cancelled", "rejected"];

describe("the QA finding: 'Pickup scheduled' on an order that is still pending", () => {
  it("never renders a pickup-status badge, whatever the pickup_status is", () => {
    // pickup_status defaults to 'scheduled' in the schema and is written only by
    // transition_order_status. It is a function of the order status, so a second badge can only
    // restate it or mislead.
    for (const status of ORDER_STATUSES) {
      for (const pickup of ["scheduled", "ready", "picked_up"] as const) {
        expect(showsPickupStatusBadge(status, pickup), `${status}/${pickup}`).toBe(false);
      }
    }
  });

  it("in particular does not claim a scheduled pickup on a pending order", () => {
    expect(showsPickupStatusBadge("pending", "scheduled")).toBe(false);
  });

  it("and does not restate 'Ready for pickup' twice", () => {
    expect(showsPickupStatusBadge("ready_for_pickup", "ready")).toBe(false);
  });
});

describe("terminal states", () => {
  it("classifies exactly the three states the transition machine cannot leave", () => {
    for (const status of ["completed", ...STOPPED] as OrderStatus[]) {
      expect(isTerminalOrderStatus(status), status).toBe(true);
    }
    for (const status of LIVE) {
      expect(isTerminalOrderStatus(status), status).toBe(false);
    }
  });

  it("separates 'stopped' from 'fulfilled' — completed is terminal but not stopped", () => {
    expect(isStoppedOrderStatus("completed")).toBe(false);
    for (const status of STOPPED) expect(isStoppedOrderStatus(status)).toBe(true);
  });

  it("names the actual outcome instead of a generic 'Finalized'", () => {
    expect(terminalNote("completed")).toBe("Completed — no further updates.");
    expect(terminalNote("cancelled")).toBe("Cancelled — no further updates.");
    expect(terminalNote("rejected")).toBe("Rejected — no further updates.");
  });

  it("says nothing closing while the order is still moving", () => {
    for (const status of LIVE) expect(terminalNote(status), status).toBeNull();
  });
});

describe("pickup details disappear when there will be no pickup", () => {
  it("hides pickup logistics on a cancelled or rejected order", () => {
    for (const status of STOPPED) expect(showsPickupDetails(status), status).toBe(false);
  });

  it("keeps them for every order that can still be collected", () => {
    for (const status of [...LIVE, "completed"] as OrderStatus[]) {
      expect(showsPickupDetails(status), status).toBe(true);
    }
  });
});

describe("the timeline stops at a terminal state rather than freezing mid-track", () => {
  it("gives a stopped order no position on the progress track", () => {
    for (const status of STOPPED) expect(orderProgressIndex(status), status).toBeNull();
  });

  it("places every live status, in the order the RPC moves through them", () => {
    expect(ORDER_PROGRESS_STAGES.map(stage => stage.value)).toEqual([
      "pending", "confirmed", "preparing", "ready_for_pickup", "completed",
    ]);
    expect(orderProgressIndex("pending")).toBe(0);
    expect(orderProgressIndex("ready_for_pickup")).toBe(3);
    expect(orderProgressIndex("completed")).toBe(4);
  });
});

describe("no reason is invented for a stopped order", () => {
  it("explains what happened without stating a cause the schema does not record", () => {
    for (const status of STOPPED) {
      const text = studentTerminalExplanation(status) ?? "";
      expect(text.length).toBeGreaterThan(0);
      // orders has no cancellation/rejection reason column, so no cause may be asserted.
      expect(text).not.toMatch(/because|reason:|due to|out of stock|refund/i);
    }
  });

  it("points the student at the notification the backend really does send", () => {
    for (const status of STOPPED) {
      expect(studentTerminalExplanation(status)).toMatch(/notification/i);
    }
  });

  it("says nothing for an order still in progress", () => {
    for (const status of LIVE) expect(studentTerminalExplanation(status), status).toBeNull();
  });
});

describe("completion time replaces the redundant 'Picked up' label", () => {
  it("shows completed_at only for a completed order that has one", () => {
    expect(showsCompletedAt("completed", "2026-08-31T02:00:00Z")).toBe(true);
    expect(showsCompletedAt("completed", null)).toBe(false);
    expect(showsCompletedAt("ready_for_pickup", "2026-08-31T02:00:00Z")).toBe(false);
    expect(showsCompletedAt("cancelled", "2026-08-31T02:00:00Z")).toBe(false);
  });
});

describe("the pages use this mapping instead of duplicating the rules", () => {
  const orders = readFileSync(new URL("../pages/Orders.tsx", import.meta.url), "utf8");
  const vendorOrders = readFileSync(new URL("../pages/vendor/VendorOrders.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../pages/vendor/VendorDashboard.tsx", import.meta.url), "utf8");

  it("the student history renders no pickup-status badge", () => {
    expect(orders).not.toContain('kind="pickup"');
  });

  it("the vendor queue and dashboard render none either", () => {
    expect(vendorOrders).not.toContain('kind="pickup"');
    expect(dashboard).not.toContain('kind="pickup"');
  });

  it("the student history takes its decisions from the shared module", () => {
    expect(orders).toContain('from "@/lib/orderPresentation"');
    expect(orders).toContain("showsPickupDetails(order.status)");
    expect(orders).toContain("isStoppedOrderStatus(order.status)");
  });

  it("the vendor terminal message comes from the same place", () => {
    expect(vendorOrders).toContain("terminalNote(status)");
  });
});
