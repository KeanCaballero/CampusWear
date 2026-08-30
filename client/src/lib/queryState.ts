/**
 * Shared query-state model for CampusWear's data-driven screens.
 *
 * TanStack Query PAUSES a request instead of failing it whenever the fetch cannot run right
 * now: `status` stays `"pending"` while `fetchStatus` becomes `"paused"`. In that state
 * `isLoading` is false, `isError` is false and `data` is undefined, so the common
 * `isLoading → isError → data → empty` chain silently falls through to the EMPTY branch —
 * telling a student "No products found" when nothing of the sort is true.
 *
 * A pause has more than one cause. From the retryer:
 *   canContinue = focusManager.isFocused() && (networkMode === "always" || onlineManager.isOnline()) && canRun()
 * so a fetch is paused when the browser is offline AND ALSO when a retry is waiting on window
 * focus. Verified in a real browser: with `onlineManager.isOnline() === true` and the server
 * returning 500, an unfocused tab reported `fetchStatus: "paused"` with no error.
 *
 * That is why these predicates say "stalled", not "offline". Only live connectivity decides
 * whether the user is told they are offline (see OfflinePanel / OfflineNotice); the page-level
 * branch only needs to know that there is nothing to render yet.
 *
 * Every screen derives its state from here so that logic exists in exactly one place.
 */

export type QueryPhase = "loading" | "offline" | "error" | "empty" | "success";

/** The subset of a TanStack `useQuery` result this module needs. */
export type QueryLike = {
  isLoading: boolean;
  isPaused: boolean;
  isError: boolean;
  data?: unknown;
};

function hasData(query: QueryLike): boolean {
  return query.data !== undefined && query.data !== null;
}

/**
 * A paused query with nothing cached to fall back on. This is the case that must render an
 * offline state rather than an empty one.
 */
export function isStalledWithoutData(query: QueryLike): boolean {
  return Boolean(query.isPaused) && !hasData(query);
}

/**
 * A paused query that still has cached data. The cached view stays on screen; the caller is
 * expected to surface a non-blocking "showing your last saved view" indication.
 */
export function isStalledWithData(query: QueryLike): boolean {
  return Boolean(query.isPaused) && hasData(query);
}

/**
 * Resolve the full five-state model.
 *
 * Order matters:
 *   loading  — a fetch is genuinely in flight
 *   offline  — paused with no cached data (never report this as empty)
 *   error    — a real failure with no cached data to show instead
 *   empty    — the request succeeded and there is genuinely nothing to show
 *   success  — there is data to render
 *
 * When a query fails or pauses but cached data is present, the cached data wins: the phase is
 * `success` and `showStaleNotice` is true so the screen can flag that it may be out of date.
 *
 * @param isEmpty caller-supplied emptiness test for the resolved data (e.g. `rows.length === 0`).
 */
export function resolveQueryPhase(query: QueryLike, isEmpty = false): QueryPhase {
  if (query.isLoading) return "loading";
  if (isStalledWithoutData(query)) return "offline";
  if (query.isError && !hasData(query)) return "error";
  if (!hasData(query)) return query.isPaused ? "offline" : "loading";
  return isEmpty ? "empty" : "success";
}

/** True when stale cached data is on screen because the query is paused or failed. */
export function showsStaleData(query: QueryLike): boolean {
  return hasData(query) && (Boolean(query.isPaused) || Boolean(query.isError));
}

/**
 * Whether a screen showing cached data should refuse to start a write.
 *
 * `isStalledWithData` alone is not sufficient. TanStack only sets `fetchStatus: "paused"` when a
 * fetch is actually ATTEMPTED while offline — a query that has already settled with fresh data
 * never attempts one, so it stays unpaused even with the network down. Observed in production: the
 * cart stayed visible and its checkout button stayed enabled while offline.
 *
 * So connectivity is consulted directly. `isOffline` must come from `useIsOffline()`, which reads
 * `onlineManager` — the same signal TanStack itself uses to decide whether a query may run, and
 * the same one the offline banner and panel use, so none of them can contradict each other. It
 * also recovers on its own: `onlineManager` publishes reconnection, which re-enables the action.
 *
 * Deliberately NOT `navigator.onLine` on its own, and deliberately not "any paused query" — a
 * fetch also pauses while a retry waits on window focus, which is a server problem, not a
 * connectivity one.
 */
export function isWriteBlocked(query: QueryLike, isOffline: boolean): boolean {
  return Boolean(isOffline) || isStalledWithData(query);
}

export function resolveQueryState(query: QueryLike, isEmpty = false) {
  return { phase: resolveQueryPhase(query, isEmpty), showStaleNotice: showsStaleData(query) };
}
