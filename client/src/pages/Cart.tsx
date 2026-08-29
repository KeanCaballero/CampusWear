import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatPeso } from "@/lib/format";
import { cartQueryKey, checkoutCart, listCart, updateCartItem } from "@/lib/supabaseCatalog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MapPin, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { z } from "zod";

const checkoutSchema = z.object({ pickupLocation: z.string().trim().min(2, "Tell us where you plan to collect your order.").max(160) });
type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Cart() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const queryKey = cartQueryKey(user?.id);
  const cart = useQuery({ queryKey, queryFn: listCart, enabled: !authLoading && Boolean(user) });
  const form = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: { pickupLocation: "" } });
  const update = useMutation({ mutationFn: updateCartItem, onSuccess: () => void queryClient.invalidateQueries({ queryKey }), onError: error => toast.error(error instanceof Error ? error.message : "We could not update your cart.") });
  const checkout = useMutation({ mutationFn: ({ pickupLocation }: CheckoutForm) => checkoutCart(pickupLocation), onSuccess: count => { toast.success(`${count} order${count === 1 ? "" : "s"} sent to the vendor.`); void queryClient.invalidateQueries({ queryKey }); setLocation("/orders"); }, onError: error => toast.error(error instanceof Error ? error.message : "Your pickup request could not be submitted.") });
  const items = cart.data ?? [];
  const total = items.reduce((sum, item) => sum + item.unitPriceInCentavos * item.quantity, 0);

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <PageIntro
          eyebrow="YOUR PICKUP REQUEST"
          title="Cart"
          description="Review your selected sizes before sending a pickup request to the authorized vendor."
          actions={<Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/shop">Continue shopping</Link></Button>}
        />

        {cart.isLoading ? <div className="mt-7 space-y-3"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div> : cart.isError ? <div className="mt-7"><EmptyPanel title="Your cart could not be loaded" detail="We could not confirm the selected items right now. Please try again." action={{ label: "Try again", onClick: () => cart.refetch() }} /></div> : !items.length ? <div className="mt-7"><EmptyPanel title="Your cart is empty" detail="Choose a size from the live campus catalog to start a pickup request." action={{ label: "Browse catalog", onClick: () => setLocation("/shop") }} /></div> : (
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="space-y-3" aria-label="Cart items">
              {items.map((item, index) => (
                <article key={item.variantId} className="campus-panel flex gap-3 p-3 sm:gap-4 sm:p-4">
                  <ProductVisual name={item.productName} imageUrl={item.imageUrl} index={index} className="size-20 shrink-0 rounded-xl sm:size-24" />
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold">{item.productName}</p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">Size {item.size} · {item.vendorName}</p>
                      </div>
                      <button onClick={() => update.mutate({ variantId: item.variantId, quantity: 0 })} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive" aria-label={`Remove ${item.productName} from cart`}><Trash2 className="size-4" aria-hidden="true" /></button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><StatusBadge kind="inventory" value={item.availability} /><p className="text-base font-extrabold tabular-nums text-primary">{formatPeso(item.unitPriceInCentavos * item.quantity)}</p></div>
                    <div className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-border bg-background" aria-label={`Quantity for ${item.productName}`}>
                      <button onClick={() => update.mutate({ variantId: item.variantId, quantity: Math.max(1, item.quantity - 1) })} className="grid size-10 place-items-center rounded-l-xl transition-colors hover:bg-muted disabled:text-muted-foreground" disabled={item.quantity <= 1 || update.isPending} aria-label="Decrease quantity"><Minus className="size-4" aria-hidden="true" /></button>
                      <output className="grid w-10 place-items-center text-sm font-extrabold tabular-nums" aria-live="polite">{item.quantity}</output>
                      <button disabled={update.isPending || item.quantity >= 10 || item.availability === "out_of_stock"} onClick={() => update.mutate({ variantId: item.variantId, quantity: item.quantity + 1 })} className="grid size-10 place-items-center rounded-r-xl transition-colors hover:bg-muted disabled:text-muted-foreground" aria-label="Increase quantity"><Plus className="size-4" aria-hidden="true" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="campus-panel h-fit p-5 lg:sticky lg:top-22 sm:p-6">
              <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><MapPin className="size-5" aria-hidden="true" /></span><div><h2 className="text-lg font-extrabold tracking-[-0.035em]">Pickup request</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">No online payment in Version 1. Your vendor confirms the collection process.</p></div></div>
              <form className="mt-6" onSubmit={form.handleSubmit(values => checkout.mutate(values))}>
                <label className="block text-sm font-extrabold" htmlFor="pickupLocation">Preferred pickup location <span className="text-destructive" aria-hidden="true">*</span></label>
                <p id="pickup-location-help" className="mt-1 text-xs leading-5 text-muted-foreground">Enter the location that is most convenient for you. The authorized vendor confirms final pickup details.</p>
                <Input id="pickupLocation" className="mt-3 min-h-11 bg-card" placeholder="e.g. Student Center counter" autoComplete="street-address" aria-describedby="pickup-location-help" {...form.register("pickupLocation")} />
                <p className="mt-1.5 min-h-5 text-xs text-destructive" role="alert">{form.formState.errors.pickupLocation?.message}</p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-5"><span className="text-sm font-semibold text-muted-foreground">Order total</span><strong className="text-xl font-extrabold tabular-nums text-primary">{formatPeso(total)}</strong></div>
                <Button type="submit" disabled={checkout.isPending} className="mt-5 w-full gap-2">{checkout.isPending ? "Sending request…" : "Request pickup"}<ArrowRight className="size-4" aria-hidden="true" /></Button>
              </form>
              <p className="mt-5 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />Availability is checked again in the database when your request is submitted.</p>
            </aside>
          </div>
        )}
      </main>
    </StudentShell>
  );
}
