import { describe, expect, it } from "vitest";
import { isStalledWithData, isStalledWithoutData, isWriteBlocked, resolveQueryPhase, resolveQueryState, showsStaleData, type QueryLike } from "./queryState";

// Behavioural coverage for the shared five-state model (BUG-020).
//
// The states below mirror what TanStack Query actually reports, taken from a real query cache
// dump against the running build:
//   paused   -> { status: "pending", fetchStatus: "paused" }  => isLoading false, isError false
//   loading  -> { status: "pending", fetchStatus: "fetching" } => isLoading true
//   error    -> { status: "error" }
const q = (over: Partial<QueryLike>): QueryLike => ({ isLoading: false, isPaused: false, isError: false, data: undefined, ...over });

const loading = q({ isLoading: true });
const pausedNoCache = q({ isPaused: true });
const pausedWithCache = q({ isPaused: true, data: [{ id: 1 }] });
const failed = q({ isError: true });
const failedWithCache = q({ isError: true, data: [{ id: 1 }] });
const loaded = q({ data: [{ id: 1 }] });
const loadedEmpty = q({ data: [] });

describe("the offline case that caused BUG-020", () => {
  it("reports a paused query with no cache as offline, not empty", () => {
    expect(resolveQueryPhase(pausedNoCache, true)).toBe("offline");
    expect(resolveQueryPhase(pausedNoCache, false)).toBe("offline");
  });

  it("never reports offline as empty even when the caller says the data is empty", () => {
    expect(resolveQueryPhase(pausedNoCache, true)).not.toBe("empty");
  });

  it("never reports offline as an error", () => {
    expect(resolveQueryPhase(pausedNoCache)).not.toBe("error");
  });

  it("identifies the no-cache offline case for the page-level branch", () => {
    expect(isStalledWithoutData(pausedNoCache)).toBe(true);
    expect(isStalledWithoutData(pausedWithCache)).toBe(false);
    expect(isStalledWithoutData(loaded)).toBe(false);
    expect(isStalledWithoutData(loading)).toBe(false);
  });
});

describe("offline with cached data keeps the cached view", () => {
  it("stays on success so the cached rows remain rendered", () => {
    expect(resolveQueryPhase(pausedWithCache)).toBe("success");
  });

  it("flags that the cached view may be stale", () => {
    expect(showsStaleData(pausedWithCache)).toBe(true);
    expect(isStalledWithData(pausedWithCache)).toBe(true);
  });

  it("does not flag a healthy loaded query as stale", () => {
    expect(showsStaleData(loaded)).toBe(false);
    expect(isStalledWithData(loaded)).toBe(false);
  });

  it("still reports empty when the cached data is genuinely an empty list", () => {
    expect(resolveQueryPhase(q({ isPaused: true, data: [] }), true)).toBe("empty");
  });
});

describe("genuine errors stay visible", () => {
  it("reports a failure with no cache as an error", () => {
    expect(resolveQueryPhase(failed)).toBe("error");
  });

  it("never silently falls through to empty on error", () => {
    expect(resolveQueryPhase(failed, true)).toBe("error");
  });

  it("prefers cached data over an error screen, but marks it stale", () => {
    expect(resolveQueryPhase(failedWithCache)).toBe("success");
    expect(showsStaleData(failedWithCache)).toBe(true);
  });
});

describe("ordinary phases", () => {
  it("reports loading while a fetch is in flight", () => {
    expect(resolveQueryPhase(loading)).toBe("loading");
  });

  it("prefers loading over every other phase", () => {
    expect(resolveQueryPhase(q({ isLoading: true, isPaused: true, isError: true }))).toBe("loading");
  });

  it("reports success when data is present", () => {
    expect(resolveQueryPhase(loaded, false)).toBe("success");
  });

  it("reports empty only when the request actually resolved with nothing", () => {
    expect(resolveQueryPhase(loadedEmpty, true)).toBe("empty");
  });

  it("treats an idle query with no data as still loading rather than empty", () => {
    expect(resolveQueryPhase(q({}), true)).toBe("loading");
  });
});

describe("resolveQueryState bundles phase and staleness", () => {
  it("returns both for the offline-with-cache case", () => {
    expect(resolveQueryState(pausedWithCache)).toEqual({ phase: "success", showStaleNotice: true });
  });

  it("returns both for the offline-without-cache case", () => {
    expect(resolveQueryState(pausedNoCache)).toEqual({ phase: "offline", showStaleNotice: false });
  });

  it("covers all five phases across the model", () => {
    const phases = new Set([
      resolveQueryPhase(loading),
      resolveQueryPhase(pausedNoCache),
      resolveQueryPhase(failed),
      resolveQueryPhase(loadedEmpty, true),
      resolveQueryPhase(loaded),
    ]);

    expect(phases).toEqual(new Set(["loading", "offline", "error", "empty", "success"]));
  });
});


// Regression coverage for the production defect where an offline cart still offered checkout.
//
// TanStack sets fetchStatus "paused" only for a fetch it ACTUALLY ATTEMPTS while offline. A query
// that already settled with fresh data never attempts one, so it stays unpaused even with the
// network down -- which is why `isStalledWithData` alone could not gate the checkout button.
describe("isWriteBlocked", () => {
  const settledWithData: QueryLike = { isLoading: false, isPaused: false, isError: false, data: [1] };
  const pausedWithData: QueryLike = { isLoading: false, isPaused: true, isError: false, data: [1] };
  const pausedNoData: QueryLike = { isLoading: false, isPaused: true, isError: false, data: undefined };
  const emptySettled: QueryLike = { isLoading: false, isPaused: false, isError: false, data: [] };

  it("allows writes when online with settled data", () => {
    expect(isWriteBlocked(settledWithData, false)).toBe(false);
  });

  it("BLOCKS writes when offline even though the query never paused", () => {
    // This is the exact production case: cart visible, query unpaused, network down.
    expect(settledWithData.isPaused).toBe(false);
    expect(isWriteBlocked(settledWithData, true)).toBe(true);
  });

  it("blocks writes when the query is paused with cached data, even if reported online", () => {
    expect(isWriteBlocked(pausedWithData, false)).toBe(true);
  });

  it("blocks writes when offline and paused", () => {
    expect(isWriteBlocked(pausedWithData, true)).toBe(true);
  });

  it("blocks writes when offline with no cached data at all", () => {
    expect(isWriteBlocked(pausedNoData, true)).toBe(true);
  });

  it("re-allows writes as soon as connectivity returns", () => {
    expect(isWriteBlocked(settledWithData, true)).toBe(true);
    expect(isWriteBlocked(settledWithData, false)).toBe(false);
  });

  it("does not block a legitimately empty cart while online", () => {
    // Empty must stay empty -- it is not an offline state.
    expect(isWriteBlocked(emptySettled, false)).toBe(false);
    expect(isStalledWithoutData(emptySettled)).toBe(false);
  });

  it("treats a legitimately empty cart as blocked only when offline", () => {
    expect(isWriteBlocked(emptySettled, true)).toBe(true);
  });

  it("is a pure function of connectivity OR staleness", () => {
    for (const offline of [true, false]) {
      for (const q of [settledWithData, pausedWithData, pausedNoData, emptySettled]) {
        expect(isWriteBlocked(q, offline)).toBe(offline || isStalledWithData(q));
      }
    }
  });
});
