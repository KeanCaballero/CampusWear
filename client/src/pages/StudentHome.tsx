import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, formatShortDate } from "@/lib/format";
import { listAnnouncements, listPublicCatalog } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BellRing, ClipboardList, PackageSearch, SearchCheck, Store } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function StudentHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const catalog = useQuery({ queryKey: ["supabase-catalog"], queryFn: () => listPublicCatalog() });
  const notices = useQuery({ queryKey: ["supabase-announcements"], queryFn: listAnnouncements });

  useEffect(() => {
    if (user?.role === "platform_admin" || user?.role === "admin") setLocation("/platform");
  }, [setLocation, user?.role]);

  if (user?.role === "platform_admin" || user?.role === "admin") {
    return <main className="grid min-h-dvh place-items-center bg-background"><Skeleton className="h-16 w-64 rounded-2xl" /></main>;
  }

  const featured = catalog.data?.slice(0, 4) ?? [];
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <section className="relative isolate overflow-hidden rounded-3xl bg-primary px-5 py-7 text-primary-foreground sm:px-8 sm:py-9 lg:px-10">
          <div className="pointer-events-none absolute inset-0 z-0 campus-grid opacity-10" />
          <div className="pointer-events-none absolute -right-10 -top-16 z-0 hidden size-52 rounded-full border-[22px] border-white/15 sm:block" />
          <div className="pointer-events-none absolute -bottom-14 right-20 z-0 size-36 rotate-12 rounded-3xl bg-white/10" />
          <div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-xl campus-fade-in">
              <p className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.1em] text-blue-100"><SearchCheck className="size-4" aria-hidden="true" />STUDENT WORKSPACE</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] sm:text-4xl">{firstName ? `Welcome back, ${firstName}.` : "Your campus store, before the trip."}</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">Browse what is available, choose the right size, and keep your pickup request in one place.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <Button asChild variant="secondary" className="min-h-22 justify-start rounded-2xl px-4 text-left shadow-none hover:bg-white">
                <Link href="/shop"><PackageSearch className="size-5" aria-hidden="true" /><span><span className="block text-xs font-semibold opacity-75">Check</span><span className="mt-0.5 block">Catalog</span></span></Link>
              </Button>
              <Button asChild variant="outline" className="min-h-22 justify-start rounded-2xl border-white/30 bg-white/10 px-4 text-left text-white shadow-none hover:bg-white/20 hover:text-white">
                <Link href="/orders"><ClipboardList className="size-5" aria-hidden="true" /><span><span className="block text-xs font-semibold opacity-75">Track</span><span className="mt-0.5 block">Orders</span></span></Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="campus-eyebrow">AVAILABLE TO BROWSE</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.045em]">Uniforms and essentials</h2>
              <p className="mt-2 text-sm text-muted-foreground">Select an item to check its currently available sizes.</p>
            </div>
            <Link href="/shop" className="hidden min-h-10 items-center text-sm font-bold text-primary hover:underline sm:inline-flex">View catalog <ArrowRight className="ml-1 size-4" aria-hidden="true" /></Link>
          </div>
          {catalog.isLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}</div>
          ) : featured.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {featured.map((product, index) => {
                const firstVariant = product.variants.find(variant => variant.availability !== "out_of_stock") ?? product.variants[0];
                return (
                  <Link href={`/shop/${product.id}`} key={product.id} className="campus-panel campus-panel-interactive group overflow-hidden p-2.5" aria-label={`View ${product.name}`}>
                    <ProductVisual name={product.name} imageUrl={product.imageUrl} index={index} className="aspect-[1.08] w-full rounded-xl" />
                    <div className="px-1 pb-1 pt-3">
                      <p className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 tracking-[-0.025em]">{product.name}</p>
                      <p className="mt-1 text-sm font-extrabold tabular-nums text-primary">{formatPeso(product.priceInCentavos)}</p>
                      <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-muted-foreground"><Store className="size-3 shrink-0" aria-hidden="true" />{product.vendorName}</p>
                      {firstVariant && <><p className="mt-2 text-xs font-semibold text-muted-foreground">Size {firstVariant.size} is available to select</p><div className="mt-2"><StatusBadge kind="inventory" value={firstVariant.availability} /></div></>}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">View product <ArrowRight className="size-3.5" aria-hidden="true" /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5"><EmptyPanel title="The catalog is getting ready" detail="Authorized vendors have not published products for this campus yet." /></div>
          )}
          <Button asChild variant="outline" className="mt-5 w-full sm:hidden"><Link href="/shop">Browse the catalog <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
        </section>

        <section className="mt-11 pb-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="campus-eyebrow">FROM AUTHORIZED VENDORS</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.045em]">Campus updates</h2>
              <p className="mt-2 text-sm text-muted-foreground">Restocks, schedules, and pickup reminders in one place.</p>
            </div>
            <Link href="/announcements" className="hidden min-h-10 items-center text-sm font-bold text-primary hover:underline sm:inline-flex">All updates <ArrowRight className="ml-1 size-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {notices.isLoading ? <><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /></> : notices.data?.length ? notices.data.slice(0, 2).map(notice => (
              <article key={notice.id} className="campus-panel p-5">
                <div className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><BellRing className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted-foreground">{notice.vendorName ?? notice.schoolName} · {formatShortDate(notice.createdAt)}</p>
                    <h3 className="mt-1 font-extrabold tracking-[-0.025em]">{notice.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{notice.body}</p>
                  </div>
                </div>
              </article>
            )) : <EmptyPanel title="No announcements yet" detail="Vendor updates and pickup notices will appear here." />}
          </div>
          <Button asChild variant="outline" className="mt-5 w-full sm:hidden"><Link href="/announcements">View all updates <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
        </section>
      </main>
    </StudentShell>
  );
}
