import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { MetricCard } from "@/components/campuswear/MetricCard";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { WorkspacePage } from "@/components/campuswear/WorkspacePage";
import { WorkspacePanel } from "@/components/campuswear/WorkspacePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso } from "@/lib/format";
import { buildVendorReport } from "@/lib/vendorReportMetrics";
import { listVendorInventory, listVendorOrders, vendorInventoryQueryKey, vendorOrdersQueryKey } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

export default function VendorReports() {
  const { user, loading } = useAuth();
  // Same query keys as the Orders and Inventory pages, so TanStack reuses the cache rather than
  // issuing a second request.
  const orders = useQuery({ queryKey: vendorOrdersQueryKey(user?.id), queryFn: listVendorOrders, enabled: !loading && Boolean(user?.id) });
  const inventory = useQuery({ queryKey: vendorInventoryQueryKey(user?.id), queryFn: listVendorInventory, enabled: !loading && Boolean(user?.id) });

  const report = buildVendorReport(orders.data, inventory.data);

  return (
    <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace">
      <WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}>
        <WorkspacePage eyebrow="OPERATIONS REPORT" title="Reports" description="Every metric below is derived from your current CampusWear orders and inventory.">
          {orders.isLoading || inventory.isLoading ? (
            <div className="mt-7 grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 rounded-[var(--radius)]" />
              <Skeleton className="h-72 rounded-[var(--radius)]" />
            </div>
          ) : isStalledWithoutData(orders) || isStalledWithoutData(inventory) ? (
            <div className="mt-7"><OfflinePanel title="You are offline" detail="Reconnect to rebuild your operational report." onRetry={() => { orders.refetch(); inventory.refetch(); }} /></div>
          ) : orders.isError || inventory.isError ? (
            <div className="mt-7"><EmptyPanel title="Report data is unavailable" detail="Please refresh the workspace to load your operational summary." action={{ label: "Try again", onClick: () => { orders.refetch(); inventory.refetch(); } }} /></div>
          ) : report.totalOrders === 0 ? (
            /*
              Success with no orders is not an error and not a zeroed dashboard. Three ₱0 cards and
              a flat seven-bar chart would imply a measurement rather than an absence.
            */
            <div className="mt-7"><EmptyPanel title="No orders to report yet" detail="Your operational report builds itself from real student orders. As soon as the first order arrives, sales, fulfilment, and product figures appear here." /></div>
          ) : (
            <>
              <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Order and sales summary">
                <MetricCard value={report.totalOrders} label="Total orders" />
                <MetricCard value={formatPeso(report.completedSalesInCentavos)} label="Completed order sales" tone="primary" />
                <MetricCard value={formatPeso(report.averageOrderValueInCentavos)} label="Average completed order" />
                <MetricCard value={`${report.fulfilmentRatePercent}%`} label="Fulfilment rate" />
                <MetricCard value={report.statusCounts.pending} label="Pending orders" />
                <MetricCard value={report.inventoryNeedingAttention} label="Low or out of stock sizes" tone="warning" />
              </section>

              <section className="mt-4 grid gap-4 sm:grid-cols-2" aria-label="Closed order outcomes">
                <MetricCard value={report.statusCounts.completed} label="Completed orders" />
                <MetricCard value={report.statusCounts.cancelled + report.statusCounts.rejected} label="Cancelled or rejected" tone="warning" />
              </section>

              <WorkspacePanel as="section" className="mt-7" aria-labelledby="order-pipeline-title">
                <h2 id="order-pipeline-title" className="font-extrabold">Order pipeline</h2>
                <p className="mt-1 text-xs text-muted-foreground">Current order counts by lifecycle state.</p>

                {/*
                  Horizontal bars so all seven labels read left-to-right at any width — rotating
                  them would still collide at 375px. The SVG is hidden from assistive tech and the
                  same numbers are exposed as a real table below it, so the data never depends on
                  seeing the chart.
                */}
                <div className="mt-5 h-[280px]" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.statusDistribution} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={86} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {report.statusDistribution.map(slice => (
                          <Cell key={slice.status} fill="var(--primary)" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <table className="sr-only">
                  <caption>Order counts by lifecycle state</caption>
                  <thead>
                    <tr><th scope="col">Status</th><th scope="col">Orders</th></tr>
                  </thead>
                  <tbody>
                    {report.statusDistribution.map(slice => (
                      <tr key={slice.status}><th scope="row">{slice.label}</th><td>{slice.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </WorkspacePanel>

              <WorkspacePanel as="section" className="mt-4" aria-labelledby="units-sold-title">
                <h2 id="units-sold-title" className="font-extrabold">Units sold by product</h2>
                <p className="mt-1 text-xs text-muted-foreground">Counted across every order in this workspace, from the items recorded on each order.</p>
                {report.unitsSoldByProduct.length ? (
                  <table className="mt-4 w-full text-left text-sm">
                    <thead className="border-b border-border text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      <tr><th scope="col" className="py-2">Product</th><th scope="col" className="py-2 text-right">Units sold</th></tr>
                    </thead>
                    <tbody>
                      {report.unitsSoldByProduct.map(entry => (
                        <tr key={entry.productName} className="border-b border-border/60 last:border-0">
                          <th scope="row" className="py-2.5 pr-3 font-semibold">{entry.productName}</th>
                          <td className="py-2.5 text-right font-bold tabular-nums">{entry.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">No order items have been recorded yet.</p>
                )}
              </WorkspacePanel>
            </>
          )}
        </WorkspacePage>
      </WorkspaceGate>
    </DashboardLayout>
  );
}
