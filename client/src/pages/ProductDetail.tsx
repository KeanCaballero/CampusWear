import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso } from "@/lib/format";
import { selectedVariantAvailabilityCopy } from "@/lib/productAvailabilityCopy";
import { addVariantToCart, getPublicCatalogProduct } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingBag, Store } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function ProductDetail() {
  const [, params] = useRoute("/shop/:id");
  const [, setLocation] = useLocation();
  const productId = params?.id;
  const product = useQuery({
    queryKey: ["supabase-product", productId],
    queryFn: () => getPublicCatalogProduct(productId!),
    enabled: Boolean(productId),
  });
  const { isAuthenticated } = useAuth();
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const addToCart = useMutation({
    mutationFn: addVariantToCart,
    onSuccess: () => toast.success("Added to your cart."),
    onError: error => toast.error(error instanceof Error ? error.message : "We could not update your cart."),
  });

  if (product.isLoading) {
    return (
      <StudentShell>
        <main className="container py-6">
          <Skeleton className="h-5 w-28" />
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </main>
      </StudentShell>
    );
  }

  if (product.isError) {
    return (
      <StudentShell>
        <main className="container py-10">
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to catalog
          </Link>
          <div className="mt-8">
            <EmptyPanel title="This product could not be loaded" detail="We could not confirm the latest availability. Please try again." action={{ label: "Try again", onClick: () => product.refetch() }} />
          </div>
        </main>
      </StudentShell>
    );
  }

  if (!product.data) {
    return (
      <StudentShell>
        <main className="container py-10">
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to catalog
          </Link>
          <div className="mt-8 rounded-2xl border border-dashed bg-card p-10 text-center">
            <h1 className="text-xl font-bold">This product is unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">The product may have been removed from the active catalog.</p>
          </div>
        </main>
      </StudentShell>
    );
  }

  const productData = product.data;
  const selected = productData.variants.find(variant => variant.id === selectedVariantId)
    ?? productData.variants.find(variant => variant.availability !== "out_of_stock")
    ?? productData.variants[0];
  const canAdd = Boolean(selected && selected.availability !== "out_of_stock");
  const availabilityCopy = selectedVariantAvailabilityCopy(selected?.size, selected?.availability);

  const chooseVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQuantity(1);
  };

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <Link href="/shop" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to catalog
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2 lg:gap-12">
          <ProductVisual name={productData.name} imageUrl={productData.imageUrl} className="aspect-square w-full rounded-2xl border border-border" />

          <div>
            <p className="text-xs font-bold tracking-[0.1em] text-primary">{productData.categoryName ?? "CAMPUS ESSENTIAL"}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">{productData.name}</h1>
            <p className="mt-3 text-2xl font-extrabold tabular-nums text-primary">{formatPeso(productData.priceInCentavos)}</p>

            <div className="mt-5 rounded-xl border border-border bg-muted/45 p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <Store className="size-3.5" aria-hidden="true" />
                Sold by {productData.vendorName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Pickup details are confirmed when your request is submitted.</p>
            </div>

            <p className="mt-5 text-sm leading-7 text-muted-foreground">{productData.description}</p>

            <fieldset className="mt-7 border-y border-border py-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <legend className="text-sm font-extrabold">Select a size</legend>
                  <p className="mt-1 text-xs text-muted-foreground">Choose a size to see its current availability.</p>
                </div>
                {selected && <StatusBadge kind="inventory" value={selected.availability} />}
              </div>

              <div className="mt-4 flex flex-wrap gap-2" aria-label="Available sizes">
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
                      className={`min-h-12 min-w-12 rounded-xl border px-3 py-2 text-sm font-bold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] ${active ? "border-primary bg-primary text-primary-foreground" : unavailable ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through" : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"}`}
                    >
                      {variant.size}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <p className="mt-3 text-xs font-semibold text-muted-foreground" role="status" aria-live="polite">
                  {availabilityCopy}
                </p>
              )}
            </fieldset>

            <div className="mt-6">
              <p className="text-sm font-extrabold">Quantity</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex h-12 items-center rounded-xl border border-border bg-card">
                  <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="grid size-11 place-items-center rounded-l-xl transition-colors hover:bg-muted active:bg-secondary" aria-label="Decrease quantity">
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                  <output className="grid w-9 place-items-center text-sm font-bold tabular-nums" aria-live="polite">{quantity}</output>
                  <button type="button" onClick={() => setQuantity(value => Math.min(10, value + 1))} className="grid size-11 place-items-center rounded-r-xl transition-colors hover:bg-muted active:bg-secondary" aria-label="Increase quantity">
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Final stock is confirmed at checkout.</span>
              </div>
            </div>

            <Button
              disabled={!canAdd || addToCart.isPending}
              onClick={() => {
                if (!selected) return;
                if (!isAuthenticated) {
                  setLocation(`/auth?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
                  return;
                }
                addToCart.mutate({ productId: productData.id, variantId: selected.id, quantity });
              }}
              className="mt-7 h-12 w-full gap-2 text-sm"
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              {canAdd ? addToCart.isPending ? "Adding to cart…" : "Add to cart" : "Out of stock"}
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">Pickup details are confirmed after you submit your request. Payment follows your vendor&apos;s process.</p>
          </div>
        </div>
      </main>
    </StudentShell>
  );
}
