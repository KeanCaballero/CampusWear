import { readList, storageKey, writeList } from "@/lib/safeStorage";

/**
 * Saved products, held on the device.
 *
 * There is no favorites table in the schema and this pass adds no migration, so this is device-
 * local by necessity rather than by design. That has a consequence worth being straight about in
 * the UI: favorites do not follow a student to another phone. Nothing here claims otherwise.
 *
 * Only the product id is stored. Names, prices and images are read back from the live catalogue, so
 * a favorite can never show a stale price, and a product that is deleted or hidden simply stops
 * resolving instead of leaving a broken card behind.
 *
 * Deliberately isolated: a future `favorites` table can replace this module wholesale, keeping the
 * same four functions, without any calling component changing.
 */

export type FavoriteId = string;

const FEATURE = "favorites";

/** Stored entries are bare product ids; anything else in the list is discarded on read. */
function isFavoriteId(value: unknown): value is FavoriteId {
  return typeof value === "string" && value.length > 0;
}

export function favoritesKey(userId: string | number | null | undefined): string {
  return storageKey(FEATURE, userId);
}

export function readFavorites(userId: string | number | null | undefined): FavoriteId[] {
  return readList(favoritesKey(userId), isFavoriteId);
}

export function isFavorite(favorites: readonly FavoriteId[], productId: string): boolean {
  return favorites.includes(productId);
}

/**
 * Toggle one product and persist the result.
 *
 * Returns the new list even when the write fails, so the UI stays responsive for the rest of the
 * session rather than appearing to ignore the click. `persisted` says whether it will survive a
 * reload, which is the honest thing for a caller to be able to check.
 */
export function toggleFavorite(
  userId: string | number | null | undefined,
  productId: string,
): { favorites: FavoriteId[]; persisted: boolean; added: boolean } {
  const current = readFavorites(userId);
  const added = !current.includes(productId);
  // Newest first, so the Favorites page leads with what was just saved.
  const favorites = added ? [productId, ...current] : current.filter(id => id !== productId);
  return { favorites, persisted: writeList(favoritesKey(userId), favorites), added };
}

/** Accessible name for the toggle. States the ACTION, not the current state. */
export function favoriteActionLabel(productName: string, currentlyFavorite: boolean): string {
  return currentlyFavorite ? `Remove ${productName} from favorites` : `Add ${productName} to favorites`;
}
