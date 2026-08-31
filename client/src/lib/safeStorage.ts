/**
 * A localStorage wrapper that can never take a page down.
 *
 * Favorites and Recently viewed both persist on the device rather than in the database — there is
 * no table for either, and this UX pass deliberately adds no migration. That makes storage a
 * dependency of rendering, and storage is the least reliable thing in a browser:
 *
 *   - A browser set to block site data throws on the `localStorage` PROPERTY access, not merely on
 *     the method call, so even feature-detecting it needs a try/catch.
 *   - Private windows, quota limits and enterprise policy all fail at different points.
 *   - Anything already stored may be corrupt, truncated, or written by an older version with a
 *     different shape.
 *
 * Every failure resolves to "the feature quietly isn't there" rather than an exception. A student
 * who cannot store favorites still gets a working catalogue.
 *
 * Values are namespaced per user, because these lists are personal. Two accounts sharing a laptop
 * must not see each other's favorites — not a security boundary (nothing here is secret and none of
 * it reaches the server), but a correctness and privacy one.
 */

/** Everything this module writes is prefixed, so it is greppable and easy to clear. */
const PREFIX = "campuswear";

/** A signed-out visitor gets a stable bucket rather than writing into someone else's. */
export function storageKey(feature: string, userId: string | number | null | undefined): string {
  return `${PREFIX}:${feature}:${userId ?? "anonymous"}`;
}

/**
 * The store, or null when it cannot be reached.
 *
 * Reading the property is itself the risky part — a browser blocking site data throws here rather
 * than on the method — so every access in this module goes through it.
 */
function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * True only when storage is genuinely usable.
 *
 * Probed with a real write: reads can succeed on a store that refuses writes, and optional chaining
 * over an absent store silently resolves to undefined, which would otherwise read as success.
 */
export function isStorageAvailable(): boolean {
  const s = store();
  if (!s) return false;
  try {
    const probe = `${PREFIX}:__probe__`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON array of items, dropping anything that does not match `isValid`.
 *
 * Partial corruption keeps the good entries instead of discarding the list: one bad record written
 * by an older build should not cost a student every favorite they have.
 */
export function readList<T>(key: string, isValid: (value: unknown) => value is T): T[] {
  try {
    const raw = store()?.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    // Unreadable storage or unparseable JSON. Treat it as an empty list, never as an error.
    return [];
  }
}

/** Persist a list. Returns whether it stuck, so callers can tell the truth about what happened. */
export function writeList<T>(key: string, items: readonly T[]): boolean {
  const s = store();
  if (!s) return false;
  try {
    s.setItem(key, JSON.stringify(items));
    return true;
  } catch {
    // Blocked or over quota. The in-memory list still works for this session.
    return false;
  }
}

/** Remove a stored list entirely. Silent when storage is unavailable. */
export function clearList(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    // Nothing to do — there is no state to leave inconsistent.
  }
}
