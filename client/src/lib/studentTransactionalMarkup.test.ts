import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cart = readFileSync(new URL("../pages/Cart.tsx", import.meta.url), "utf8");
const orders = readFileSync(new URL("../pages/Orders.tsx", import.meta.url), "utf8");
const notifications = readFileSync(new URL("../pages/Notifications.tsx", import.meta.url), "utf8");

describe("Pasted Content 11/12 transactional student redesign", () => {
  it("keeps the cart error recoverable and does not prefill a fictional pickup location", () => {
    expect(cart).toContain("Your cart could not be loaded");
    expect(cart).toContain("onClick: () => cart.refetch()");
    expect(cart).toContain('defaultValues: { pickupLocation: "" }');
    expect(cart).not.toContain("Student Center, Ground Floor");
  });

  it("keeps order number, status, pickup location, pickup date, and total prominent", () => {
    expect(orders).toContain("{order.orderNumber}");
    expect(orders).toContain("Pickup location");
    expect(orders).toContain("Pickup date");
    expect(orders).toContain("Order total");
    expect(orders).toContain("<OrderTimeline status={order.status} />");
  });

  it("keeps unread notifications visibly actionable without relying on color alone", () => {
    expect(notifications).toContain("<CheckCircle2");
    // The label is now conditional so only the row being marked shows progress. The guarantee this
    // protects is unchanged: the control carries a TEXT label, not colour alone.
    expect(notifications).toContain('"Read"');
    expect(notifications).toContain('"Marking…"');
    // Per-row, so one pending mark no longer freezes every other notification's button.
    expect(notifications).toContain("markRead.isPending && markRead.variables === alert.id");
  });
});
