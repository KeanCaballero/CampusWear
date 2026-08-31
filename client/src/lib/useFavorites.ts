import { useCallback, useEffect, useState } from "react";
import { isStorageAvailable } from "@/lib/safeStorage";
import { readFavorites, toggleFavorite, type FavoriteId } from "@/lib/favorites";

/**
 * Shared favorites state for one signed-in student.
 *
 * Several components show the same hearts at once — cards in the catalogue, the product page, the
 * favorites list. Without a shared signal, toggling one leaves the others stale until a remount, so
 * a tiny module-level subscriber set broadcasts every change. This is not a state library and does
 * not want to be: it is one Set and one loop, because the alternative is a page where the same
 * product is simultaneously favorited and not.
 *
 * Storage is the source of truth, so a change made in another tab is picked up on the next mount.
 * `storageBacked` lets the UI be honest when the device refuses to persist anything.
 */

const subscribers = new Set<() => void>();

function broadcast() {
  subscribers.forEach(notify => notify());
}

export function useFavorites(userId: string | number | null | undefined) {
  const [favorites, setFavorites] = useState<FavoriteId[]>(() => readFavorites(userId));
  const [storageBacked] = useState(() => isStorageAvailable());

  // Re-read when the account changes, so one student never sees another's saved items.
  useEffect(() => {
    setFavorites(readFavorites(userId));
  }, [userId]);

  useEffect(() => {
    const notify = () => setFavorites(readFavorites(userId));
    subscribers.add(notify);
    return () => { subscribers.delete(notify); };
  }, [userId]);

  const toggle = useCallback(
    (productId: string) => {
      const result = toggleFavorite(userId, productId);
      setFavorites(result.favorites);
      broadcast();
      return result;
    },
    [userId],
  );

  return { favorites, toggle, storageBacked };
}
