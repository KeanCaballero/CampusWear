import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cartAriaLabel, cartBadgeCount, cartBadgeText, CART_BADGE_MAX } from "./cartBadge";
import type { CartLine } from "./supabaseCatalog";

const line = (variantId: string, quantity: number, isUnavailable = false): CartLine => ({
  variantId,
  productId: `p-${variantId}`,
  productName: `Item ${variantId}`,
  imageUrl: null,
  size: "M",
  vendorName: "Campus store",
  unitPriceInCentavos: 50000,
  quantity,
  availability: isUnavailable ? "out_of_stock" : "in_stock",
  isUnavailable,
});

describe("A–D. the badge counts total quantity, not distinct lines", () => {
  it("A. empty cart shows no badge", () => {
    expect(cartBadgeCount([])).toBe(0);
    expect(cartBadgeText(0)).toBe("");
  });

  it("B. one unit shows \"1\"", () => {
    expect(cartBadgeCount([line("v1", 1)])).toBe(1);
    expect(cartBadgeText(1)).toBe("1");
  });

  it("C. two units of one product show \"2\", not \"1\"", () => {
    expect(cartBadgeCount([line("v1", 2)])).toBe(2);
    expect(cartBadgeText(2)).toBe("2");
  });

  it("D. several lines sum to their total quantity", () => {
    // 1 polo x 2 + 1 trousers x 1 = 3, per the brief's worked example.
    expect(cartBadgeCount([line("polo", 2), line("trousers", 1)])).toBe(3);
    expect(cartBadgeText(3)).toBe("3");
  });

  it("caps the printed form but never the real number", () => {
    expect(cartBadgeText(CART_BADGE_MAX)).toBe(String(CART_BADGE_MAX));
    expect(cartBadgeText(CART_BADGE_MAX + 1)).toBe(`${CART_BADGE_MAX}+`);
    expect(cartAriaLabel(37)).toBe("Cart, 37 items");
  });

  it("excludes lines that can no longer be ordered", () => {
    // An unavailable line stays on the cart page so it can be removed, but it contributes nothing
    // to a total and checkout would refuse it, so counting it would overstate the cart.
    expect(cartBadgeCount([line("v1", 2), line("gone", 5, true)])).toBe(2);
  });

  it("is safe while the query is still loading", () => {
    expect(cartBadgeCount(undefined)).toBe(0);
    expect(cartBadgeCount(null)).toBe(0);
    expect(cartBadgeText(cartBadgeCount(undefined))).toBe("");
  });
});

describe("E–G. the badge follows every cart change", () => {
  it("E. increasing a quantity raises the count", () => {
    const before = [line("v1", 1), line("v2", 1)];
    expect(cartBadgeCount(before)).toBe(2);
    const after = before.map(l => (l.variantId === "v1" ? { ...l, quantity: 4 } : l));
    expect(cartBadgeCount(after)).toBe(5);
    expect(cartBadgeText(5)).toBe("5");
  });

  it("E. decreasing a quantity lowers it", () => {
    const after = [line("v1", 1), line("v2", 1)].map(l => (l.variantId === "v1" ? { ...l, quantity: 1 } : l));
    expect(cartBadgeCount(after)).toBe(2);
  });

  it("F. removing an item drops its units", () => {
    const before = [line("v1", 3), line("v2", 2)];
    expect(cartBadgeCount(before)).toBe(5);
    expect(cartBadgeCount(before.filter(l => l.variantId !== "v1"))).toBe(2);
  });

  it("G. clearing the cart removes the badge entirely", () => {
    expect(cartBadgeCount([line("v1", 3)])).toBe(3);
    // Checkout empties the cart and invalidates the shared key; the refreshed list is empty.
    expect(cartBadgeText(cartBadgeCount([]))).toBe("");
  });
});

describe("H. accessibility", () => {
  it("names the control and its count, so the badge is never the only signal", () => {
    expect(cartAriaLabel(0)).toBe("Cart, empty");
    expect(cartAriaLabel(1)).toBe("Cart, 1 item");
    expect(cartAriaLabel(3)).toBe("Cart, 3 items");
  });

  it("keeps the accessible count exact even when the glyph is capped", () => {
    expect(cartBadgeText(12)).toBe("9+");
    expect(cartAriaLabel(12)).toBe("Cart, 12 items");
  });
});

describe("I. the shell reuses the existing cart query rather than adding one", () => {
  const shell = readFileSync(new URL("../components/campuswear/StudentShell.tsx", import.meta.url), "utf8");
  const helper = readFileSync(new URL("./cartBadge.ts", import.meta.url), "utf8");

  it("uses the cart page's own query key and fetcher", () => {
    expect(shell).toContain("cartQueryKey(user?.id)");
    expect(shell).toContain("queryFn: listCart");
  });

  it("builds no second cart source of its own", () => {
    expect(shell).not.toContain('from("carts")');
    expect(shell).not.toContain('from("cart_items")');
    expect(helper).not.toContain('from("');
  });

  it("derives the total from the same helper the cart page uses", () => {
    expect(helper).toContain("cartItemCount");
  });

  it("does not fetch for a signed-out visitor", () => {
    expect(shell).toContain("enabled: !loading && Boolean(user?.id)");
  });

  it("actually wires the count into the cart link's accessible name", () => {
    // Testing cartAriaLabel alone would pass even if the shell never called it.
    expect(shell).toContain("aria-label={cartAriaLabel(cartCount)}");
    expect(shell).not.toContain('aria-label="View cart"');
  });

  it("renders the badge from the derived count, not from raw query data", () => {
    expect(shell).toContain("cartBadgeCount(cart.data)");
    expect(shell).toContain("cartBadgeText(cartCount)");
  });
});

describe("header layout and styling", () => {
  const shell = readFileSync(new URL("../components/campuswear/StudentShell.tsx", import.meta.url), "utf8");

  it("shares one badge appearance with the notification bell", () => {
    expect(shell).toContain("const BADGE_CLASS =");
    // Both badges must reference the shared constant, so they cannot drift apart.
    expect((shell.match(/className=\{BADGE_CLASS\}/g) ?? [])).toHaveLength(2);
  });

  it("uses theme tokens, not raw hex", () => {
    const badgeClass = /const BADGE_CLASS =[\s\S]*?;/.exec(shell)?.[0] ?? "";
    expect(badgeClass).toContain("bg-destructive");
    expect(badgeClass).toContain("border-primary");
    expect(badgeClass).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it("is positioned so it cannot change the header's height", () => {
    const badgeClass = /const BADGE_CLASS =[\s\S]*?;/.exec(shell)?.[0] ?? "";
    expect(badgeClass).toContain("absolute");
    // Its anchors must be relatively positioned for that to hold.
    expect((shell.match(/className=\{`relative grid size-10/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps a visible focus ring on the cart control", () => {
    expect(shell).toMatch(/href="\/cart"[\s\S]{0,420}focus-visible:ring-2/);
  });

  it("marks the badge decorative because the link is already named", () => {
    expect((shell.match(/aria-hidden="true"\s*\n\s*className=\{BADGE_CLASS\}/g) ?? [])).toHaveLength(2);
  });
});
