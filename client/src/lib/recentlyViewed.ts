import { readList, storageKey, writeList } from "@/lib/safeStorage";

/**
 * A short trail of products the student has opened.
 *
 * Same footing as favorites: device-local, no table, no migration. Only product ids are kept, so
 * the list carries nothing private and every card is rendered from the live catalogue — a product
 * that has since been hidden or deleted stops resolving and is simply not shown.
 *
 * The list is bounded. An unbounded history would grow without limit in a store that has a hard
 * quota, and nobody scrolls a hundred entries anyway.
 */

export type RecentlyViewedId = string;

const FEATURE = "recently-viewed";

/** Enough to be useful on a home page row, small enough to never threaten the storage quota. */
export const RECENTLY_VIEWED_LIMIT = 8;

function isProductId(value: unknown): value is RecentlyViewedId {
  return typeof value === "string" && value.length > 0;
}

export function recentlyViewedKey(userId: string | number | null | undefined): string {
  return storageKey(FEATURE, userId);
}

export function readRecentlyViewed(userId: string | number | null | undefined): RecentlyViewedId[] {
  // Trimmed on read as well as write: a list stored by an older build with a larger limit, or one
  // corrupted into something longer, must not leak past the bound.
  return readList(recentlyViewedKey(userId), isProductId).slice(0, RECENTLY_VIEWED_LIMIT);
}

/**
 * Record a visit. Most recent first, no duplicates, bounded.
 *
 * Re-opening a product moves it to the front rather than adding a second entry, so the row reads as
 * "where you have been lately" instead of a raw event log.
 */
export function recordRecentlyViewed(
  userId: string | number | null | undefined,
  productId: string,
): { recent: RecentlyViewedId[]; persisted: boolean } {
  if (!productId) return { recent: readRecentlyViewed(userId), persisted: false };
  const current = readRecentlyViewed(userId);
  const recent = [productId, ...current.filter(id => id !== productId)].slice(0, RECENTLY_VIEWED_LIMIT);
  return { recent, persisted: writeList(recentlyViewedKey(userId), recent) };
}
