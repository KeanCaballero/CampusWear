import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  readStoredSidebarWidth,
  SIDEBAR_WIDTH_KEY,
  storeSidebarWidth,
} from "./sidebarWidth";

/**
 * The read runs inside a `useState` initializer in DashboardLayout, so anything it throws happens
 * during render and blanks the whole workspace. These tests exist to keep that impossible.
 */

/** Replaces globalThis.localStorage for one test. `undefined` models the property itself throwing. */
function withStorage(store: Partial<Storage> | "throws" | undefined) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  if (store === "throws") {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new DOMException("The operation is insecure.", "SecurityError"); },
    });
  } else {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: store });
  }
  return () => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as Record<string, unknown>).localStorage;
  };
}

let restore: (() => void) | null = null;
afterEach(() => { restore?.(); restore = null; });

describe("reading a remembered width never breaks a render", () => {
  it("returns the default when nothing is stored", () => {
    restore = withStorage({ getItem: () => null, setItem: () => {} });
    expect(readStoredSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
  });

  it("returns the default instead of throwing when the accessor itself throws", () => {
    // A browser set to block site data throws on `globalThis.localStorage`, not on the method.
    restore = withStorage("throws");
    expect(() => readStoredSidebarWidth()).not.toThrow();
    expect(readStoredSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
  });

  it("returns the default instead of throwing when getItem throws", () => {
    restore = withStorage({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} });
    expect(readStoredSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
  });

  it("survives storage being absent entirely", () => {
    restore = withStorage(undefined);
    expect(readStoredSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
  });

  it("never returns NaN for a corrupt stored value", () => {
    for (const corrupt of ["NaN", "abc", "", "   ", "null", "undefined", "{}"]) {
      restore?.();
      restore = withStorage({ getItem: () => corrupt, setItem: () => {} });
      const width = readStoredSidebarWidth();
      expect(Number.isFinite(width), `stored ${JSON.stringify(corrupt)}`).toBe(true);
      expect(width).toBe(DEFAULT_SIDEBAR_WIDTH);
    }
  });

  it("keeps a valid stored width", () => {
    restore = withStorage({ getItem: () => "300", setItem: () => {} });
    expect(readStoredSidebarWidth()).toBe(300);
  });

  it("clamps a stored width to the bounds the drag handle enforces", () => {
    restore = withStorage({ getItem: () => "9999", setItem: () => {} });
    expect(readStoredSidebarWidth()).toBe(MAX_SIDEBAR_WIDTH);
    restore();
    restore = withStorage({ getItem: () => "-40", setItem: () => {} });
    expect(readStoredSidebarWidth()).toBe(MIN_SIDEBAR_WIDTH);
  });

  it("tolerates a trailing-unit value rather than producing NaNpx", () => {
    restore = withStorage({ getItem: () => "280px", setItem: () => {} });
    expect(readStoredSidebarWidth()).toBe(280);
  });
});

describe("writing the width is best-effort", () => {
  it("stores the value under the expected key", () => {
    const setItem = vi.fn();
    restore = withStorage({ getItem: () => null, setItem });
    storeSidebarWidth(288);
    expect(setItem).toHaveBeenCalledWith(SIDEBAR_WIDTH_KEY, "288");
  });

  it("swallows a storage failure instead of surfacing it", () => {
    restore = withStorage({ getItem: () => null, setItem: () => { throw new Error("quota"); } });
    expect(() => storeSidebarWidth(288)).not.toThrow();
  });

  it("swallows the accessor throwing too", () => {
    restore = withStorage("throws");
    expect(() => storeSidebarWidth(288)).not.toThrow();
  });

  it("never persists NaN, so one bad value cannot become permanent", () => {
    const setItem = vi.fn();
    restore = withStorage({ getItem: () => "NaN", setItem });
    storeSidebarWidth(readStoredSidebarWidth());
    expect(setItem).toHaveBeenCalledWith(SIDEBAR_WIDTH_KEY, String(DEFAULT_SIDEBAR_WIDTH));
  });
});

describe("clamping", () => {
  it("leaves an in-range width alone and pins the extremes", () => {
    expect(clampSidebarWidth(272)).toBe(272);
    expect(clampSidebarWidth(MIN_SIDEBAR_WIDTH - 1)).toBe(MIN_SIDEBAR_WIDTH);
    expect(clampSidebarWidth(MAX_SIDEBAR_WIDTH + 1)).toBe(MAX_SIDEBAR_WIDTH);
  });

  it("keeps the default inside its own bounds", () => {
    expect(DEFAULT_SIDEBAR_WIDTH).toBeGreaterThanOrEqual(MIN_SIDEBAR_WIDTH);
    expect(DEFAULT_SIDEBAR_WIDTH).toBeLessThanOrEqual(MAX_SIDEBAR_WIDTH);
  });
});
