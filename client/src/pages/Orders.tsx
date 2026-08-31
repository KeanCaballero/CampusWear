import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { OrderTimeline } from "@/components/campuswear/OrderTimeline";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatPeso, formatShortDate } from "@/lib/format";
import { PickupCode } from "@/components/campuswear/PickupCode";
import {
  isStoppedOrderStatus,
  showsCompletedAt,
  showsPickupCode,
  showsPickupDetails,
  studentTerminalExplanation,
  terminalNote,
} from "@/lib/orderPresentation";
import { listStudentOrders, studentOrdersQueryKey, type StudentOrder } from "@/lib/supabaseCatalog";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, CircleSlash, MapPin, ReceiptText } from "lucide-react";
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
        {orders.isLoading ? <div className="mt-7 space-y-4"><Skeleton className="h-76 rounded-2xl" /><Skeleton className="h-76 rounded-2xl" /></div> : isStalledWithoutData(orders) ? <div className="mt-7"><OfflinePanel title="You are offline" detail="Reconnect to load your orders and pickup status." onRetry={() => orders.refetch()} /></div> : orders.isError ? <div className="mt-7"><EmptyPanel title="Orders could not be loaded" detail="We could not load your order history right now. Please try again." action={{ label: "Try again", onClick: () => orders.refetch() }} /></div> : orders.data?.length ? (
          <section className="mt-7 space-y-5" aria-label="Your orders">
            {orders.data.map(order => <OrderCard key={order.id} order={order} />)}
          </section>
        ) : <div className="mt-7"><EmptyPanel title="No orders yet" detail="Your requests will appear here after you choose a size and submit pickup details." action={{ label: "Browse catalog", onClick: () => setLocation("/shop") }} /></div>}
      </main>
    </StudentShell>
  );
}

function OrderCard({ order }: { order: StudentOrder }) {
  // Every presentation decision below comes from one shared module, so the cart, this page and the
  // vendor queue cannot drift into contradicting each other about what a state means.
  const stopped = isStoppedOrderStatus(order.status);
  const showsPickup = showsPickupDetails(order.status);
  const closing = terminalNote(order.status);
  const explanation = studentTerminalExplanation(order.status);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className="campus-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.08em] text-muted-foreground"><ReceiptText className="size-4 text-primary" aria-hidden="true" />{order.orderNumber}</p>
          <h2 className="mt-2 text-lg font-extrabold tracking-[-0.035em]">{order.vendorName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{order.schoolName} · {itemCount} {itemCount === 1 ? "item" : "items"}</p>
        </div>
        {/*
          Only the order status is shown. The pickup-status badge that used to sit here was derived
          entirely from this same value, so it could only restate it or — on a pending or cancelled
          order, where 'scheduled' is just the column default — contradict it.
        */}
        <div className="flex flex-wrap gap-2"><StatusBadge kind="order" value={order.status} /></div>
      </div>

      <ul className="divide-y divide-border" aria-label="Items in this order">
        {order.items.map((item, index) => (
          <li key={`${item.productName}-${item.size}-${index}`} className="flex items-start justify-between gap-4 px-5 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug">{item.productName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Size {item.size} · <span className="tabular-nums">Qty × {item.quantity}</span>
              </p>
            </div>
            <p className="shrink-0 text-sm font-extrabold tabular-nums">{formatPeso(item.lineTotalInCentavos)}</p>
          </li>
        ))}
      </ul>

      <div className={`grid gap-px bg-border ${showsPickup ? "sm:grid-cols-2" : ""}`}>
        {showsPickup && (
          <div className="flex gap-3 bg-card p-4"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0"><span className="block text-xs font-semibold text-muted-foreground">Collect at</span><strong className="mt-1 block text-sm leading-5">{order.pickupLocation}</strong></span></div>
        )}
        <div className="bg-card p-4"><span className="block text-xs font-semibold text-muted-foreground">Order total</span><strong className="mt-1 block text-lg font-extrabold tabular-nums text-primary">{formatPeso(order.totalInCentavos)}</strong></div>
      </div>

      <div className="p-5 sm:p-6">
        {stopped ? (
          // A stopped order never reaches the pickup stages, so a five-step progress bar frozen at
          // step one would imply it is still moving. The terminal state is stated instead.
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4" role="status">
            <CircleSlash className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold">{closing}</p>
              {/* No reason is shown: the schema records none, so inventing one would be a lie. */}
              {explanation && <p className="mt-1 text-xs leading-5 text-muted-foreground">{explanation}</p>}
            </div>
          </div>
        ) : (
          <>
            {showsPickupCode(order.status) && (
              <div className="mb-5"><PickupCode orderNumber={order.orderNumber} pickupLocation={order.pickupLocation} /></div>
            )}
            <OrderTimeline status={order.status} />
          </>
        )}

        {showsCompletedAt(order.status, order.completedAt) && (
          <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CalendarCheck2 className="size-4 text-primary" aria-hidden="true" />
            Collected on {formatShortDate(order.completedAt)}
          </p>
        )}
      </div>
    </article>
  );
}
