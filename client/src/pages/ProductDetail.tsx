import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { FavoriteButton } from "@/components/campuswear/FavoriteButton";
import { SizeGuide } from "@/components/campuswear/SizeGuide";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso } from "@/lib/format";
import { selectedVariantAvailabilityCopy } from "@/lib/productAvailabilityCopy";
import { addVariantToCart, cartQueryKey, getPublicCatalogProduct } from "@/lib/supabaseCatalog";
import { isFavorite } from "@/lib/favorites";
import { useFavorites } from "@/lib/useFavorites";
import { recordRecentlyViewed } from "@/lib/recentlyViewed";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Minus, Plus, ShoppingBag, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";

const MAX_QUANTITY = 10;

/** Shared chrome for every non-success state, so the back route is never lost. */
function ProductDetailFallback({ children }: { children: React.ReactNode }) {
  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-campus-blue hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to catalog
        </Link>
        <div className="mt-6">{children}</div>
      </main>
    </StudentShell>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/shop/:id");
  const [, setLocation] = useLocation();
  const productId = params?.id;
  const product = useQuery({
    queryKey: ["supabase-product", productId],
    queryFn: () => getPublicCatalogProduct(productId!),
    enabled: Boolean(productId),
  });
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { favorites, toggle } = useFavorites(user?.id);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);

  /*
    The confirmation reports what was actually added, not what was clicked: the mutation variables
    are read back in onSuccess, so a size or quantity that changed mid-flight cannot be
    misreported. It fires only from onSuccess, so a failed add can never look like a success.
  */
  const addToCart = useMutation({
    mutationFn: addVariantToCart,
    onSuccess: (_result, variables) => {
      const added = product.data?.variants.find(variant => variant.id === variables.variantId);
      const name = product.data?.name ?? "Item";
      toast.success("Added to cart", {
        description: `${name}${added?.size ? ` · Size ${added.size}` : ""} · Qty ${variables.quantity}`,
        action: { label: "View cart", onClick: () => setLocation("/cart") },
      });
      // The header badge reads this same cart key, so one invalidation updates both.
      void queryClient.invalidateQueries({ queryKey: cartQueryKey(user?.id) });
    },
    onError: error => toast.error(error instanceof Error ? error.message : "We could not update your cart."),
  });

  /*
    Recorded only once the product genuinely resolved, so a failed or missing product never enters
    the trail. Ids only — the row re-reads names and prices from the live catalogue.
  */
  useEffect(() => {
    if (product.data?.id) recordRecentlyViewed(user?.id, product.data.id);
  }, [product.data?.id, user?.id]);

  if (product.isLoading) {
    return (
      <StudentShell>
        <main className="container py-6 sm:py-9">
          <Skeleton className="h-5 w-40" />
          <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-9 w-3/4 rounded-lg" />
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </StudentShell>
    );
  }

  // A paused query with nothing cached (BUG-020): never fall through to "unavailable".
  if (isStalledWithoutData(product)) {
    return (
      <ProductDetailFallback>
        <OfflinePanel title="You are offline" detail="Reconnect to check this item's sizes and stock." onRetry={() => product.refetch()} />
      </ProductDetailFallback>
    );
  }

  if (product.isError) {
    return (
      <ProductDetailFallback>
        <EmptyPanel title="This product could not be loaded" detail="We could not confirm the latest availability. Please try again." action={{ label: "Try again", onClick: () => product.refetch() }} />
      </ProductDetailFallback>
    );
  }

  // Request succeeded, but the product is genuinely not in the active catalogue.
  if (!product.data) {
    return (
      <ProductDetailFallback>
        <EmptyPanel title="This product is unavailable" detail="It may have been removed from the active catalog. Browse the catalog for what is currently available." action={{ label: "Browse the catalog", onClick: () => setLocation("/shop") }} />
      </ProductDetailFallback>
    );
  }

  const productData = product.data;
  const selected = productData.variants.find(variant => variant.id === selectedVariantId)
    ?? productData.variants.find(variant => variant.availability !== "out_of_stock")
    ?? productData.variants[0];
  const canAdd = Boolean(selected && selected.availability !== "out_of_stock");
  const availabilityCopy = selectedVariantAvailabilityCopy(selected?.size, selected?.availability);
  const sellableSizes = productData.variants.filter(variant => variant.availability !== "out_of_stock").length;

  const chooseVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQuantity(1);
  };

  const submitToCart = () => {
    if (!selected) return;
    if (!isAuthenticated) {
      setLocation(`/auth?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
      return;
    }
    addToCart.mutate({ productId: productData.id, variantId: selected.id, quantity });
  };

  const ctaLabel = !canAdd ? "Out of stock" : addToCart.isPending ? "Adding to cart…" : "Add to cart";

  return (
    <StudentShell>
      {/* Extra bottom padding on mobile so the sticky action bar never covers content. */}
      <main className="container py-5 pb-40 sm:py-8 md:pb-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <li>
              <Link href="/shop" className="inline-flex min-h-11 items-center gap-1.5 text-campus-blue hover:underline">
                <ArrowLeft className="size-4 md:hidden" aria-hidden="true" />
                Catalog
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
            <li className="min-w-0 truncate text-foreground" aria-current="page">{productData.name}</li>
          </ol>
        </nav>

        <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
          <div className="md:sticky md:top-24 md:self-start">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ProductVisual name={productData.name} imageUrl={productData.imageUrl} className="aspect-square w-full" />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
              {productData.categoryName ?? "Campus essential"}
            </p>
            <div className="mt-1.5 flex items-start gap-3">
              <h1 className="min-w-0 flex-1 text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-3xl">{productData.name}</h1>
              <FavoriteButton
                productId={productData.id}
                productName={productData.name}
                isFavorite={isFavorite(favorites, productData.id)}
                onToggle={toggle}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-[28px] font-extrabold leading-none tabular-nums text-primary">{formatPeso(productData.priceInCentavos)}</p>
              {selected && <StatusBadge kind="inventory" value={selected.availability} />}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-muted/45 px-3.5 py-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <Store className="size-3.5 shrink-0" aria-hidden="true" />
                {productData.vendorName}
              </p>
              <p className="text-xs text-muted-foreground">{productData.schoolName}</p>
            </div>

            {productData.description && (
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{productData.description}</p>
            )}

            <fieldset className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <legend className="text-sm font-extrabold">Select a size</legend>
                <span className="text-xs font-semibold text-muted-foreground">
                  {sellableSizes} of {productData.variants.length} available
                </span>
              </div>
              <div className="mt-3"><SizeGuide sizes={productData.variants.map(variant => variant.size)} schoolName={productData.schoolName} /></div>
              <p className="mt-1 text-xs text-muted-foreground">Sizes that are sold out cannot be selected.</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {productData.variants.map(variant => {
                  const unavailable = variant.availability === "out_of_stock";
                  const active = variant.id === selected?.id;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => chooseVariant(variant.id)}
                      disabled={unavailable}
                      aria-pressed={active}
                      aria-describedby="selected-size-availability"
                      className={`min-h-12 min-w-12 rounded-xl border px-3.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue focus-visible:ring-offset-2 ${
                        // Sold-out styling must win over selection: when every size is sold out the
                        // fallback still marks one as selected, and it must not look orderable.
                        unavailable
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-70"
                          : active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-campus-blue/50 hover:bg-secondary"
                      }`}
                    >
                      {variant.size}
                      {unavailable && <span className="sr-only"> — sold out</span>}
                    </button>
                  );
                })}
              </div>

              <p id="selected-size-availability" className="mt-3.5 text-xs font-semibold text-foreground" role="status" aria-live="polite">
                {selected ? availabilityCopy : "No sizes have been published for this item yet."}
              </p>
            </fieldset>

            <div className="mt-5">
              <p className="text-sm font-extrabold" id="quantity-label">Quantity</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <div className="inline-flex h-12 items-center rounded-xl border border-border bg-card" role="group" aria-labelledby="quantity-label">
                  <button
                    type="button"
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}
                    disabled={!canAdd || quantity <= 1}
                    className="grid size-11 place-items-center rounded-l-xl transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                  <output className="grid w-10 place-items-center text-sm font-bold tabular-nums" aria-live="polite">{quantity}</output>
                  <button
                    type="button"
                    onClick={() => setQuantity(value => Math.min(MAX_QUANTITY, value + 1))}
                    disabled={!canAdd || quantity >= MAX_QUANTITY}
                    className="grid size-11 place-items-center rounded-r-xl transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Up to {MAX_QUANTITY} per request. Final stock is confirmed at checkout.</span>
              </div>
            </div>

            <Button
              disabled={!canAdd || addToCart.isPending}
              onClick={submitToCart}
              className="mt-6 hidden min-h-12 w-full gap-2 bg-campus-blue text-sm font-bold text-white hover:bg-campus-blue/90 md:inline-flex"
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              {ctaLabel}
            </Button>

            <p className="mt-3 text-xs leading-5 text-muted-foreground md:text-center">
              Pickup details are confirmed after you submit your request. Payment follows your vendor&apos;s process.
            </p>
          </div>
        </div>
      </main>

      {/* Mobile: keep the primary action within thumb reach, clearing the bottom navigation. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_12px_rgb(15_39_71/0.06)] md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-muted-foreground">{selected ? `Size ${selected.size}` : "Select a size"}</p>
            <p className="text-base font-extrabold leading-tight tabular-nums text-primary">{formatPeso(productData.priceInCentavos)}</p>
          </div>
          <Button
            disabled={!canAdd || addToCart.isPending}
            onClick={submitToCart}
            className="ml-auto min-h-12 flex-1 gap-2 bg-campus-blue text-sm font-bold text-white hover:bg-campus-blue/90"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            {ctaLabel}
          </Button>
        </div>
      </div>
    </StudentShell>
  );
}
