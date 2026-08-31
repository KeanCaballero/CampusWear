import { Heart } from "lucide-react";
import { favoriteActionLabel } from "@/lib/favorites";

/**
 * Heart toggle for saving a product.
 *
 * The accessible name states the ACTION and names the product — "Add BSIT Uniform to favorites" —
 * because a screen-reader user meeting a row of hearts needs to know which product each one is for,
 * and what pressing it will do. `aria-pressed` carries the current state separately, so the two
 * pieces of information do not fight each other.
 *
 * The filled heart is never the only signal: `aria-pressed` conveys it non-visually, and the fill
 * is paired with a colour change rather than colour alone.
 */
export function FavoriteButton({
  productId,
  productName,
  isFavorite,
  onToggle,
  className = "",
}: {
  productId: string;
  productName: string;
  isFavorite: boolean;
  onToggle: (productId: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={favoriteActionLabel(productName, isFavorite)}
      aria-pressed={isFavorite}
      onClick={event => {
        // Cards wrap the whole tile in a link; saving must not navigate away.
        event.preventDefault();
        event.stopPropagation();
        onToggle(productId);
      }}
      className={`grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-card/90 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue ${className}`}
    >
      <Heart
        className={`size-4.5 transition-colors ${isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
        aria-hidden="true"
      />
    </button>
  );
}
