import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { HowItWorks } from "@/components/campuswear/HowItWorks";
import { ProductRow } from "@/components/campuswear/ProductRow";
import { readRecentlyViewed } from "@/lib/recentlyViewed";
import { useFavorites } from "@/lib/useFavorites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, formatShortDate } from "@/lib/format";
import { listAnnouncements, listPublicCatalog } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BellRing, ClipboardList, PackageSearch, Search, Store } from "lucide-react";
import { CampusWearMark } from "@/components/campuswear/BrandMark";
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
  // A paused query has no data and is neither loading nor errored, so it needs its own branch.
  const catalogOffline = isStalledWithoutData(catalog);
  const noticesOffline = isStalledWithoutData(notices);
  const firstName = user?.name?.trim().split(/\s+/)[0];
  /*
    The school name comes from the catalogue rows themselves (products join schools), so it is the
    real record rather than a hard-coded string. If the catalogue has not loaded, nothing is shown
    — an invented campus name would be worse than none.
  */
  const schoolName = catalog.data?.[0]?.schoolName ?? null;
  const { favorites, toggle } = useFavorites(user?.id);
  const recentIds = readRecentlyViewed(user?.id);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchText.trim();
    setLocation(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  };

  return (
    <StudentShell>
      <main className="container py-5 sm:py-8">
        <section className="relative isolate overflow-hidden rounded-2xl bg-primary px-5 py-8 text-primary-foreground sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute inset-0 z-0 campus-grid opacity-10" aria-hidden="true" />
          {/* Stitch layers a gradient over the grid so the right-hand cards read against the navy. */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-primary via-primary/90 to-primary/60" aria-hidden="true" />
          <div className="relative z-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10 xl:gap-14">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-campus-gold">
                {/*
                  The CampusWear mark, not a generic mortarboard. `mono` paints the polo from
                  currentColor, so it takes the eyebrow's gold rather than fighting it with the
                  navy-and-blue lockup, which would disappear against this navy hero. Hidden from
                  readers because the line it decorates already ends in "CampusWear".
                */}
                <span aria-hidden="true" className="contents">
                  <CampusWearMark variant="mono" className="size-4 shrink-0" title="" />
                </span>
                {/*
                  The real school record from the catalogue, never a hard-coded campus. Falls back to the
                  generic label rather than naming a university that has not loaded.
                */}
                {schoolName ? `${schoolName} · CampusWear` : "Student workspace"}
              </p>
              <h1 className="mt-3 max-w-xl text-3xl font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-4xl lg:max-w-2xl xl:text-5xl">
                {firstName ? `Welcome back, ${firstName}.` : "Your campus store, before the trip."}
              </h1>
              {/* Prose keeps its measure: widening body copy hurts readability, so only the
                  controls below are allowed to grow into the wider column. */}
              <p className="mt-3.5 max-w-md text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                Browse what is available, choose the right size, and keep your pickup request in one place.
              </p>

              {/* Stitch joins the field and button into one control from sm up; below that they
                  stack so the tap targets stay full width. */}
              <form onSubmit={submitSearch} role="search" className="mt-6 flex flex-col gap-2 sm:max-w-lg sm:flex-row sm:gap-0">
                <label className="relative flex-1">
                  <span className="sr-only">Search the campus catalog</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={searchText}
                    onChange={event => setSearchText(event.target.value)}
                    placeholder="Search uniforms, PE sets, shirts…"
                    type="search"
                    className="min-h-12 border-transparent bg-card pl-10 text-foreground sm:rounded-r-none"
                  />
                </label>
                <Button type="submit" className="min-h-12 bg-campus-blue px-6 font-bold text-white hover:bg-campus-blue/90 sm:rounded-l-none">Search</Button>
              </form>
            </div>

            {/* Stitch promotes the two shortcuts out of the text column into stacked cards. They
                sit beside the copy from lg, and stack under it on smaller screens. */}
            <div className="mt-7 grid grid-cols-2 gap-3 lg:mt-0 lg:w-[290px] lg:grid-cols-1 xl:w-[320px]">
              <Link
                href="/shop"
                className="group relative flex min-h-16 items-center gap-2.5 rounded-2xl bg-card p-3 text-foreground shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold lg:min-h-20 lg:gap-4 lg:p-5"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-xl text-campus-blue transition-colors lg:size-12 lg:bg-campus-blue/10 lg:group-hover:bg-campus-blue lg:group-hover:text-white">
                  <PackageSearch className="size-5 lg:size-6" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Browse</span>
                  <span className="mt-0.5 block truncate text-sm font-extrabold text-primary lg:text-base">
                    <span className="lg:hidden">Catalog</span>
                    <span className="hidden lg:inline">Check catalog</span>
                  </span>
                </span>
                <ArrowRight className="ml-auto hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:block" aria-hidden="true" />
              </Link>

              <Link
                href="/orders"
                className="group relative flex min-h-16 items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 p-3 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold lg:min-h-20 lg:gap-4 lg:p-5"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-xl text-white lg:size-12 lg:bg-white/10">
                  <ClipboardList className="size-5 lg:size-6" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-blue-200">Track</span>
                  <span className="mt-0.5 block truncate text-sm font-extrabold lg:text-base">My orders</span>
                </span>
                <ArrowRight className="ml-auto hidden size-5 shrink-0 text-blue-200 transition-transform group-hover:translate-x-0.5 lg:block" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 sm:mt-12" aria-label="Available to browse">
          <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Available to browse</p>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Uniforms and essentials</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Tap an item to check the sizes in stock.</p>
            </div>
            <Link href="/shop" className="group hidden min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-campus-blue hover:text-campus-blue/80 sm:inline-flex">
              View full catalog <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          {catalog.isLoading ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)}
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
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {featured.map((product, index) => {
                const firstVariant = product.variants.find(variant => variant.availability !== "out_of_stock") ?? product.variants[0];

                return (
                  <Link
                    href={`/shop/${product.id}`}
                    key={product.id}
                    aria-label={`View ${product.name}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[0_8px_24px_rgb(15_39_71/0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue"
                  >
                    {/* Stitch overlays the store on the image. The name stays real vendor data. */}
                    <div className="relative">
                      <ProductVisual name={product.name} imageUrl={product.imageUrl} index={index} className="aspect-[4/3] w-full" />
                      <span className="absolute left-2.5 top-2.5 inline-flex max-w-[calc(100%-1.25rem)] items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-primary shadow-sm backdrop-blur-sm">
                        <Store className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{product.vendorName}</span>
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-extrabold leading-5 tracking-[-0.02em]">{product.name}</p>
                        <p className="shrink-0 text-sm font-extrabold tabular-nums text-primary">{formatPeso(product.priceInCentavos)}</p>
                      </div>
                      {firstVariant && (
                        <div className="mt-3 flex flex-col gap-2">
                          <StatusBadge kind="inventory" value={firstVariant.availability} />
                          <p className="text-xs font-semibold text-muted-foreground">Size {firstVariant.size} is available</p>
                        </div>
                      )}
                      <span className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-bold text-campus-blue">
                        View product
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
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

        {recentIds.length > 0 && (
          <section className="mt-10" aria-labelledby="recently-viewed-heading">
            <h2 id="recently-viewed-heading" className="text-lg font-extrabold tracking-[-0.03em]">Recently viewed</h2>
            <ProductRow
              ids={recentIds}
              catalog={catalog.data}
              favorites={favorites}
              onToggleFavorite={toggle}
              emptyMessage="The items you viewed are no longer in the catalog."
            />
          </section>
        )}

        <HowItWorks className="mt-10" />

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
