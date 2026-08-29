import { describe, expect, it } from "vitest";
import { canTransitionOrder, getInventoryAvailability, inventoryDeductionSucceeded, validateCartQuantity, validateOrderLines } from "./domain";

describe("CampusWear inventory availability", () => {
  it("derives student-friendly availability from quantity and threshold", () => {
    expect(getInventoryAvailability({ quantity: 16, lowStockThreshold: 5 })).toBe("in_stock");
    expect(getInventoryAvailability({ quantity: 5, lowStockThreshold: 5 })).toBe("low_stock");
    expect(getInventoryAvailability({ quantity: 0, lowStockThreshold: 5 })).toBe("out_of_stock");
  });

  it("consolidates duplicate variant requests before checkout validation", () => {
    expect(validateOrderLines([{ variantId: 11, quantity: 2 }, { variantId: 11, quantity: 3 }, { variantId: 12, quantity: 1 }])).toEqual([
      { variantId: 11, quantity: 5 },
      { variantId: 12, quantity: 1 },
    ]);
  });

  it("rejects zero, negative, and excessive order quantities", () => {
    expect(() => validateOrderLines([{ variantId: 1, quantity: 0 }])).toThrow("between 1 and 10");
    expect(() => validateOrderLines([{ variantId: 1, quantity: 11 }])).toThrow("between 1 and 10");
  });

  it("treats any conditional stock decrement that affects no row as an oversell prevention failure", () => {
    expect(inventoryDeductionSucceeded(1)).toBe(true);
    expect(inventoryDeductionSucceeded(0)).toBe(false);
    expect(inventoryDeductionSucceeded(2)).toBe(false);
  });

  it("prevents cart quantities from exceeding size-level availability", () => {
    expect(() => validateCartQuantity(6, 5)).toThrow("Only 5 units are available");
    expect(() => validateCartQuantity(11, 20)).toThrow("up to 10 units");
    expect(() => validateCartQuantity(-1, 5)).toThrow("Cart quantity is invalid");
    expect(() => validateCartQuantity(5, 5)).not.toThrow();
  });
});

describe("CampusWear fulfillment state machine", () => {
  it("only permits controlled forward transitions", () => {
    expect(canTransitionOrder("pending", "confirmed")).toBe(true);
    expect(canTransitionOrder("confirmed", "preparing")).toBe(true);
    expect(canTransitionOrder("preparing", "ready_for_pickup")).toBe(true);
    expect(canTransitionOrder("ready_for_pickup", "completed")).toBe(true);
    expect(canTransitionOrder("completed", "preparing")).toBe(false);
    expect(canTransitionOrder("pending", "completed")).toBe(false);
  });
});
