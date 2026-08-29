import { describe, expect, it } from "vitest";
import { filterVendorOrders, vendorOrderFilterOptions } from "./vendorOrderFilters";

describe("vendor order filters", () => {
  const orders = [
    { id: "1", status: "pending" },
    { id: "2", status: "ready_for_pickup" },
    { id: "3", status: "completed" },
  ] as any[];

  it("exposes all supported visible order states", () => {
    expect(vendorOrderFilterOptions.map(option => option.value)).toEqual(["all", "pending", "confirmed", "preparing", "ready_for_pickup", "completed", "cancelled", "rejected"]);
  });

  it("filters the active queue locally without changing source order records", () => {
    expect(filterVendorOrders(orders, "ready_for_pickup").map(order => order.id)).toEqual(["2"]);
    expect(filterVendorOrders(orders, "all")).toBe(orders);
  });
});
