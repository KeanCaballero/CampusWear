import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OrderTimeline } from "@/components/campuswear/OrderTimeline";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatPeso, formatShortDate } from "@/lib/format";
import { listStudentOrders, studentOrdersQueryKey } from "@/lib/supabaseCatalog";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, ReceiptText } from "lucide-react";
import { useLocation } from "wouter";

export default function Orders() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const queryKey = studentOrdersQueryKey(user?.id);
  const orders = useQuery({ queryKey, queryFn: listStudentOrders, enabled: !authLoading && Boolean(user) });

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <PageIntro eyebrow="ORDER HISTORY" title="Track your pickup." description="Each status is updated by your authorized campus vendor, from request through collection." />
        {orders.isLoading ? <div className="mt-7 space-y-4"><Skeleton className="h-76 rounded-2xl" /><Skeleton className="h-76 rounded-2xl" /></div> : orders.isError ? <div className="mt-7"><EmptyPanel title="Orders could not be loaded" detail="We could not load your order history right now. Please try again." action={{ label: "Try again", onClick: () => orders.refetch() }} /></div> : orders.data?.length ? (
          <section className="mt-7 space-y-5" aria-label="Your orders">
            {orders.data.map(order => (
              <article key={order.id} className="campus-panel overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.08em] text-muted-foreground"><ReceiptText className="size-4 text-primary" aria-hidden="true" />{order.orderNumber}</p>
                    <h2 className="mt-2 text-lg font-extrabold tracking-[-0.035em]">{order.items.map(item => `${item.productName} · ${item.size}`).join(", ")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{order.vendorName} · {order.schoolName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2"><StatusBadge kind="order" value={order.status} /><StatusBadge kind="pickup" value={order.pickupStatus} /></div>
                </div>
                <div className="grid gap-px bg-border sm:grid-cols-3">
                  <div className="flex gap-3 bg-card p-4"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0"><span className="block text-xs font-semibold text-muted-foreground">Pickup location</span><strong className="mt-1 block text-sm leading-5">{order.pickupLocation}</strong></span></div>
                  <div className="flex gap-3 bg-card p-4"><CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span><span className="block text-xs font-semibold text-muted-foreground">Pickup date</span><strong className="mt-1 block text-sm">{formatShortDate(order.pickupAt)}</strong></span></div>
                  <div className="bg-card p-4"><span className="block text-xs font-semibold text-muted-foreground">Order total</span><strong className="mt-1 block text-lg font-extrabold tabular-nums text-primary">{formatPeso(order.totalInCentavos)}</strong></div>
                </div>
                <div className="p-5 sm:p-6"><OrderTimeline status={order.status} /></div>
              </article>
            ))}
          </section>
        ) : <div className="mt-7"><EmptyPanel title="No orders yet" detail="Your requests will appear here after you choose a size and submit pickup details." action={{ label: "Browse catalog", onClick: () => setLocation("/shop") }} /></div>}
      </main>
    </StudentShell>
  );
}
