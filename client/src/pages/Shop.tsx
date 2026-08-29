import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { ProductVisual } from "@/components/campuswear/ProductVisual";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso } from "@/lib/format";
import { catalogAvailabilitySummary } from "@/lib/productAvailabilityCopy";
import { listCatalogCategories, listPublicCatalog } from "@/lib/supabaseCatalog";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, SlidersHorizontal, Store, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function Shop() {
  const [searchText, setSearchText] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const catalog = useQuery({
    queryKey: ["supabase-catalog", submittedSearch],
    queryFn: () => listPublicCatalog(submittedSearch),
  });
  const categories = useQuery({
    queryKey: ["supabase-catalog-categories"],
    queryFn: listCatalogCategories,
  });
  const availableCategories = useMemo(
    () => (categories.data ?? []).filter(item => item.name.trim().length > 0 && item.slug.trim().length > 0),
    [categories.data],
  );
  const selectedCategoryName = availableCategories.find(item => item.slug === category)?.name;
  const filteredProducts = useMemo(
    () => catalog.data?.filter(product => !selectedCategoryName || product.categoryName?.toLocaleLowerCase() === selectedCategoryName.toLocaleLowerCase()) ?? [],
    [catalog.data, selectedCategoryName],
  );
  const hasFilters = Boolean(submittedSearch || category);

  const clearFilters = () => {
    setSearchText("");
    setSubmittedSearch("");
    setCategory(undefined);
  };

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <div className="max-w-xl">
          <p className="text-xs font-bold tracking-[0.1em] text-primary">CAMPUS CATALOG</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">Find your campus essentials.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Prices, vendor names, size options, and live availability are shown before you head to the store.</p>
        </div>

        <form
          onSubmit={event => {
            event.preventDefault();
            setSubmittedSearch(searchText.trim());
          }}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
          role="search"
        >
          <label className="relative flex-1">
            <span className="sr-only">Search the catalog</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder="Search uniforms, PE sets, shirts…"
              className="h-12 border-border bg-card pl-10"
              type="search"
            />
          </label>
          <Button type="submit" className="h-12 px-5">Search catalog</Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Product categories">
          <Button
            type="button"
            size="sm"
            variant={!category ? "default" : "outline"}
            aria-pressed={!category}
            onClick={() => setCategory(undefined)}
            className="min-h-10"
          >
            All items
          </Button>
          {availableCategories.map(item => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={category === item.slug ? "default" : "outline"}
              aria-pressed={category === item.slug}
              onClick={() => setCategory(item.slug)}
              className="min-h-10"
            >
              {item.name}
            </Button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3" aria-live="polite" role="status">
          <p className="text-sm font-semibold text-muted-foreground">
            {catalog.isLoading ? "Checking availability…" : `${filteredProducts.length} ${filteredProducts.length === 1 ? "item" : "items"} found`}
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Availability first
            </span>
            {hasFilters && (
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters} className="min-h-10 gap-1.5 text-primary">
                <X className="size-3.5" aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {catalog.isLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)}
          </div>
        ) : catalog.isError ? (
          <div className="mt-4">
            <EmptyPanel title="The catalog could not be loaded" detail="We could not verify current availability. Please try again." action={{ label: "Try again", onClick: () => catalog.refetch() }} />
          </div>
        ) : filteredProducts.length ? (
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Catalog results">
            {filteredProducts.map((product, index) => {
              const availableVariants = product.variants.filter(variant => variant.availability !== "out_of_stock");
              const featuredVariant = availableVariants[0] ?? product.variants[0];
              const availableCount = availableVariants.length;
              const status = product.variants.some(variant => variant.availability === "in_stock")
                ? "in_stock"
                : product.variants.some(variant => variant.availability === "low_stock")
                  ? "low_stock"
                  : "out_of_stock";

              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.id}`}
                  aria-label={`View ${product.name}`}
                  className="group rounded-2xl border border-border bg-card p-2.5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md active:scale-[0.985]"
                >
                  <ProductVisual name={product.name} imageUrl={product.imageUrl} index={index} className="aspect-[1.08] w-full rounded-xl" />
                  <div className="px-1 pb-1 pt-3">
                    <p className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 tracking-[-0.025em]">{product.name}</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-primary">{formatPeso(product.priceInCentavos)}</p>
                    <p className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-muted-foreground">
                      <Store className="size-3 shrink-0" aria-hidden="true" />
                      {product.vendorName}
                    </p>
                    <p className="mt-2 min-h-4 text-xs font-semibold text-muted-foreground">{catalogAvailabilitySummary(featuredVariant?.size, availableCount)}</p>
                    <div className="mt-2"><StatusBadge kind="inventory" value={status} /></div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
                      View product <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className="mt-4">
            <EmptyPanel title="No products found" detail="No live products match your search yet." action={{ label: "Clear filters", onClick: clearFilters }} />
          </section>
        )}
      </main>
    </StudentShell>
  );
}
