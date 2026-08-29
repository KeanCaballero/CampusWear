export const CAMPUSWEAR_ROLES = [
  "user",
  "student",
  "vendor_staff",
  "school_admin",
  "platform_admin",
  "admin",
] as const;

export type CampuswearRole = (typeof CAMPUSWEAR_ROLES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
  "rejected",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PICKUP_STATUSES = ["scheduled", "ready", "picked_up"] as const;
export type PickupStatus = (typeof PICKUP_STATUSES)[number];

export type InventoryAvailability = "in_stock" | "low_stock" | "out_of_stock";

export type InventoryState = {
  quantity: number;
  lowStockThreshold: number;
};

export type OrderLineInput = {
  variantId: number;
  quantity: number;
};

const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function getInventoryAvailability({
  quantity,
  lowStockThreshold,
}: InventoryState): InventoryAvailability {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

export function getAvailabilityLabel(status: InventoryAvailability) {
  return {
    in_stock: "In stock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
  }[status];
}

export function getOrderStatusLabel(status: OrderStatus) {
  return {
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready_for_pickup: "Ready for pickup",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
  }[status];
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return orderTransitions[from].includes(to);
}

export function inventoryDeductionSucceeded(affectedRows: number) {
  return affectedRows === 1;
}

export function validateCartQuantity(quantity: number, availableQuantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Cart quantity is invalid.");
  }
  if (quantity > 10) {
    throw new Error("You can request up to 10 units of one size at a time.");
  }
  if (quantity > availableQuantity) {
    throw new Error(`Only ${availableQuantity} unit${availableQuantity === 1 ? "" : "s"} are available in this size.`);
  }
}

export function validateOrderLines(lines: OrderLineInput[]) {
  if (lines.length === 0) {
    throw new Error("Add at least one item before placing an order.");
  }

  const totals = new Map<number, number>();
  for (const line of lines) {
    if (!Number.isInteger(line.variantId) || line.variantId <= 0) {
      throw new Error("An order item is invalid.");
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0 || line.quantity > 10) {
      throw new Error("Each item quantity must be between 1 and 10.");
    }
    totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.quantity);
  }

  return Array.from(totals.entries()).map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function isCampuswearAdmin(role: CampuswearRole) {
  return role === "platform_admin" || role === "admin";
}

export function canAccessOperations(role: CampuswearRole) {
  return isCampuswearAdmin(role) || role === "school_admin" || role === "vendor_staff";
}
