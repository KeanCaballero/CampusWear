import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, formatShortDate } from "@/lib/format";
import {
  getVendorPickupLocation,
  updateVendorPickupLocation,
  vendorDashboardData,
  vendorDashboardQueryKey,
  vendorPickupLocationQueryKey,
} from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ArrowUpRight, Boxes, ClipboardList, PackageCheck, Wallet } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

export default function VendorDashboard() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const dashboardKey = vendorDashboardQueryKey(user?.id);
  const pickupLocationKey = vendorPickupLocationQueryKey(user?.id);
  const dashboard = useQuery({
    queryKey: dashboardKey,
    queryFn: vendorDashboardData,
    enabled: !loading && Boolean(user?.id),
  });
  const pickupLocation = useQuery({
    queryKey: pickupLocationKey,
    queryFn: getVendorPickupLocation,
    enabled: !loading && Boolean(user?.id),
  });
  const [pickupDraft, setPickupDraft] = useState("");

  useEffect(() => {
    if (pickupLocation.data !== undefined) setPickupDraft(pickupLocation.data);
  }, [pickupLocation.data]);

  const savePickupLocation = useMutation({
    mutationFn: updateVendorPickupLocation,
    onSuccess: () => {
      toast.success("Pickup location updated.");
      void queryClient.invalidateQueries({ queryKey: pickupLocationKey });
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Pickup location could not be updated."),
  });

  const submitPickupLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    savePickupLocation.mutate(pickupDraft);
  };

  const metrics = [
    {
      label: "Today’s sales",
      value: formatPeso(dashboard.data?.todaysSalesInCentavos ?? 0),
      detail: "Completed pickups today",
      href: "/vendor/reports",
      icon: Wallet,
      chip: "bg-secondary text-campus-blue",
      emphasis: false,
    },
    {
      label: "Pending orders",
      value: dashboard.data?.pendingOrders ?? 0,
      detail: "Needs review",
      href: "/vendor/orders",
      icon: ClipboardList,
      chip: "bg-secondary text-primary",
      emphasis: false,
    },
    {
      label: "Ready for pickup",
      value: dashboard.data?.readyForPickup ?? 0,
      detail: "Waiting on students",
      href: "/vendor/orders",
      icon: PackageCheck,
      chip: "bg-campus-gold/20 text-amber-900",
      emphasis: false,
    },
    {
      label: "Low stock alerts",
      value: dashboard.data?.lowStock ?? 0,
      detail: "Sizes at or below threshold",
      href: "/vendor/inventory",
      icon: AlertTriangle,
      chip: "bg-destructive/10 text-destructive",
      emphasis: true,
    },
  ];

  const recentOrders = dashboard.data?.recentOrders ?? [];
  const lowStockItems = dashboard.data?.lowStockItems ?? [];

  return (
    <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace">
      <WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}>
        <div className="mx-auto max-w-[1280px]">
          <PageIntro
            eyebrow="VENDOR WORKSPACE"
            title="Overview"
            description="Welcome back. Here’s what needs your attention at the store today."
            actions={<Link href="/vendor/orders" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-secondary">Review orders <ArrowUpRight className="size-4" aria-hidden="true" /></Link>}
          />

          {dashboard.isLoading ? (
            <>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                <Skeleton className="h-[420px] rounded-xl lg:col-span-2" />
                <Skeleton className="h-[420px] rounded-xl" />
              </div>
            </>
          ) : isStalledWithoutData(dashboard) ? (
            <div className="mt-8">
              <OfflinePanel title="You are offline" detail="Reconnect to load today's store activity." onRetry={() => dashboard.refetch()} />
            </div>
          ) : dashboard.isError ? (
            <div className="mt-8">
              <EmptyPanel title="The dashboard is unavailable" detail="Your workspace data could not be loaded. Please try again." action={{ label: "Try again", onClick: () => dashboard.refetch() }} />
            </div>
          ) : (
            <>
              <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Store priorities">
                {metrics.map(metric => {
                  const Icon = metric.icon;

                  return (
                    <Link
                      key={metric.label}
                      href={metric.href}
                      className={`group rounded-xl border bg-card p-5 transition-shadow hover:shadow-[0_4px_12px_rgb(15_39_71/0.08)] ${metric.emphasis ? "border-destructive/30" : "border-border"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[11px] font-bold uppercase tracking-[0.09em] ${metric.emphasis ? "text-destructive" : "text-muted-foreground"}`}>{metric.label}</span>
                        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${metric.chip}`}>
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                      </div>
                      <p className={`mt-5 text-[32px] font-extrabold leading-none tabular-nums tracking-[-0.03em] ${metric.emphasis ? "text-destructive" : "text-foreground"}`}>{metric.value}</p>
                      <p className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        {metric.detail}
                        <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </p>
                    </Link>
                  );
                })}
              </section>

              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-2" aria-label="Recent orders">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <div>
                      <h2 className="text-lg font-bold tracking-[-0.02em]">Recent orders</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">Status updates notify the student automatically.</p>
                    </div>
                    <Link href="/vendor/orders" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-campus-blue hover:underline">
                      View all <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  {recentOrders.length ? (
                    <>
                      <div className="hidden max-h-[420px] overflow-auto md:block">
                        <table className="w-full border-collapse text-left">
                          <thead className="sticky top-0 z-10 bg-muted">
                            <tr>
                              <th scope="col" className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Order</th>
                              <th scope="col" className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Pickup</th>
                              <th scope="col" className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Placed</th>
                              <th scope="col" className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Status</th>
                              <th scope="col" className="border-b border-border px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentOrders.map(order => (
                              <tr key={order.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50">
                                <td className="px-5 py-3.5 text-sm font-bold text-primary">{order.orderNumber}</td>
                                <td className="max-w-[220px] truncate px-5 py-3.5 text-sm text-foreground">{order.pickupLocation}</td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-sm text-muted-foreground">{formatShortDate(order.placedAt)}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex flex-wrap gap-1.5">
                                    <StatusBadge kind="order" value={order.status} />
                                    <StatusBadge kind="pickup" value={order.pickupStatus} />
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold tabular-nums">{formatPeso(order.totalInCentavos)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <ul className="divide-y divide-border md:hidden">
                        {recentOrders.map(order => (
                          <li key={order.id} className="px-5 py-4">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="text-sm font-bold text-primary">{order.orderNumber}</p>
                              <p className="text-sm font-bold tabular-nums">{formatPeso(order.totalInCentavos)}</p>
                            </div>
                            <p className="mt-1 text-sm">Pickup at {order.pickupLocation}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatShortDate(order.placedAt)}</p>
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              <StatusBadge kind="order" value={order.status} />
                              <StatusBadge kind="pickup" value={order.pickupStatus} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="p-5">
                      <EmptyPanel title="No orders yet" detail="New student orders will appear here as soon as they are placed." />
                    </div>
                  )}
                </section>

                <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" aria-label="Inventory alerts">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <div>
                      <h2 className="text-lg font-bold tracking-[-0.02em]">Inventory alert</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">Sizes at or below their threshold.</p>
                    </div>
                    <Boxes className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>

                  {lowStockItems.length ? (
                    <ul className="max-h-[420px] flex-1 divide-y divide-border overflow-y-auto">
                      {lowStockItems.map(item => (
                        <li key={item.variantId} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{item.productName} · {item.size}</p>
                            <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.06em] text-muted-foreground">SKU {item.sku}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`text-sm font-bold tabular-nums ${item.availability === "out_of_stock" ? "text-destructive" : "text-amber-900"}`}>
                              {item.quantity === 0 ? "Out of stock" : `${item.quantity} left`}
                            </p>
                            <Link href="/vendor/inventory" className="text-[11px] font-bold text-campus-blue hover:underline">Restock</Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex-1 p-5">
                      <EmptyPanel title="Stock levels are healthy" detail="No sizes are at or below their low-stock threshold right now." />
                    </div>
                  )}

                  <div className="border-t border-border p-3">
                    <Link href="/vendor/inventory" className="flex min-h-11 w-full items-center justify-center rounded-xl border border-campus-blue bg-card text-sm font-bold text-campus-blue transition-colors hover:bg-secondary">
                      View full inventory
                    </Link>
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6" aria-label="Pickup location">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-lg font-bold tracking-[-0.02em]">Pickup location</h2>
                    <p id="vendor-pickup-location-help" className="mt-1 text-xs leading-5 text-muted-foreground">Students see this location on their order and pickup status. Keep it specific and current.</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">Vendor-managed</span>
                </div>

                {pickupLocation.isLoading ? (
                  <Skeleton className="mt-4 h-12 w-full rounded-xl" />
                ) : isStalledWithoutData(pickupLocation) ? (
                  <p className="mt-4 text-sm font-semibold text-amber-900" role="status">You are offline, so the saved pickup location cannot be shown right now.</p>
                ) : pickupLocation.isError ? (
                  <p className="mt-4 text-sm text-destructive" role="alert">The pickup location could not be loaded. Refresh the page and try again.</p>
                ) : (
                  <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={submitPickupLocation}>
                    <label className="sr-only" htmlFor="vendor-pickup-location">Pickup location</label>
                    <Input
                      id="vendor-pickup-location"
                      value={pickupDraft}
                      onChange={event => setPickupDraft(event.target.value)}
                      maxLength={240}
                      required
                      minLength={3}
                      autoComplete="street-address"
                      aria-describedby="vendor-pickup-location-help"
                      className="min-h-12 bg-background"
                      placeholder="e.g. Main campus bookstore, ground floor"
                    />
                    <Button type="submit" disabled={savePickupLocation.isPending || pickupDraft.trim().length < 3} className="min-h-12 sm:w-auto">
                      {savePickupLocation.isPending ? "Saving…" : "Save location"}
                    </Button>
                  </form>
                )}
              </section>
            </>
          )}
        </div>
      </WorkspaceGate>
    </DashboardLayout>
  );
}
