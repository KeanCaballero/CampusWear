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

  it("keeps order number, collection point, per-item quantity, and total prominent", () => {
    expect(orders).toContain("{order.orderNumber}");
    expect(orders).toContain("Collect at");
    expect(orders).toContain("Qty ×");
    expect(orders).toContain("Order total");
    expect(orders).toContain("<OrderTimeline status={order.status} />");
  });

  it("does not resurrect the pickup date, which nothing ever writes", () => {
    // orders.pickup_at has no writer: checkout passes pickup_at_input: null and no other path sets
    // it, so the old "Pickup date" cell could only ever render a placeholder.
    expect(orders).not.toContain("Pickup date");
    expect(orders).not.toContain("pickupAt");
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
