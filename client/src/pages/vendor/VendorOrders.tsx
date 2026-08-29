import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, formatShortDate } from "@/lib/format";
import { filterVendorOrders, vendorOrderFilterOptions, type VendorOrderFilter } from "@/lib/vendorOrderFilters";
import { listVendorOrders, transitionVendorOrder, vendorNextStatuses, vendorOrdersQueryKey, type VendorOrder } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

const statusLabels: Record<VendorOrder["status"], string> = { pending: "Pending", confirmed: "Confirm", preparing: "Preparing", ready_for_pickup: "Ready for pickup", completed: "Complete", cancelled: "Cancel", rejected: "Reject" };

export function VendorOrderTransitionControl({ status, isPending, onStatusChange }: { status: VendorOrder["status"]; isPending: boolean; onStatusChange: (status: VendorOrder["status"]) => void }) {
  const nextStatuses = vendorNextStatuses[status];
  if (!nextStatuses.length) return <span role="status" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-muted px-3 text-xs font-bold text-muted-foreground"><CircleCheck className="size-3.5" aria-hidden="true" />Finalized — no further updates</span>;
  return <Select onValueChange={value => onStatusChange(value as VendorOrder["status"])} disabled={isPending}><SelectTrigger aria-label={`Update order status from ${statusLabels[status]}`} className="min-h-11 w-44 bg-card"><SelectValue placeholder="Update status" /></SelectTrigger><SelectContent>{nextStatuses.map(nextStatus => <SelectItem key={nextStatus} value={nextStatus}>{statusLabels[nextStatus]}</SelectItem>)}</SelectContent></Select>;
}

export default function VendorOrders() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const ordersKey = vendorOrdersQueryKey(user?.id);
  const [filter, setFilter] = useState<VendorOrderFilter>("all");
  const orders = useQuery({ queryKey: ordersKey, queryFn: listVendorOrders, enabled: !loading && Boolean(user?.id) });
  const update = useMutation({ mutationFn: transitionVendorOrder, onSuccess: () => { toast.success("Order updated and student notified."); void queryClient.invalidateQueries({ queryKey: ordersKey }); }, onError: error => toast.error(error instanceof Error ? error.message : "The order status could not be updated.") });
  const visibleOrders = filterVendorOrders(orders.data ?? [], filter);
  const filterLabel = vendorOrderFilterOptions.find(option => option.value === filter)?.label.toLowerCase() ?? "selected";
  return <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace"><WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}><div className="mx-auto max-w-7xl"><PageIntro eyebrow="FULFILLMENT" title="Orders" description="Review each item, then move valid requests through the controlled pickup lifecycle." />{orders.isLoading ? <div className="mt-7 space-y-3"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></div> : isStalledWithoutData(orders) ? <div className="mt-7"><OfflinePanel title="You are offline" detail="Reconnect to load your fulfillment queue." onRetry={() => orders.refetch()} /></div> : orders.isError ? <div className="mt-7"><EmptyPanel title="Orders could not be loaded" detail="Please try again to review your vendor queue." action={{ label: "Try again", onClick: () => orders.refetch() }} /></div> : orders.data?.length ? <><div className="mt-7 flex flex-wrap gap-2" aria-label="Filter orders by status">{vendorOrderFilterOptions.map(option => <Button key={option.value} size="sm" variant={filter === option.value ? "default" : "outline"} onClick={() => setFilter(option.value)} className={filter === option.value ? "" : "bg-card"}>{option.label}</Button>)}</div><p className="mt-4 text-sm font-semibold text-muted-foreground" aria-live="polite">{visibleOrders.length} {filterLabel} order{visibleOrders.length === 1 ? "" : "s"}</p>{visibleOrders.length ? <div className="mt-3 space-y-3">{visibleOrders.map(order => <article key={order.id} className="rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><p className="text-xs font-bold tracking-[0.08em] text-muted-foreground">{order.orderNumber}</p><h2 className="mt-1 text-lg font-extrabold">Pickup at {order.pickupLocation}</h2><p className="mt-1 text-sm text-muted-foreground">Placed {formatShortDate(order.placedAt)} · <span className="tabular-nums">{formatPeso(order.totalInCentavos)}</span></p><div className="mt-4 flex flex-wrap gap-2">{order.items.map(item => <span key={`${item.productName}-${item.size}`} className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-bold text-secondary-foreground">{item.quantity}× {item.productName} · {item.size}</span>)}</div></div><div className="flex flex-wrap items-center gap-2"><StatusBadge kind="order" value={order.status} /><StatusBadge kind="pickup" value={order.pickupStatus} /><VendorOrderTransitionControl status={order.status} isPending={update.isPending} onStatusChange={status => update.mutate({ orderId: order.id, status })} /></div></div></article>)}</div> : <div className="mt-5"><EmptyPanel title={`No ${filterLabel} orders`} detail="Choose another status to review a different part of your fulfillment queue." action={filter === "all" ? undefined : { label: "Show all orders", onClick: () => setFilter("all") }} /></div>}</> : <div className="mt-7"><EmptyPanel title="No orders need attention" detail="Incoming student order requests will appear in this workspace." /></div>}</div></WorkspaceGate></DashboardLayout>;
}
