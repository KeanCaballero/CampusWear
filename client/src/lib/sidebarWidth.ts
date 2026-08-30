/**
 * Persistence for the dashboard sidebar width.
 *
 * Extracted from DashboardLayout because reading it must never be able to take a workspace down,
 * and that guarantee deserves its own tests.
 *
 * Two ways it previously could. `localStorage` is not always reachable — a browser configured to
 * block site data throws on the property access itself, not merely on the method call — and the
 * read runs inside a `useState` initializer, so the throw happened during render and every
 * dashboard page rendered as a blank screen. Separately, `parseInt` returns NaN for anything
 * non-numeric, which became `--sidebar-width: NaNpx` and was then written straight back to
 * storage, making a single corrupt value permanent.
 */

export const SIDEBAR_WIDTH_KEY = "campuswear-sidebar-width";
export const DEFAULT_SIDEBAR_WIDTH = 272;
export const MIN_SIDEBAR_WIDTH = 224;
export const MAX_SIDEBAR_WIDTH = 360;

/** Keeps a width within the same bounds the drag handle enforces. */
export function clampSidebarWidth(width: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

/** The remembered width, or the default whenever storage is unreadable or holds nonsense. */
export function readStoredSidebarWidth(): number {
  try {
    const saved = globalThis.localStorage?.getItem(SIDEBAR_WIDTH_KEY);
    if (!saved) return DEFAULT_SIDEBAR_WIDTH;
    const parsed = Number.parseInt(saved, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_SIDEBAR_WIDTH;
    return clampSidebarWidth(parsed);
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

/** Persisting the width is a convenience, so failing to store it is never worth an error. */
export function storeSidebarWidth(width: number): void {
  try {
    globalThis.localStorage?.setItem(SIDEBAR_WIDTH_KEY, String(width));
  } catch {
    // Storage unavailable (private mode, blocked site data). The session keeps its width in memory.
  }
}
