import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { useIsOffline } from "@/components/campuswear/OfflineNotice";
import { isStalledWithoutData, isWriteBlocked } from "@/lib/queryState";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { PickupPlaque } from "@/components/campuswear/PickupPlaque";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatPeso } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  cartItemCount,
  cartPickupLocationsQueryKey,
  cartQueryKey,
  cartStoreNames,
  cartTotalInCentavos,
  checkoutCart,
  CheckoutStockConflictError,
  groupCartByStore,
  listCart,
  listPickupLocationsForStores,
  orderableCartLines,
  updateCartItem,
  UserFacingError,
  type CartLine,
  type PlacedOrder,
} from "@/lib/supabaseCatalog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Minus, Plus, Store, Trash2, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { z } from "zod";

// Mirrors the database rule in create_order_from_cart: char_length(trim(...)) >= 2.
// The client check is a courtesy; the database stays authoritative.
const checkoutSchema = z.object({ pickupLocation: z.string().trim().min(2, "Tell us where you plan to collect your order.").max(160) });
type CheckoutForm = z.infer<typeof checkoutSchema>;

const MAX_QUANTITY = 10;
type Phase = "cart" | "checkout" | "placed";

export default function Cart() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const queryKey = cartQueryKey(user?.id);
  const cart = useQuery({ queryKey, queryFn: listCart, enabled: !authLoading && Boolean(user) });

  const [phase, setPhase] = useState<Phase>("cart");
  const [placed, setPlaced] = useState<PlacedOrder[]>([]);
  const [placedStores, setPlacedStores] = useState<string[]>([]);
  const [conflict, setConflict] = useState<CheckoutStockConflictError | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  const form = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: { pickupLocation: "" } });

  const items = cart.data ?? [];
  const orderable = orderableCartLines(items);
  const unavailable = items.filter(line => line.isUnavailable);
  const total = cartTotalInCentavos(items);
  const count = cartItemCount(items);
  const storeNames = cartStoreNames(items);
  const groups = groupCartByStore(items);
  // A cached cart stays readable while offline, but nothing may be written from it. Connectivity
  // is read from onlineManager (via useIsOffline) because a settled query never pauses on its
  // own when the network drops — observed in production with the checkout button still enabled.
  const isOffline = useIsOffline();
  const isFrozen = isWriteBlocked(cart, isOffline);

  /*
    The stores' own declared collection points. One small query, keyed by the store names already
    derived from the cart, so it is cached and shared rather than refetched per render. A failure
    here must never block checkout: the UI falls back to the free-text field it has always had.
  */
  const pickupLocations = useQuery({
    queryKey: cartPickupLocationsQueryKey(storeNames),
    queryFn: () => listPickupLocationsForStores(storeNames),
    enabled: storeNames.length > 0,
  });
  const pickupOptions = Array.from(new Set((pickupLocations.data ?? []).map(entry => entry.pickupLocation)));

  const update = useMutation({
    mutationFn: updateCartItem,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: error => toast.error(error instanceof UserFacingError ? error.message : "We could not update your cart."),
  });

  const checkout = useMutation({
    mutationFn: ({ pickupLocation }: CheckoutForm) => checkoutCart(pickupLocation),
    onSuccess: orders => {
      setPlaced(orders);
      setPlacedStores(storeNames);
      setConflict(null);
      setFailure(null);
      setPhase("placed");
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["supabase-catalog"] });
    },
    onError: error => {
      // A stock refusal names the exact item. Anything else gets safe copy — the raw PostgREST
      // text never reaches the student.
      if (error instanceof CheckoutStockConflictError) {
        setConflict(error);
        setFailure(null);
        setPhase("cart");
        void queryClient.invalidateQueries({ queryKey });
        return;
      }
      setConflict(null);
      setFailure(error instanceof UserFacingError ? error.message : "We could not place your order. Please try again.");
    },
  });

  // Moving between review and pickup is a view change, so send focus to the new heading.
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  function goToCheckout() {
    setConflict(null);
    setFailure(null);
    setPhase("checkout");
  }

  if (phase === "placed") {
    return (
      <StudentShell>
        <main className="container py-6 sm:py-9">
          <div ref={headingRef} tabIndex={-1} className="outline-none">
            <OrderPlaced orders={placed} storeNames={placedStores} onTrack={() => setLocation("/orders")} />
          </div>
        </main>
      </StudentShell>
    );
  }

  if (cart.isLoading) {
    return (
      <CartFrame>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </CartFrame>
    );
  }

  if (isStalledWithoutData(cart)) {
    return (
      <CartFrame>
        <div className="mt-7">
          <OfflinePanel title="You are offline" detail="Reconnect to load the items in your cart." onRetry={() => cart.refetch()} />
        </div>
      </CartFrame>
    );
  }

  if (cart.isError) {
    return (
      <CartFrame>
        <div className="mt-7">
          <EmptyPanel title="Your cart could not be loaded" detail="We could not confirm the selected items right now. Please try again." action={{ label: "Try again", onClick: () => cart.refetch() }} />
        </div>
      </CartFrame>
    );
  }

  if (!items.length) {
    return (
      <CartFrame>
        <div className="mt-7">
          <EmptyPanel title="Your cart is empty" detail="Browse your school's authorized stores and pick a size to start a pickup request." action={{ label: "Browse uniforms", onClick: () => setLocation("/shop") }} />
        </div>
      </CartFrame>
    );
  }

  const reviewing = phase === "checkout";
  /*
    Lines the catalogue already reports as out of stock. `get_public_catalog` derives availability
    from `inventory.quantity <= 0`, so this is the store's real position — not a guess.

    These used to count toward the total and reach checkout, where create_order_from_cart locked the
    rows and raised "Insufficient stock". The student was told about a problem the page already knew
    about, one item at a time, after committing. Blocking here surfaces it up front.

    Note the deliberate limit: `low_stock` is NOT blocked. The catalogue exposes an availability
    LABEL, never a number, so there is no way to know whether a low-stock line has enough for the
    requested quantity. Claiming "only N left" would require inventing N. The database stays
    authoritative for that case and its typed stock conflict still handles it.
  */
  const soldOut = orderable.filter(line => line.availability === "out_of_stock");
  const blocksCheckout = isFrozen || !orderable.length || soldOut.length > 0;

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          {reviewing ? (
            <div>
              <button
                onClick={() => setPhase("cart")}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-campus-blue transition-colors hover:text-primary"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to cart
              </button>
              <h1 className="mt-1 text-[27px] font-extrabold tracking-[-0.04em]">Checkout</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Confirm what you are collecting and where.</p>
            </div>
          ) : (
            <PageIntro
              eyebrow="PICKUP REQUEST"
              title="Your cart"
              description="Check your sizes before sending this to the store."
              actions={
                <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                  <Link href="/shop">Continue shopping</Link>
                </Button>
              }
            />
          )}
        </div>

        {isFrozen && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="status">
            <WifiOff className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold text-destructive">{isOffline ? "You are offline" : "Your cart could not refresh"}</p>
              <p className="mt-1 text-xs leading-5 text-destructive/90">
                {isOffline
                  ? "This is your saved cart. Reconnect to check stock and place your order."
                  : "We could not refresh your cart just now. This is your last saved view, so checkout is paused."}
              </p>
              <Button size="sm" variant="outline" className="mt-3 min-h-11" onClick={() => cart.refetch()}>
                {isOffline ? "Try reconnecting" : "Try again"}
              </Button>
            </div>
          </div>
        )}

        {conflict && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold text-destructive">
                {conflict.productName ? `${conflict.productName}${conflict.size ? ` (size ${conflict.size})` : ""} does not have enough stock` : "One item does not have enough stock"}
              </p>
              <p className="mt-1 text-xs leading-5 text-destructive/90">
                The store's stock changed while this was in your cart. Lower the quantity or remove the item, then place
                your order again. Nothing was ordered and your cart has not changed.
              </p>
            </div>
          </div>
        )}

        {failure && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold text-destructive">We could not place your order</p>
              <p className="mt-1 text-xs leading-5 text-destructive/90">{failure}</p>
            </div>
          </div>
        )}

        {Boolean(soldOut.length) && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold text-destructive">
                {soldOut.length === 1 ? "One item is out of stock" : `${soldOut.length} items are out of stock`}
              </p>
              <p className="mt-1 text-xs leading-5 text-destructive/90">
                The store has none of {soldOut.length === 1 ? "this size" : "these sizes"} left, so this order cannot be
                placed yet. Remove {soldOut.length === 1 ? "it" : "them"} to continue — the rest of your cart is fine.
              </p>
              <ul className="mt-2 space-y-1">
                {soldOut.map(line => (
                  <li key={line.variantId} className="text-xs font-semibold text-destructive">
                    {line.productName}{line.size ? ` · size ${line.size}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {Boolean(unavailable.length) && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4" role="status">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold">
                {unavailable.length === 1 ? "One item is no longer available" : `${unavailable.length} items are no longer available`}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The store removed {unavailable.length === 1 ? "it" : "them"} from the catalog. Remove{" "}
                {unavailable.length === 1 ? "it" : "them"} to continue — nothing else in your cart is affected.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4" aria-label={reviewing ? "Order review" : "Cart items"}>
            {groups.map((group, groupIndex) => (
              <div key={group.vendorName ?? `unavailable-${groupIndex}`} className="campus-panel overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                  <Store className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <h2 className="min-w-0 truncate text-[13px] font-extrabold tracking-[-0.01em]">
                    {group.vendorName ?? "No longer available"}
                  </h2>
                  <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {group.lines.length} {group.lines.length === 1 ? "item" : "items"}
                  </span>
                </div>

                {group.lines.map((line, index) => (
                  <CartRow
                    key={line.variantId}
                    line={line}
                    index={groupIndex + index}
                    readOnly={reviewing || isFrozen}
                    pending={update.isPending}
                    highlighted={isConflictLine(conflict, line)}
                    onChange={quantity => update.mutate({ variantId: line.variantId, quantity })}
                  />
                ))}
              </div>
            ))}
          </section>

          <aside className="campus-panel h-fit p-5 sm:p-6 lg:sticky lg:top-22">
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em]">Order summary</h2>

            <dl className="mt-4">
              <div className="flex justify-between gap-4 py-1.5 text-sm">
                <dt className="font-semibold text-muted-foreground">
                  Subtotal · {count} {count === 1 ? "item" : "items"}
                </dt>
                <dd className="font-bold tabular-nums">{formatPeso(total)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1.5 text-sm">
                <dt className="font-semibold text-muted-foreground">Campus pickup</dt>
                <dd className="font-bold">No delivery fee</dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-border pt-4">
                <dt className="text-[15px] font-extrabold">Total</dt>
                <dd className="text-2xl font-extrabold tabular-nums tracking-[-0.03em] text-primary">{formatPeso(total)}</dd>
              </div>
            </dl>

            {reviewing ? (
              <form className="mt-5" onSubmit={form.handleSubmit(values => checkout.mutate(values))} noValidate>
                <PickupPlaque storeNames={storeNames} locations={pickupLocations.data ?? []} compact />

                <div className="mt-4">
                  <label className="block text-sm font-extrabold" htmlFor="pickupLocation">
                    Which counter will you collect from?
                  </label>
                  <p id="pickup-location-help" className="mt-1 text-xs leading-5 text-muted-foreground">
                    {pickupOptions.length
                      ? "These are the collection points your stores use. The store confirms when your order is ready to collect."
                      : "Name the campus point you plan to collect from. The store confirms when your order is ready."}
                  </p>

                  {/*
                    A controlled choice whenever the stores have declared real pickup points, so the
                    student picks a place that exists instead of typing one. When none can be
                    resolved the original free-text field is kept — inventing options would be worse
                    than asking.
                  */}
                  {pickupOptions.length ? (
                    <Select
                      value={form.watch("pickupLocation") || undefined}
                      onValueChange={value => form.setValue("pickupLocation", value, { shouldValidate: true })}
                    >
                      <SelectTrigger
                        id="pickupLocation"
                        className="mt-2.5 min-h-11 bg-card"
                        aria-describedby="pickup-location-help"
                        aria-invalid={form.formState.errors.pickupLocation ? true : undefined}
                      >
                        <SelectValue placeholder="Choose a collection point" />
                      </SelectTrigger>
                      <SelectContent>
                        {pickupOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="pickupLocation"
                      className="mt-2.5 min-h-11 bg-card"
                      placeholder="e.g. Student Center counter"
                      aria-describedby="pickup-location-help"
                      aria-invalid={form.formState.errors.pickupLocation ? true : undefined}
                      {...form.register("pickupLocation")}
                    />
                  )}
                  <p className="mt-1.5 min-h-5 text-xs font-semibold text-destructive" role="alert">
                    {form.formState.errors.pickupLocation?.message}
                  </p>
                </div>

                {storeNames.length > 1 && (
                  <p className="mt-1 flex items-start gap-2 rounded-xl border border-campus-gold/45 bg-campus-gold/10 p-3 text-xs leading-5">
                    <Store className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      Your cart has items from <strong>{storeNames.length} stores</strong>, so this creates{" "}
                      {storeNames.length} separate pickup requests — one per store.
                    </span>
                  </p>
                )}

                <Button type="submit" disabled={checkout.isPending || blocksCheckout} className="mt-4 min-h-12 w-full">
                  {checkout.isPending ? "Placing order…" : "Place order"}
                </Button>
                <Button type="button" variant="outline" className="mt-2.5 min-h-11 w-full" onClick={() => setPhase("cart")}>
                  Back to cart
                </Button>

                <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
                  Stock is confirmed again the moment you place this order. Nothing is charged online — you pay the store
                  when you collect.
                </p>
              </form>
            ) : (
              <div className="mt-5">
                <PickupPlaque storeNames={storeNames} locations={pickupLocations.data ?? []} compact />

                <Button onClick={goToCheckout} disabled={blocksCheckout} className="mt-4 min-h-12 w-full gap-2">
                  Proceed to checkout
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <Button asChild variant="outline" className="mt-2.5 min-h-11 w-full">
                  <Link href="/shop">Continue shopping</Link>
                </Button>

                {!orderable.length ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Remove the unavailable {unavailable.length === 1 ? "item" : "items"} above to continue.
                  </p>
                ) : soldOut.length ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Remove the out-of-stock {soldOut.length === 1 ? "item" : "items"} above to continue.
                  </p>
                ) : null}

                <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
                  No online payment. You pay the store when you collect your order.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </StudentShell>
  );
}

function isConflictLine(conflict: CheckoutStockConflictError | null, line: CartLine): boolean {
  if (!conflict?.productName) return false;
  if (conflict.productName !== line.productName) return false;
  return !conflict.size || conflict.size === line.size;
}

function CartFrame({ children }: { children: React.ReactNode }) {
  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <PageIntro
          eyebrow="PICKUP REQUEST"
          title="Your cart"
          description="Check your sizes before sending this to the store."
          actions={
            <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link href="/shop">Continue shopping</Link>
            </Button>
          }
        />
        {children}
      </main>
    </StudentShell>
  );
}

function CartRow({
  line,
  index,
  readOnly,
  pending,
  highlighted,
  onChange,
}: {
  line: CartLine;
  index: number;
  readOnly: boolean;
  pending: boolean;
  highlighted: boolean;
  onChange: (quantity: number) => void;
}) {
  const lineTotal = line.unitPriceInCentavos * line.quantity;

  if (line.isUnavailable) {
    return (
      <article className="flex gap-3 border-b border-border p-4 last:border-b-0 sm:gap-4">
        <div className="grid size-20 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground sm:size-24">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">This item is no longer available</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The store removed it from the catalog, so it cannot be ordered. Remove it to continue.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              Qty {line.quantity}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onChange(0)}
              className="min-h-11 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove item
            </Button>
          </div>
        </div>
      </article>
    );
  }

  const soldOut = line.availability === "out_of_stock";

  return (
    <article
      className={`flex gap-3 border-b border-border p-4 last:border-b-0 sm:gap-4 ${highlighted ? "border-l-4 border-l-destructive bg-destructive/5" : ""}`}
    >
      <ProductVisual
        name={line.productName}
        imageUrl={line.imageUrl}
        index={index}
        className="size-20 shrink-0 rounded-xl sm:size-24"
      />

      <div className="min-w-0 flex-1">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold leading-snug">{line.productName}</p>
            {line.vendorName && <p className="mt-1 text-xs font-semibold text-muted-foreground">{line.vendorName}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {line.size && (
                <span className="rounded-full border border-primary/35 px-2.5 py-1 text-[11px] font-bold text-primary">
                  Size {line.size}
                </span>
              )}
              <StatusBadge kind="inventory" value={line.availability} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-extrabold tabular-nums text-primary">{formatPeso(lineTotal)}</p>
            {line.quantity > 1 && (
              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{formatPeso(line.unitPriceInCentavos)} each</p>
            )}
          </div>
        </div>

        {readOnly ? (
          <p className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
            Qty {line.quantity}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-background"
              role="group"
              aria-label={`Quantity for ${line.productName}`}
            >
              <button
                type="button"
                onClick={() => onChange(Math.max(1, line.quantity - 1))}
                disabled={line.quantity <= 1 || pending}
                className="grid size-11 place-items-center rounded-l-xl transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <output className="grid w-10 place-items-center text-sm font-extrabold tabular-nums" aria-live="polite">
                {line.quantity}
              </output>
              <button
                type="button"
                onClick={() => onChange(line.quantity + 1)}
                disabled={pending || line.quantity >= MAX_QUANTITY || soldOut}
                className="grid size-11 place-items-center rounded-r-xl transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onChange(0)}
              className="min-h-11 gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${line.productName} from cart`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function OrderPlaced({ orders, storeNames, onTrack }: { orders: PlacedOrder[]; storeNames: string[]; onTrack: () => void }) {
  const multiple = orders.length > 1;

  return (
    <div className="campus-panel mx-auto max-w-2xl p-6 sm:p-9" role="status">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.04em]">
          {multiple ? `${orders.length} pickup requests placed` : "Order placed"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {multiple
            ? `Your cart had items from ${storeNames.length} stores, so each store received its own request.`
            : "The store has your request."}{" "}
          You will get a notification when it is ready to collect.
        </p>
      </div>

      <ul className="mt-6 space-y-3">
        {orders.map(order => (
          <li key={order.id} className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200">Order number</p>
                <p className="mt-0.5 truncate text-[15px] font-extrabold tabular-nums tracking-[0.02em]">{order.orderNumber}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[11px] font-bold">
                Pending
              </span>
            </div>
            <div className="space-y-2 p-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-semibold text-muted-foreground">Total</span>
                <span className="font-bold tabular-nums">{formatPeso(order.totalInCentavos)}</span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="shrink-0 font-semibold text-muted-foreground">Pickup</span>
                <span className="min-w-0 break-words text-right font-bold">{order.pickupLocation}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {Boolean(storeNames.length) && (
        <div className="mt-4">
          <PickupPlaque storeNames={storeNames} compact />
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-campus-gold/45 bg-campus-gold/10 p-3 text-xs leading-5">
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Wait for the <strong>ready to collect</strong> notification before going to the store. Bring your university ID.
        </span>
      </p>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button onClick={onTrack} className="min-h-12 sm:min-w-40">
          Track order
        </Button>
        <Button asChild variant="outline" className="min-h-12 sm:min-w-40">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
