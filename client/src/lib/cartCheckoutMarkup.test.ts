import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cart = readFileSync(new URL("../pages/Cart.tsx", import.meta.url), "utf8");
const plaque = readFileSync(new URL("../components/campuswear/PickupPlaque.tsx", import.meta.url), "utf8");
// The doc comment explains which pickup fields are deliberately absent, so it legitimately
// mentions them. Assertions about what the component RENDERS must not match that prose.
const plaqueCode = plaque.replace(/\/\*\*[\s\S]*?\*\//g, "");

describe("the five query states stay distinguishable", () => {
  it("handles loading, offline, error, empty and success separately", () => {
    expect(cart).toContain("cart.isLoading");
    expect(cart).toContain("isStalledWithoutData(cart)");
    expect(cart).toContain("cart.isError");
    expect(cart).toContain("if (!items.length)");
  });

  it("decides offline before error and before empty", () => {
    const offline = cart.indexOf("isStalledWithoutData(cart)");
    const error = cart.indexOf("cart.isError");
    const empty = cart.indexOf("if (!items.length)");

    expect(offline).toBeGreaterThan(-1);
    expect(offline).toBeLessThan(error);
    expect(error).toBeLessThan(empty);
  });

  it("never calls an offline or failed cart empty", () => {
    const emptyCopy = cart.indexOf("Your cart is empty");
    const offline = cart.indexOf("isStalledWithoutData(cart)");
    expect(offline).toBeLessThan(emptyCopy);
    expect(cart).toContain("Your cart could not be loaded");
  });

  it("keeps a cached cart on screen while it is frozen", () => {
    expect(cart).toContain("isWriteBlocked(cart, isOffline)");
    expect(cart).toContain("This is your saved cart");
  });

  it("blocks checkout whenever the cart is frozen or nothing is orderable", () => {
    expect(cart).toContain("const blocksCheckout = isFrozen || !orderable.length");
    expect(cart).toContain("disabled={blocksCheckout}");
  });
});

// BUG: with cached data and no network the cart stayed visible but the checkout button stayed
// ENABLED, because TanStack only pauses a fetch it actually attempts — a settled query never
// attempts one, so `isPaused` stayed false. Verified live in production.
describe("offline cannot start a checkout", () => {
  it("reads connectivity from the app's canonical signal, not navigator.onLine", () => {
    expect(cart).toContain("useIsOffline()");
    expect(cart).toContain('from "@/components/campuswear/OfflineNotice"');
    expect(cart).not.toContain("navigator.onLine");
  });

  it("freezes the cart on EITHER offline or a paused query", () => {
    expect(cart).toContain("const isFrozen = isWriteBlocked(cart, isOffline)");
  });

  it("stops quantity and remove controls from firing writes while frozen", () => {
    expect(cart).toContain("readOnly={reviewing || isFrozen}");
  });

  it("still distinguishes offline from a query that merely could not refresh", () => {
    // Reporting a server problem as 'you are offline' is the exact mistake BUG-020 corrected.
    expect(cart).toContain('{isOffline ? "You are offline" : "Your cart could not refresh"}');
    expect(cart).toContain('{isOffline ? "Try reconnecting" : "Try again"}');
  });

  it("keeps the cached cart visible rather than falling back to empty", () => {
    const frozenBranch = cart.indexOf("{isFrozen && (");
    const emptyBranch = cart.indexOf('if (!items.length)');
    expect(frozenBranch).toBeGreaterThan(-1);
    // The empty branch returns early ABOVE the frozen banner, so a frozen cart with rows can
    // never reach it.
    expect(emptyBranch).toBeLessThan(frozenBranch);
  });

  it("offers a way to recover from every stalled state", () => {
    expect(cart).toContain("onRetry={() => cart.refetch()}");
    expect(cart).toContain("Try reconnecting");
  });

  it("does not re-implement the paused check inline", () => {
    expect(cart).not.toMatch(/isPaused\s*&&/);
    expect(cart).toContain('from "@/lib/queryState"');
  });
});

describe("multi-vendor behaviour is disclosed, not hidden", () => {
  it("groups the cart by store", () => {
    expect(cart).toContain("groupCartByStore(items)");
  });

  it("warns before confirmation that separate requests will be created", () => {
    expect(cart).toContain("storeNames.length > 1");
    expect(cart).toContain("separate pickup requests");
  });

  it("reports the real number of orders the database created", () => {
    expect(cart).toContain("orders.length > 1");
    expect(cart).toContain("pickup requests placed");
  });
});

describe("the confirmation cannot be lost to a background refetch", () => {
  it("resolves the placed phase before any query-driven branch", () => {
    // Placing an order invalidates the cart query. If that refetch fails, an isError branch
    // evaluated first would replace the order numbers the student just received with a
    // "cart could not be loaded" panel. The confirmation is local state and must win.
    const placed = cart.indexOf('if (phase === "placed")');
    const loading = cart.indexOf("if (cart.isLoading)");
    const offline = cart.indexOf("if (isStalledWithoutData(cart))");
    const error = cart.indexOf("if (cart.isError)");
    const empty = cart.indexOf("if (!items.length)");

    expect(placed).toBeGreaterThan(-1);
    for (const branch of [loading, offline, error, empty]) {
      expect(branch).toBeGreaterThan(-1);
      expect(placed).toBeLessThan(branch);
    }
  });
});

describe("stock conflicts name the affected item", () => {
  it("routes the typed conflict error to its own branch", () => {
    expect(cart).toContain("error instanceof CheckoutStockConflictError");
    expect(cart).toContain("setConflict(error)");
  });

  it("renders the product and size the database identified", () => {
    expect(cart).toContain("conflict.productName");
    expect(cart).toContain("conflict.size");
  });

  it("highlights the offending row in the cart", () => {
    expect(cart).toContain("isConflictLine(conflict, line)");
    expect(cart).toContain("highlighted");
  });

  it("returns the student to the cart so they can fix it", () => {
    expect(cart).toMatch(/setConflict\(error\);[\s\S]{0,120}setPhase\("cart"\)/);
  });

  it("promises the cart is unchanged, which the transactional RPC guarantees", () => {
    expect(cart).toContain("Nothing was ordered and your cart has not changed");
  });
});

describe("unavailable items are surfaced, never silently dropped", () => {
  it("renders a dedicated row state", () => {
    expect(cart).toContain("line.isUnavailable");
    expect(cart).toContain("This item is no longer available");
  });

  it("gives the student a way to resolve it", () => {
    expect(cart).toContain("Remove item");
  });

  it("stops checkout while nothing orderable remains", () => {
    expect(cart).toContain("!orderable.length");
  });
});

describe("no fabricated commerce fields", () => {
  it("invents no tax, fee, shipping or discount line", () => {
    expect(cart).not.toMatch(/\btax\b/i);
    expect(cart).not.toMatch(/processing fee/i);
    expect(cart).not.toMatch(/\bshipping\b/i);
    expect(cart).not.toMatch(/discount/i);
  });

  it("collects no payment details", () => {
    expect(cart).not.toMatch(/card number|cvv|payment method/i);
    expect(cart).toContain("No online payment");
  });

  it("does not ask for a pickup person or student ID the RPC cannot store", () => {
    expect(cart).not.toMatch(/pickup person/i);
    expect(cart).not.toMatch(/student id/i);
  });

  it("exposes no SKU or internal identifier", () => {
    expect(cart).not.toMatch(/\bsku\b/i);
    expect(cart).not.toMatch(/variant_id|product_id/);
  });

  it("shows availability labels rather than raw stock counts", () => {
    expect(cart).toContain('StatusBadge kind="inventory"');
    expect(cart).not.toMatch(/\.quantity\s*\+\s*['"` ]*in stock/i);
  });
});

describe("pickup information stays honest", () => {
  it("shows only the store name the catalogue actually exposes", () => {
    expect(plaque).toContain("storeNames");
    expect(plaque).toContain("Collecting from");
  });

  it("invents no address or opening hours", () => {
    expect(plaqueCode).not.toMatch(/\d{1,4}\s+\w+\s+(Ave|Street|St\.|Road)/i);
    expect(plaqueCode).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    expect(plaqueCode).not.toMatch(/Mon–Fri|Monday|opening hours/i);
  });

  it("states plainly when details are not yet available", () => {
    expect(plaque).toContain("Pickup details will be shown");
  });

  it("records why the richer plaque is not built yet", () => {
    expect(plaque).toContain("get_public_catalog");
  });
});

describe("accessibility", () => {
  it("labels the quantity control as a group and announces its value", () => {
    expect(cart).toContain('role="group"');
    expect(cart).toContain("aria-label={`Quantity for ${line.productName}`}");
    expect(cart).toContain('aria-live="polite"');
  });

  it("labels both quantity buttons and the remove action", () => {
    expect(cart).toContain('aria-label="Decrease quantity"');
    expect(cart).toContain('aria-label="Increase quantity"');
    expect(cart).toContain("aria-label={`Remove ${line.productName} from cart`}");
  });

  it("communicates disabled state beyond colour", () => {
    expect(cart).toContain("disabled:cursor-not-allowed");
    expect(cart).toContain("line.quantity <= 1 || pending");
    expect(cart).toContain("line.quantity >= MAX_QUANTITY || soldOut");
  });

  it("announces errors and confirmations to assistive tech", () => {
    expect(cart).toMatch(/role="alert"/);
    expect(cart).toMatch(/role="status"/);
  });

  it("ties the pickup field to its help text and marks it invalid", () => {
    expect(cart).toContain('aria-describedby="pickup-location-help"');
    expect(cart).toContain("aria-invalid={form.formState.errors.pickupLocation ? true : undefined}");
    expect(cart).toContain('htmlFor="pickupLocation"');
  });

  it("moves focus to the heading when the step changes", () => {
    expect(cart).toContain("headingRef.current?.focus()");
    expect(cart).toContain("tabIndex={-1}");
  });

  it("uses semantic buttons rather than clickable divs", () => {
    expect(cart).toContain('type="button"');
    expect(cart).not.toMatch(/<div[^>]*onClick=/);
  });
});

describe("touch targets and responsive layout", () => {
  it("keeps interactive controls at 44px or more", () => {
    expect(cart).toContain("size-11");
    expect(cart).toContain("min-h-11");
    expect(cart).toContain("min-h-12 w-full");
  });

  it("stacks to a single column before the summary rail appears", () => {
    expect(cart).toContain("lg:grid-cols-[minmax(0,1fr)_360px]");
  });

  it("guards against overflow from long product and location strings", () => {
    expect(cart).toContain("min-w-0");
    expect(cart).toContain("break-words");
  });
});

describe("theming uses tokens, not page-level hacks", () => {
  it("declares no raw brand hex values", () => {
    expect(cart).not.toMatch(/#0[Ff]2747|#2563[Ee][Bb]|#[Ff]4[Bb]942/);
    expect(plaque).not.toMatch(/#0[Ff]2747|#2563[Ee][Bb]|#[Ff]4[Bb]942/);
  });

  it("styles through semantic tokens so a dark palette cannot invert into navy-on-navy", () => {
    expect(cart).toContain("text-muted-foreground");
    expect(cart).toContain("border-border");
    expect(cart).toContain("bg-card");
    expect(plaque).toContain("border-l-primary");
  });

  it("adds no ad-hoc dark-mode overrides", () => {
    expect(cart).not.toMatch(/dark:/);
    expect(plaque).not.toMatch(/dark:/);
  });
});
