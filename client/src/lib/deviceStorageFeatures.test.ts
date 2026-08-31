import { afterEach, describe, expect, it } from "vitest";
import { isStorageAvailable, readList, storageKey, writeList } from "./safeStorage";
import { favoriteActionLabel, favoritesKey, isFavorite, readFavorites, toggleFavorite } from "./favorites";
import { RECENTLY_VIEWED_LIMIT, readRecentlyViewed, recentlyViewedKey, recordRecentlyViewed } from "./recentlyViewed";

/**
 * Favorites and Recently viewed persist on the device because neither has a table and this pass
 * adds no migration. That makes storage a rendering dependency, so the failure modes below are the
 * point of the suite, not an afterthought.
 */

type Mode = "working" | "throws-on-access" | "throws-on-write" | "absent";

/** Swaps globalThis.localStorage for one test. Restores the real descriptor afterwards. */
function useStorage(mode: Mode, seed: Record<string, string> = {}) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const restore = () => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as Record<string, unknown>).localStorage;
  };

  if (mode === "throws-on-access") {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new DOMException("The operation is insecure.", "SecurityError"); },
    });
    return restore;
  }

  const store = new Map(Object.entries(seed));
  const value =
    mode === "absent"
      ? undefined
      : {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => {
            if (mode === "throws-on-write") throw new DOMException("QuotaExceededError");
            store.set(k, v);
          },
          removeItem: (k: string) => { store.delete(k); },
        };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value });
  return restore;
}

let restore: (() => void) | null = null;
afterEach(() => { restore?.(); restore = null; });

// ---------------------------------------------------------------------------------------------
describe("safeStorage never lets a page fail", () => {
  it("namespaces per feature and per user, so two accounts on one laptop do not mix", () => {
    expect(storageKey("favorites", "user-a")).toBe("campuswear:favorites:user-a");
    expect(storageKey("favorites", "user-b")).not.toBe(storageKey("favorites", "user-a"));
    expect(storageKey("favorites", null)).toBe("campuswear:favorites:anonymous");
    expect(storageKey("favorites", undefined)).toBe("campuswear:favorites:anonymous");
  });

  it("reports storage unavailable rather than throwing, when the accessor itself throws", () => {
    restore = useStorage("throws-on-access");
    expect(() => isStorageAvailable()).not.toThrow();
    expect(isStorageAvailable()).toBe(false);
  });

  it("reports unavailable when writes are refused, even though reads work", () => {
    restore = useStorage("throws-on-write");
    expect(isStorageAvailable()).toBe(false);
  });

  it("survives storage being absent entirely", () => {
    restore = useStorage("absent");
    expect(isStorageAvailable()).toBe(false);
    expect(readList("k", (v): v is string => typeof v === "string")).toEqual([]);
    expect(writeList("k", ["a"])).toBe(false);
  });

  it("treats unparseable JSON as an empty list", () => {
    restore = useStorage("working", { k: "{not json" });
    expect(readList("k", (v): v is string => typeof v === "string")).toEqual([]);
  });

  it("treats a non-array payload as empty", () => {
    restore = useStorage("working", { k: JSON.stringify({ nope: true }) });
    expect(readList("k", (v): v is string => typeof v === "string")).toEqual([]);
  });

  it("keeps the valid entries when only part of the list is corrupt", () => {
    // Losing every favorite because one record is malformed would be the worse failure.
    restore = useStorage("working", { k: JSON.stringify(["good", 42, null, { a: 1 }, "also-good"]) });
    expect(readList("k", (v): v is string => typeof v === "string")).toEqual(["good", "also-good"]);
  });
});

// ---------------------------------------------------------------------------------------------
describe("favorites", () => {
  it("starts empty and adds a product", () => {
    restore = useStorage("working");
    expect(readFavorites("u1")).toEqual([]);
    const result = toggleFavorite("u1", "p1");
    expect(result.added).toBe(true);
    expect(result.persisted).toBe(true);
    expect(result.favorites).toEqual(["p1"]);
    expect(readFavorites("u1")).toEqual(["p1"]);
  });

  it("toggles the same product back off", () => {
    restore = useStorage("working");
    toggleFavorite("u1", "p1");
    const off = toggleFavorite("u1", "p1");
    expect(off.added).toBe(false);
    expect(off.favorites).toEqual([]);
    expect(readFavorites("u1")).toEqual([]);
  });

  it("puts the newest favorite first", () => {
    restore = useStorage("working");
    toggleFavorite("u1", "p1");
    toggleFavorite("u1", "p2");
    expect(readFavorites("u1")).toEqual(["p2", "p1"]);
  });

  it("never stores the same product twice", () => {
    restore = useStorage("working", { [favoritesKey("u1")]: JSON.stringify(["p1", "p1", "p1"]) });
    // A duplicated list from an older build collapses on the next toggle rather than compounding.
    const off = toggleFavorite("u1", "p1");
    expect(off.favorites).toEqual([]);
  });

  it("keeps one student's favorites out of another's", () => {
    restore = useStorage("working");
    toggleFavorite("u1", "p1");
    expect(readFavorites("u2")).toEqual([]);
    expect(readFavorites("u1")).toEqual(["p1"]);
  });

  it("still updates in memory when the write is refused, and says so", () => {
    restore = useStorage("throws-on-write");
    const result = toggleFavorite("u1", "p1");
    expect(result.added).toBe(true);
    expect(result.favorites).toEqual(["p1"]);
    expect(result.persisted).toBe(false); // honest: it will not survive a reload
  });

  it("does not throw when storage is blocked outright", () => {
    restore = useStorage("throws-on-access");
    expect(() => readFavorites("u1")).not.toThrow();
    expect(readFavorites("u1")).toEqual([]);
    expect(() => toggleFavorite("u1", "p1")).not.toThrow();
  });

  it("answers membership questions without touching storage", () => {
    expect(isFavorite(["p1", "p2"], "p1")).toBe(true);
    expect(isFavorite(["p1"], "p9")).toBe(false);
    expect(isFavorite([], "p1")).toBe(false);
  });

  it("labels the ACTION, not the state, and names the product", () => {
    expect(favoriteActionLabel("BSIT Uniform", false)).toBe("Add BSIT Uniform to favorites");
    expect(favoriteActionLabel("BSIT Uniform", true)).toBe("Remove BSIT Uniform from favorites");
  });
});

// ---------------------------------------------------------------------------------------------
describe("recently viewed", () => {
  it("records a visit", () => {
    restore = useStorage("working");
    expect(readRecentlyViewed("u1")).toEqual([]);
    expect(recordRecentlyViewed("u1", "p1").recent).toEqual(["p1"]);
  });

  it("puts the most recent first", () => {
    restore = useStorage("working");
    recordRecentlyViewed("u1", "p1");
    recordRecentlyViewed("u1", "p2");
    recordRecentlyViewed("u1", "p3");
    expect(readRecentlyViewed("u1")).toEqual(["p3", "p2", "p1"]);
  });

  it("moves a revisited product to the front instead of duplicating it", () => {
    restore = useStorage("working");
    recordRecentlyViewed("u1", "p1");
    recordRecentlyViewed("u1", "p2");
    recordRecentlyViewed("u1", "p1");
    expect(readRecentlyViewed("u1")).toEqual(["p1", "p2"]);
  });

  it("stays bounded no matter how much browsing happens", () => {
    restore = useStorage("working");
    for (let i = 0; i < RECENTLY_VIEWED_LIMIT + 10; i++) recordRecentlyViewed("u1", `p${i}`);
    const recent = readRecentlyViewed("u1");
    expect(recent).toHaveLength(RECENTLY_VIEWED_LIMIT);
    // The oldest entries fell off the end.
    expect(recent[0]).toBe(`p${RECENTLY_VIEWED_LIMIT + 9}`);
    expect(recent).not.toContain("p0");
  });

  it("trims an over-long stored list on read", () => {
    const oversized = Array.from({ length: 40 }, (_, i) => `p${i}`);
    restore = useStorage("working", { [recentlyViewedKey("u1")]: JSON.stringify(oversized) });
    expect(readRecentlyViewed("u1")).toHaveLength(RECENTLY_VIEWED_LIMIT);
  });

  it("ignores an empty product id", () => {
    restore = useStorage("working");
    expect(recordRecentlyViewed("u1", "").recent).toEqual([]);
  });

  it("does not throw when storage is blocked", () => {
    restore = useStorage("throws-on-access");
    expect(() => recordRecentlyViewed("u1", "p1")).not.toThrow();
    expect(readRecentlyViewed("u1")).toEqual([]);
  });

  it("keeps one student's history out of another's", () => {
    restore = useStorage("working");
    recordRecentlyViewed("u1", "p1");
    expect(readRecentlyViewed("u2")).toEqual([]);
  });

  it("stores ids only, so nothing private is written to the device", () => {
    restore = useStorage("working");
    recordRecentlyViewed("u1", "product-123");
    const raw = globalThis.localStorage.getItem(recentlyViewedKey("u1")) ?? "";
    expect(JSON.parse(raw)).toEqual(["product-123"]);
    expect(raw).not.toMatch(/price|name|email|student/i);
  });
});
