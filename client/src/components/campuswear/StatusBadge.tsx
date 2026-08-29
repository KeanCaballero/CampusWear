import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import { InventoryAvailability, OrderStatus, PickupStatus, getAvailabilityLabel, getOrderStatusLabel } from "../../../../server/campuswear/domain";

type StatusBadgeProps =
  | { kind: "inventory"; value: InventoryAvailability }
  | { kind: "order"; value: OrderStatus }
  | { kind: "pickup"; value: PickupStatus };

const inventoryStyles: Record<InventoryAvailability, string> = {
  in_stock: "border-emerald-200 bg-emerald-50 text-emerald-800",
  low_stock: "border-amber-200 bg-amber-50 text-amber-800",
  out_of_stock: "border-red-200 bg-red-50 text-red-800",
};

const orderStyles: Record<OrderStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  preparing: "border-blue-200 bg-blue-50 text-blue-800",
  ready_for_pickup: "border-violet-200 bg-violet-50 text-violet-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

export function StatusBadge({ kind, value }: StatusBadgeProps) {
  if (kind === "inventory") {
    const Icon = value === "in_stock" ? CheckCircle2 : AlertCircle;
    return <Badge variant="outline" className={`gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.01em] ${inventoryStyles[value]}`}><Icon className="size-3.5" aria-hidden="true" />{getAvailabilityLabel(value)}</Badge>;
  }
  if (kind === "pickup") {
    const copy: Record<PickupStatus, string> = { scheduled: "Pickup scheduled", ready: "Ready to collect", picked_up: "Picked up" };
    return <Badge variant="outline" className="gap-1.5 rounded-full border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold tracking-[0.01em] text-violet-800"><PackageCheck className="size-3.5" aria-hidden="true" />{copy[value]}</Badge>;
  }
  const Icon = value === "completed" ? CheckCircle2 : value === "ready_for_pickup" ? Truck : Clock3;
  return <Badge variant="outline" className={`gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.01em] ${orderStyles[value]}`}><Icon className="size-3.5" aria-hidden="true" />{getOrderStatusLabel(value)}</Badge>;
}
