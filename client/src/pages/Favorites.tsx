import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { ProductRow } from "@/components/campuswear/ProductRow";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { isStalledWithoutData } from "@/lib/queryState";
import { listPublicCatalog } from "@/lib/supabaseCatalog";
import { useFavorites } from "@/lib/useFavorites";

/**
 * Products the student has saved on this device.
 *
 * Favorites are stored locally — there is no favorites table, and this pass adds no migration — so
 * the page says so rather than letting a student assume the list follows them to another phone.
 *
 * Ids are resolved against the live catalogue, which is what keeps the list truthful: a product
 * that has been hidden or removed since it was saved simply does not appear.
 */
export default function Favorites() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { favorites, toggle, storageBacked } = useFavorites(user?.id);
  const catalog = useQuery({ queryKey: ["supabase-catalog"], queryFn: () => listPublicCatalog(), enabled: !loading });

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <PageIntro
          eyebrow="SAVED ITEMS"
          title="Favorites"
          description="Items you have saved while browsing your campus catalog."
        />

        {!storageBacked && (
          <p className="mt-5 rounded-xl border border-border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground" role="status">
            This browser is blocking saved data, so favorites cannot be kept between visits. Everything else works
            normally.
          </p>
        )}

        {catalog.isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-60 rounded-xl" />)}
          </div>
        ) : isStalledWithoutData(catalog) ? (
          <div className="mt-6"><OfflinePanel title="You are offline" detail="Reconnect to load your saved items." onRetry={() => catalog.refetch()} /></div>
        ) : catalog.isError ? (
          <div className="mt-6"><EmptyPanel title="Saved items could not be loaded" detail="We could not check the catalog just now. Please try again." action={{ label: "Try again", onClick: () => catalog.refetch() }} /></div>
        ) : favorites.length ? (
          <section className="mt-2" aria-label="Saved products">
            <ProductRow
              ids={favorites}
              catalog={catalog.data}
              favorites={favorites}
              onToggleFavorite={toggle}
              emptyMessage="The items you saved are no longer in the catalog."
            />
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Favorites are saved on this device only.
            </p>
          </section>
        ) : (
          <div className="mt-6">
            <EmptyPanel
              title="No saved items yet"
              detail="Tap the heart on any product to keep it here while you decide."
              action={{ label: "Browse catalog", onClick: () => setLocation("/shop") }}
            />
          </div>
        )}
      </main>
    </StudentShell>
  );
}
