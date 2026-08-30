import { CampusWearMark } from "@/components/campuswear/BrandMark";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, formatShortDate } from "@/lib/format";
import { listAnnouncements, listPublicCatalog } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BellRing, ClipboardList, PackageSearch, Search, Store } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function StudentHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchText, setSearchText] = useState("");
  const catalog = useQuery({ queryKey: ["supabase-catalog"], queryFn: () => listPublicCatalog() });
  const notices = useQuery({ queryKey: ["supabase-announcements"], queryFn: listAnnouncements });

  useEffect(() => {
    if (user?.role === "platform_admin" || user?.role === "admin") setLocation("/platform");
  }, [setLocation, user?.role]);

  if (user?.role === "platform_admin" || user?.role === "admin") {
    return <main className="grid min-h-dvh place-items-center bg-background"><Skeleton className="h-16 w-64 rounded-xl" /></main>;
  }

  const featured = catalog.data?.slice(0, 4) ?? [];
  // The hero's wide-screen second column reuses the catalogue already fetched for this page, so it
  // costs no extra request and shows a real product rather than invented marketing content. While
  // the query is loading, offline, failed, or genuinely empty this is undefined and the column
  // falls back to the brand panel — the catalogue section below still owns all state messaging.
  const spotlight = featured[0];
  // A paused query has no data and is neither loading nor errored, so it needs its own branch.
  const catalogOffline = isStalledWithoutData(catalog);
  const noticesOffline = isStalledWithoutData(notices);
  const firstName = user?.name?.trim().split(/\s+/)[0];

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchText.trim();
    setLocation(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  };

  return (
    <StudentShell>
      <main className="container py-5 sm:py-8">
        <section className="relative isolate overflow-hidden rounded-xl bg-primary px-5 py-7 text-primary-foreground sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-0 z-0 campus-grid opacity-10" aria-hidden="true" />
          {/* Below lg this stays a single stacked column, exactly as before. From lg up it becomes
              two columns so the panel is no longer ~half empty navy at 1440px and 1920px. */}
          <div className="relative z-10 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-200">Student workspace</p>
              <h1 className="mt-2.5 max-w-xl text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-3xl lg:max-w-2xl xl:text-4xl">
                {firstName ? `Welcome back, ${firstName}.` : "Your campus store, before the trip."}
              </h1>
              {/* Prose keeps its measure: widening body copy hurts readability, so only the
                  controls below are allowed to grow into the wider column. */}
              <p className="mt-2.5 max-w-md text-sm leading-6 text-blue-100">
                Check what is in stock, pick your size, and reserve it for pickup.
              </p>

              <form onSubmit={submitSearch} role="search" className="mt-5 flex flex-col gap-2 sm:max-w-lg sm:flex-row lg:max-w-none">
                <label className="relative flex-1">
                  <span className="sr-only">Search the campus catalog</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={searchText}
                    onChange={event => setSearchText(event.target.value)}
                    placeholder="Search uniforms, PE sets, shirts…"
                    type="search"
                    className="min-h-12 border-transparent bg-card pl-10 text-foreground"
                  />
                </label>
                <Button type="submit" className="min-h-12 bg-campus-blue px-5 font-bold text-white hover:bg-campus-blue/90">Search</Button>
              </form>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:max-w-lg lg:max-w-none">
                <Link
                  href="/shop"
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-white/10 px-4 text-left transition-colors hover:bg-white/20"
                >
                  <PackageSearch className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-200">Browse</span>
                    <span className="block truncate text-sm font-bold">Catalog</span>
                  </span>
                </Link>
                <Link
                  href="/orders"
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-white/10 px-4 text-left transition-colors hover:bg-white/20"
                >
                  <ClipboardList className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-200">Track</span>
                    <span className="block truncate text-sm font-bold">My orders</span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Wide-screen only. Hidden below lg so mobile and tablet keep the stacked composition
                rather than inheriting a desktop layout. */}
            <div className="hidden lg:block">
              {spotlight ? (
                <Link
                  href={`/shop/${spotlight.id}`}
                  aria-label={`View ${spotlight.name}`}
                  className="group block rounded-2xl border border-white/15 bg-white/10 p-3 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold"
                >
                  <ProductVisual name={spotlight.name} imageUrl={spotlight.imageUrl} className="aspect-[16/10] w-full rounded-xl" />
                  <div className="px-1 pb-0.5 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-campus-gold">In the catalog now</p>
                    <p className="mt-1.5 truncate text-sm font-extrabold">{spotlight.name}</p>
                    <div className="mt-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-base font-extrabold tabular-nums">{formatPeso(spotlight.priceInCentavos)}</span>
                      <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-blue-200">
                        <Store className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{spotlight.vendorName}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="grid place-items-center rounded-2xl border border-white/15 bg-white/5 px-6 py-12 text-center">
                  <CampusWearMark variant="reversed" className="size-12" />
                  <p className="mt-3 text-sm font-extrabold">Your Uniform. Your Identity.</p>
                  <p className="mt-1.5 text-xs leading-5 text-blue-200">Live stock from your campus's authorized stores.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-9" aria-label="Available to browse">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">Available to browse</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-[-0.02em] sm:text-2xl">Uniforms and essentials</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Tap an item to check the sizes in stock.</p>
            </div>
            <Link href="/shop" className="hidden min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-campus-blue hover:underline sm:inline-flex">
              View catalog <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {catalog.isLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-xl" />)}
            </div>
          ) : catalogOffline ? (
            <div className="mt-5">
              <OfflinePanel
                title="You appear to be offline"
                detail="Reconnect to see what is in stock on your campus."
                onRetry={() => catalog.refetch()}
              />
            </div>
          ) : catalog.isError ? (
            <div className="mt-5">
              <EmptyPanel
                title="The catalog could not be loaded"
                detail="We could not check current availability. Please try again."
                action={{ label: "Try again", onClick: () => catalog.refetch() }}
              />
            </div>
          ) : featured.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {featured.map((product, index) => {
                const firstVariant = product.variants.find(variant => variant.availability !== "out_of_stock") ?? product.variants[0];

                return (
                  <Link
                    href={`/shop/${product.id}`}
                    key={product.id}
                    aria-label={`View ${product.name}`}
                    className="group overflow-hidden rounded-xl border border-border bg-card p-2.5 transition-shadow hover:shadow-[0_4px_12px_rgb(15_39_71/0.08)]"
                  >
                    <ProductVisual name={product.name} imageUrl={product.imageUrl} index={index} className="aspect-[1.08] w-full rounded-lg" />
                    <div className="px-1 pb-1 pt-3">
                      <p className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 tracking-[-0.02em]">{product.name}</p>
                      <p className="mt-1 text-sm font-extrabold tabular-nums text-primary">{formatPeso(product.priceInCentavos)}</p>
                      <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-muted-foreground">
                        <Store className="size-3 shrink-0" aria-hidden="true" />{product.vendorName}
                      </p>
                      {firstVariant && (
                        <>
                          <p className="mt-2 text-xs font-semibold text-muted-foreground">Size {firstVariant.size} is available</p>
                          <div className="mt-2"><StatusBadge kind="inventory" value={firstVariant.availability} /></div>
                        </>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-campus-blue group-hover:underline">
                        View product <ArrowRight className="size-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyPanel title="The catalog is getting ready" detail="Authorized vendors have not published products for this campus yet." />
            </div>
          )}

          <Button asChild variant="outline" className="mt-5 min-h-12 w-full sm:hidden">
            <Link href="/shop">Browse the catalog <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </Button>
        </section>

        <section className="mt-10 pb-4" aria-label="Campus updates">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">From authorized vendors</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-[-0.02em] sm:text-2xl">Campus updates</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Restocks, schedules, and pickup reminders.</p>
            </div>
            <Link href="/announcements" className="hidden min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-campus-blue hover:underline sm:inline-flex">
              All updates <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {notices.isLoading ? (
              <><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></>
            ) : noticesOffline ? (
              <div className="md:col-span-2">
                <OfflinePanel
                  title="You appear to be offline"
                  detail="Reconnect to see the latest campus updates."
                  onRetry={() => notices.refetch()}
                />
              </div>
            ) : notices.isError ? (
              <div className="md:col-span-2">
                <EmptyPanel
                  title="Updates could not be loaded"
                  detail="Campus announcements are temporarily unavailable. Please try again."
                  action={{ label: "Try again", onClick: () => notices.refetch() }}
                />
              </div>
            ) : notices.data?.length ? (
              notices.data.slice(0, 2).map(notice => (
                <article key={notice.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-campus-blue">
                      <BellRing className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        {notice.vendorName ?? notice.schoolName} · {formatShortDate(notice.createdAt)}
                      </p>
                      <h3 className="mt-1 font-extrabold tracking-[-0.02em]">{notice.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{notice.body}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="md:col-span-2">
                <EmptyPanel title="No announcements yet" detail="Vendor updates and pickup notices will appear here." />
              </div>
            )}
          </div>

          <Button asChild variant="outline" className="mt-5 min-h-12 w-full sm:hidden">
            <Link href="/announcements">View all updates <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </Button>
        </section>
      </main>
    </StudentShell>
  );
}
