import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
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
import { AlertTriangle, ArrowRight, ArrowUpRight, ClipboardList, PackageCheck, Wallet } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { vendorNavigation } from "./workspace";

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
      label: "Orders needing action",
      value: dashboard.data?.pendingOrders ?? 0,
      detail: "Open the fulfillment queue",
      href: "/vendor/orders",
      icon: ClipboardList,
      tone: "bg-secondary text-primary",
    },
    {
      label: "Ready for pickup",
      value: dashboard.data?.readyForPickup ?? 0,
      detail: "Review collection status",
      href: "/vendor/orders",
      icon: PackageCheck,
      tone: "bg-violet-50 text-violet-800",
    },
    {
      label: "Low or out of stock",
      value: dashboard.data?.lowStock ?? 0,
      detail: "Check size-level inventory",
      href: "/vendor/inventory",
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-800",
    },
    {
      label: "Today’s completed sales",
      value: formatPeso(dashboard.data?.todaysSalesInCentavos ?? 0),
      detail: "Open sales reporting",
      href: "/vendor/reports",
      icon: Wallet,
      tone: "bg-emerald-50 text-emerald-800",
    },
  ];

  return (
    <DashboardLayout items={vendorNavigation} workspaceLabel="Vendor workspace">
      <WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}>
        <div className="mx-auto max-w-7xl">
          <PageIntro eyebrow="VENDOR WORKSPACE" title="Operational overview" description="Prioritize the orders, pickup information, and stock that need attention today." actions={<Link href="/vendor/orders" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-secondary">Review orders <ArrowUpRight className="size-4" aria-hidden="true" /></Link>} />

          {dashboard.isLoading ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}
            </div>
          ) : dashboard.isError ? (
            <div className="mt-7">
              <EmptyPanel title="The dashboard is unavailable" detail="Your workspace data could not be loaded. Please try again." action={{ label: "Try again", onClick: () => dashboard.refetch() }} />
            </div>
          ) : (
            <>
              <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Vendor priorities">
                {metrics.map(metric => {
                  const Icon = metric.icon;

                  return (
                    <Link
                      key={metric.label}
                      href={metric.href}
                      className="campus-panel campus-panel-interactive group p-5"
                    >
                      <span className={`grid size-10 place-items-center rounded-xl ${metric.tone}`}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <p className="mt-4 text-3xl font-extrabold tabular-nums tracking-[-0.045em]">{metric.value}</p>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">{metric.label}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
                        {metric.detail} <ArrowRight className="size-3.5" aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })}
              </section>

              <section className="campus-panel mt-8 p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="font-extrabold tracking-[-0.025em]">Pickup location</h2>
                    <p id="vendor-pickup-location-help" className="mt-1 text-xs leading-5 text-muted-foreground">Students see this location on their order and pickup status. Keep it specific and current.</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">Vendor-managed</span>
                </div>

                {pickupLocation.isLoading ? (
                  <Skeleton className="mt-4 h-11 w-full" />
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

              <section className="campus-panel mt-8 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-5">
                  <div>
                    <h2 className="font-extrabold tracking-[-0.025em]">Recent orders</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Status updates trigger student notifications.</p>
                  </div>
                  <Link href="/vendor/orders" className="inline-flex min-h-10 items-center text-sm font-bold text-primary hover:underline">Manage orders</Link>
                </div>

                {dashboard.data?.recentOrders.length ? (
                  <div className="divide-y divide-border">
                    {dashboard.data.recentOrders.map(order => (
                      <div key={order.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold tracking-[0.07em] text-muted-foreground">{order.orderNumber}</p>
                          <p className="mt-1 text-sm font-extrabold">Pickup at {order.pickupLocation}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatShortDate(order.placedAt)} · <span className="tabular-nums">{formatPeso(order.totalInCentavos)}</span></p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge kind="order" value={order.status} />
                          <StatusBadge kind="pickup" value={order.pickupStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyPanel title="No vendor orders yet" detail="New student requests will appear here when they are placed." />
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </WorkspaceGate>
    </DashboardLayout>
  );
}
