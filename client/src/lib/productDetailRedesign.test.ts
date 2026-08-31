import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/ProductDetail.tsx", import.meta.url), "utf8");
const catalog = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8");
const catalogRpc = readFileSync(new URL("../../../supabase/migrations/20260825071000_public_catalog.sql", import.meta.url), "utf8");

describe("product detail keeps the full five-state model", () => {
  it("handles loading, offline, error, not-found, and success", () => {
    expect(source).toContain("product.isLoading");
    expect(source).toContain("isStalledWithoutData(product)");
    expect(source).toContain("product.isError");
    expect(source).toContain("if (!product.data)");
  });

  it("decides offline before error and before the not-found state", () => {
    const offlineAt = source.indexOf("isStalledWithoutData(product)");
    const errorAt = source.indexOf("product.isError");
    const notFoundAt = source.indexOf("if (!product.data)");

    expect(offlineAt).toBeGreaterThan(-1);
    expect(offlineAt).toBeLessThan(errorAt);
    expect(errorAt).toBeLessThan(notFoundAt);
  });

  it("distinguishes a load failure from a product that is genuinely gone", () => {
    expect(source).toContain("This product could not be loaded");
    expect(source).toContain("This product is unavailable");
  });

  it("offers recovery from every failure state", () => {
    expect(source).toContain("onRetry={() => product.refetch()}");
    expect(source).toContain("onClick: () => product.refetch()");
    expect(source).toContain('onClick: () => setLocation("/shop")');
  });
});

describe("business logic is preserved", () => {
  it("keeps the route, query key, and data source untouched", () => {
    expect(source).toContain('useRoute("/shop/:id")');
    expect(source).toContain('queryKey: ["supabase-product", productId]');
    expect(source).toContain("getPublicCatalogProduct(productId!)");
    expect(source).toContain("enabled: Boolean(productId)");
  });

  it("keeps the variant fallback chain that picks a sellable size first", () => {
    expect(source).toContain('productData.variants.find(variant => variant.availability !== "out_of_stock")');
    expect(source).toContain("productData.variants[0]");
  });

  it("still sends the same mutation payload to the cart", () => {
    expect(source).toContain("addToCart.mutate({ productId: productData.id, variantId: selected.id, quantity })");
  });

  it("still routes unauthenticated students to sign in with a next path", () => {
    expect(source).toContain("if (!isAuthenticated)");
    expect(source).toContain("/auth?next=");
  });
});

describe("size selection", () => {
  it("groups the sizes semantically", () => {
    expect(source).toContain("<fieldset className=");
    expect(source).toContain("<legend className=");
  });

  it("blocks out-of-stock sizes rather than hiding them", () => {
    expect(source).toContain('const unavailable = variant.availability === "out_of_stock"');
    expect(source).toContain("disabled={unavailable}");
    expect(source).toContain("line-through");
  });

  it("announces the selected size's availability to assistive tech", () => {
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain('id="selected-size-availability"');
    expect(source).toContain('aria-describedby="selected-size-availability"');
    expect(source).toContain("aria-pressed={active}");
  });

  it("gives a non-visual cue that a size is sold out", () => {
    expect(source).toMatch(/sr-only[^<]*sold out/);
  });

  it("styles a sold-out size as sold out even when it is the fallback selection", () => {
    // With no sellable variant the fallback still selects one; it must never look orderable.
    const soldOutStyleAt = source.indexOf("cursor-not-allowed border-border bg-muted");
    const activeStyleAt = source.indexOf("border-primary bg-primary text-primary-foreground");

    expect(soldOutStyleAt).toBeGreaterThan(-1);
    expect(activeStyleAt).toBeGreaterThan(soldOutStyleAt);
  });

  it("keeps size targets at least 48px", () => {
    expect(source).toContain("min-h-12 min-w-12");
  });
});

describe("quantity control", () => {
  it("clamps between 1 and the existing maximum", () => {
    expect(source).toContain("const MAX_QUANTITY = 10");
    expect(source).toContain("Math.max(1, value - 1)");
    expect(source).toContain("Math.min(MAX_QUANTITY, value + 1)");
  });

  it("disables the controls at the bounds and when nothing can be added", () => {
    expect(source).toContain("disabled={!canAdd || quantity <= 1}");
    expect(source).toContain("disabled={!canAdd || quantity >= MAX_QUANTITY}");
  });

  it("is labelled as a group and announces the current value", () => {
    expect(source).toContain('role="group" aria-labelledby="quantity-label"');
    expect(source).toContain('<output className="grid w-10 place-items-center text-sm font-bold tabular-nums" aria-live="polite">');
  });

  it("resets to 1 when a different size is chosen", () => {
    expect(source).toMatch(/chooseVariant[\s\S]{0,120}setQuantity\(1\)/);
  });
});

describe("primary action", () => {
  it("is disabled when the selected size cannot be ordered", () => {
    expect(source).toContain("disabled={!canAdd || addToCart.isPending}");
  });

  it("states why it is unavailable rather than going silent", () => {
    expect(source).toContain('!canAdd ? "Out of stock"');
    expect(source).toContain('"Adding to cart…"');
  });

  it("stays reachable on mobile without duplicating the handler", () => {
    expect(source).toContain("const submitToCart = () =>");
    expect(source.match(/onClick=\{submitToCart\}/g)?.length).toBe(2);
    expect(source).toContain("md:hidden");
  });
});

describe("student-facing inventory disclosure", () => {
  it("never renders a raw stock number, matching the catalogue RPC's contract", () => {
    // get_public_catalog deliberately projects availability labels only.
    expect(catalogRpc).toContain("exposes availability labels only, never raw stock quantities");

    // The guarantee is that the STORE's stock level is never shown. It is structurally
    // impossible: CatalogVariant carries only { id, size, availability } — there is no
    // quantity field on student-facing catalogue data to leak.
    const catalogTypes = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8");
    expect(catalogTypes).toContain("export type CatalogVariant = { id: string; size: string; availability: Availability };");

    // No inventory field is read anywhere on the page.
    expect(source).not.toMatch(/variant\.quantity|selected\.quantity|inventory\.quantity/);
    expect(source).not.toMatch(/lowStockThreshold/);

    // `variables.quantity` in the add-to-cart confirmation is the quantity the STUDENT chose,
    // which they already know. Echoing it back discloses nothing about the store.
  });

  it("does not surface internal SKUs to students", () => {
    expect(source).not.toMatch(/\bsku\b/i);
  });

  it("relies on the shared availability copy rather than inventing stock wording", () => {
    expect(source).toContain("selectedVariantAvailabilityCopy");
    expect(catalog).toContain('export type Availability = "in_stock" | "low_stock" | "out_of_stock"');
  });
});
