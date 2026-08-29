import { describe, expect, it } from "vitest";
import { isStalledWithData, isStalledWithoutData, resolveQueryPhase, resolveQueryState, showsStaleData, type QueryLike } from "./queryState";

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
