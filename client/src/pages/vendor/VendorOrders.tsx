import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { WorkspacePage } from "@/components/campuswear/WorkspacePage";
import { WorkspacePanel } from "@/components/campuswear/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, formatShortDate } from "@/lib/format";
import { filterVendorOrders, searchVendorOrders, vendorOrderFilterOptions, type VendorOrderFilter } from "@/lib/vendorOrderFilters";
import { listVendorOrders, transitionVendorOrder, VendorFacingError, vendorNextStatuses, vendorOrdersQueryKey, type VendorOrder } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Search } from "lucide-react";
// The default React import is NOT unused: tsconfig sets "jsx": "preserve" and this is the one
// vendor page a test renders via renderToStaticMarkup, which needs React in scope. Removing it
// fails vendorOrderControlMarkup with "React is not defined".
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

/** What an order currently IS. Used when describing existing state. */
const statusStateLabels: Record<VendorOrder["status"], string> = { pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", ready_for_pickup: "Ready for pickup", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected" };

/** What moving TO a status DOES. Used for transition options. Vocabulary unchanged. */
const statusActionLabels: Record<VendorOrder["status"], string> = { pending: "Pending", confirmed: "Confirm", preparing: "Preparing", ready_for_pickup: "Ready for pickup", completed: "Complete", cancelled: "Cancel", rejected: "Reject" };

export function VendorOrderTransitionControl({ status, isPending, onStatusChange }: { status: VendorOrder["status"]; isPending: boolean; onStatusChange: (status: VendorOrder["status"]) => void }) {
  const nextStatuses = vendorNextStatuses[status];
  if (!nextStatuses.length) return <span role="status" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-muted px-3 text-xs font-bold text-muted-foreground"><CircleCheck className="size-3.5" aria-hidden="true" />Finalized — no further updates</span>;
  return <Select onValueChange={value => onStatusChange(value as VendorOrder["status"])} disabled={isPending}><SelectTrigger aria-label={`Update order status from ${statusStateLabels[status]}`} className="min-h-11 w-44 bg-card"><SelectValue placeholder="Update status" /></SelectTrigger><SelectContent>{nextStatuses.map(nextStatus => <SelectItem key={nextStatus} value={nextStatus}>{statusActionLabels[nextStatus]}</SelectItem>)}</SelectContent></Select>;
}

export default function VendorOrders() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const ordersKey = vendorOrdersQueryKey(user?.id);
  const [filter, setFilter] = useState<VendorOrderFilter>("all");
  const orders = useQuery({ queryKey: ordersKey, queryFn: listVendorOrders, enabled: !loading && Boolean(user?.id) });
  const update = useMutation({ mutationFn: transitionVendorOrder, onSuccess: () => { toast.success("Order updated and student notified."); void queryClient.invalidateQueries({ queryKey: ordersKey }); }, onError: error => toast.error(error instanceof VendorFacingError ? error.message : "The order status could not be updated.") });
  const [search, setSearch] = useState("");
  const allOrders = orders.data ?? [];
  const filtersActive = search.trim().length > 0 || filter !== "all";

  // Narrows the list already in memory: the status filter keeps its existing semantics, then the
  // search term matches the order number or any of its item names/sizes.
  const visibleOrders = useMemo(
    () => searchVendorOrders(filterVendorOrders(allOrders, filter), search),
    [allOrders, filter, search],
  );

  const clearFilters = () => { setSearch(""); setFilter("all"); };
  const filterLabel = vendorOrderFilterOptions.find(option => option.value === filter)?.label.toLowerCase() ?? "selected";
  return <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace"><WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}><WorkspacePage eyebrow="FULFILLMENT" title="Orders" description="Review each item, then move valid requests through the controlled pickup lifecycle.">{orders.isLoading ? <div className="mt-7 space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[var(--radius)]" />)}</div> : isStalledWithoutData(orders) ? <div className="mt-7"><OfflinePanel title="You are offline" detail="Reconnect to load your fulfillment queue." onRetry={() => orders.refetch()} /></div> : orders.isError ? <div className="mt-7"><EmptyPanel title="Orders could not be loaded" detail="Please try again to review your vendor queue." action={{ label: "Try again", onClick: () => orders.refetch() }} /></div> : orders.data?.length ? <><WorkspacePanel padding="default" className="mt-7"><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><label className="sr-only" htmlFor="vendor-order-search">Search orders</label><Input id="vendor-order-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by order number, product, or size" className="min-h-11 bg-card pl-9" /></div><div className="mt-3 flex flex-wrap gap-2" aria-label="Filter orders by status">{vendorOrderFilterOptions.map(option => <Button key={option.value} size="sm" variant={filter === option.value ? "default" : "outline"} onClick={() => setFilter(option.value)} className={filter === option.value ? "" : "bg-card"}>{option.label}</Button>)}</div><p className="mt-3 text-sm font-semibold text-muted-foreground" aria-live="polite">{visibleOrders.length} {filterLabel} order{visibleOrders.length === 1 ? "" : "s"}{filtersActive ? ` of ${allOrders.length}` : ""}</p></WorkspacePanel>{visibleOrders.length ? <div className="mt-3 space-y-3">{visibleOrders.map(order => <WorkspacePanel as="article" key={order.id} padding="comfortable"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><p className="text-xs font-bold tracking-[0.08em] text-muted-foreground">{order.orderNumber}</p><h2 className="mt-1 text-lg font-extrabold">Pickup at {order.pickupLocation}</h2><p className="mt-1 text-sm text-muted-foreground">Placed {formatShortDate(order.placedAt)} · <span className="tabular-nums">{formatPeso(order.totalInCentavos)}</span>{order.completedAt ? <> · Completed {formatShortDate(order.completedAt)}</> : null}</p><div className="mt-4 flex flex-wrap gap-2">{order.items.map(item => <span key={`${item.productName}-${item.size}`} className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-bold text-secondary-foreground">{item.quantity}× {item.productName} · {item.size}</span>)}</div></div><div className="flex flex-wrap items-center gap-2"><StatusBadge kind="order" value={order.status} /><StatusBadge kind="pickup" value={order.pickupStatus} /><VendorOrderTransitionControl status={order.status} isPending={update.isPending && update.variables?.orderId === order.id} onStatusChange={status => update.mutate({ orderId: order.id, status })} /></div></div></WorkspacePanel>)}</div> : <div className="mt-5"><EmptyPanel title="No orders match your filters" detail="No order in your queue matches the current search or status filter." action={{ label: "Clear filters", onClick: clearFilters }} /></div>}</> : <div className="mt-7"><EmptyPanel title="No orders need attention" detail="Incoming student order requests will appear in this workspace." /></div>}</WorkspacePage></WorkspaceGate></DashboardLayout>;
}
