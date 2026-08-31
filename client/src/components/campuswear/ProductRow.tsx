import { Link } from "wouter";
import { Store } from "lucide-react";
import { ProductVisual } from "./ProductVisual";
import { FavoriteButton } from "./FavoriteButton";
import { formatPeso } from "@/lib/format";
import { isFavorite } from "@/lib/favorites";
import type { CatalogProduct } from "@/lib/supabaseCatalog";

/**
 * A compact product grid, shared by Favorites and Recently viewed.
 *
 * Both features store product IDS only, and resolve them against the live catalogue here. That is
 * what keeps them honest: a saved product that has been hidden, deleted, or had its vendor
 * deauthorised simply stops resolving and is not rendered, so neither list can ever show a stale
 * price or a product a student can no longer buy.
 */
export function ProductRow({
  ids,
  catalog,
  favorites,
  onToggleFavorite,
  emptyMessage,
}: {
  ids: readonly string[];
  catalog: CatalogProduct[] | undefined;
  favorites: readonly string[];
  onToggleFavorite: (productId: string) => void;
  emptyMessage: string;
}) {
  // Preserve the caller's order (most recent / most recently saved first), not the catalogue's.
  const byId = new Map((catalog ?? []).map(product => [product.id, product]));
  const resolved = ids.map(id => byId.get(id)).filter((product): product is CatalogProduct => Boolean(product));

  if (!resolved.length) {
    return <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {resolved.map((product, index) => (
        <li key={product.id}>
          <Link
            href={`/shop/${product.id}`}
            aria-label={`View ${product.name}`}
            className="group block rounded-xl border border-border bg-card p-2.5 transition-shadow hover:shadow-[0_4px_12px_rgb(15_39_71/0.08)]"
          >
            <div className="relative">
              <ProductVisual name={product.name} imageUrl={product.imageUrl} index={index} className="aspect-[1.08] w-full rounded-lg" />
              <FavoriteButton
                productId={product.id}
                productName={product.name}
                isFavorite={isFavorite(favorites, product.id)}
                onToggle={onToggleFavorite}
                className="absolute right-1.5 top-1.5 shadow-sm"
              />
            </div>
            <div className="px-1 pb-1 pt-3">
              <p className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 tracking-[-0.02em]">{product.name}</p>
              <p className="mt-1 text-sm font-bold tabular-nums text-primary">{formatPeso(product.priceInCentavos)}</p>
              <p className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-muted-foreground">
                <Store className="size-3 shrink-0" aria-hidden="true" />
                {product.vendorName}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
