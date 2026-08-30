import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const raw = readFileSync(new URL("../pages/vendor/VendorProducts.tsx", import.meta.url), "utf8");
// The file carries explanatory comments. Assertions about what the page RENDERS or EXECUTES read
// the stripped source, never the prose.
const products = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("search and filtering are client-side only", () => {
  it("adds no argument to the existing query", () => {
    // listManagedProducts() takes no parameters. Passing a search term would change query
    // semantics and require backend support that does not exist.
    expect(products).toContain("queryFn: listManagedProducts");
    expect(products).not.toMatch(/listManagedProducts\([^)]+\)/);
    expect(products.match(/useQuery\(/g)?.length).toBe(1);
  });

  it("narrows the list already in memory", () => {
    expect(products).toContain("const catalog = products.data ?? []");
    expect(products).toContain("useMemo(");
    expect(products).toContain("product.name.toLowerCase().includes(term)");
    expect(products).toContain("product.description.toLowerCase().includes(term)");
  });

  it("filters visibility on the real isActive field", () => {
    expect(products).toContain('visibility === "visible" ? product.isActive : !product.isActive');
    expect(products).not.toMatch(/product\.(rating|sales|views|revenue|popularity)/);
  });

  it("keeps each product's original index so placeholder art does not reshuffle while filtering", () => {
    expect(products).toContain(".map((product, index) => ({ product, index }))");
    expect(products).toContain("filtered.map(({ product, index })");
  });
});

describe("empty states stay truthful", () => {
  it("separates an empty catalog from filters that matched nothing", () => {
    expect(products).toContain('title="Your catalog is empty"');
    expect(products).toContain('title="No products match your filters"');
  });

  it("offers a way out of a zero-result filter", () => {
    expect(products).toContain("const clearFilters = ()");
    expect(products).toContain('label: "Clear filters"');
  });

  it("decides offline and error BEFORE either empty state", () => {
    const offline = products.indexOf("isStalledWithoutData(products)");
    const error = products.indexOf("products.isError");
    const catalogEmpty = products.indexOf("catalog.length ?");
    expect(offline).toBeGreaterThan(-1);
    expect(offline).toBeLessThan(error);
    expect(error).toBeLessThan(catalogEmpty);
  });

  it("keeps the offline and error panels themselves", () => {
    expect(products).toContain("<OfflinePanel");
    expect(products).toContain('title="Catalog records are unavailable"');
  });
});

describe("product deletion protection is untouched", () => {
  it("keeps the blocked-delete branch and its hide fallback", () => {
    expect(products).toContain("error instanceof ProductDeleteBlockedError");
    expect(products).toContain('label: "Hide instead"');
    expect(products).toContain("hide.mutate({ id: product.id, isActive: false })");
  });

  it("never renders raw database text to the vendor", () => {
    expect(products).toContain("error instanceof VendorFacingError ? error.message :");
    expect(products).toContain("The product could not be deleted. Please try again.");
  });

  it("keeps the confirmation dialog and its honest warning", () => {
    expect(products).toContain("<AlertDialog>");
    expect(products).toContain("cannot be deleted");
    expect(products).toContain("Keep product");
  });

  it("keeps every product mutation exactly as it was", () => {
    for (const fn of ["createManagedProduct", "updateManagedProduct", "deleteManagedProduct", "setManagedProductVisibility", "uploadProductImage"]) {
      expect(products).toContain(fn);
    }
    expect(products.match(/useMutation\(/g)?.length).toBe(5);
  });
});

describe("images and variants keep their existing behaviour", () => {
  it("still renders through ProductVisual, so a broken image falls back", () => {
    expect(products).toContain("<ProductVisual");
    expect(products).not.toMatch(/<img[^>]*imageUrl/);
  });

  it("keeps the photo adjuster and its upload path", () => {
    expect(products).toContain("<ProductPhotoAdjuster");
    expect(products).toContain("upload.mutate({ productId: product.id, file })");
  });

  it("scrolls a long size list rather than hiding sizes", () => {
    expect(products).toContain("max-h-44");
    expect(products).toContain("overflow-y-auto");
    expect(products).toContain("product.variants.map(variant =>");
  });

  it("shows only variant fields the catalog query actually returns", () => {
    // listManagedProducts selects id/size/quantity/threshold - no sku - so a card cannot show one.
    expect(products).not.toMatch(/variant\.sku/);
  });
});

describe("no invented data", () => {
  it("adds no metric the product model does not provide", () => {
    for (const forbidden of [/\brating\b/i, /\breviews?\b/i, /units sold/i, /\brevenue\b/i, /\banalytics\b/i, /trending/i, /best ?seller/i]) {
      expect(products).not.toMatch(forbidden);
    }
  });

  it("hardcodes no sample catalog", () => {
    for (const sample of ["PE Uniform Set", "Official University Lanyard", "UC Main Store", "₱450", "₱650"]) {
      expect(products).not.toContain(sample);
    }
  });

  it("keeps every displayed field bound to the real product record", () => {
    for (const binding of ["product.name", "product.description", "product.priceInCentavos", "product.isActive", "product.imageUrl", "product.variants"]) {
      expect(products).toContain(binding);
    }
  });
});

describe("accessibility", () => {
  it("labels the search field and the filter group", () => {
    expect(products).toContain('htmlFor="vendor-product-search"');
    expect(products).toContain('id="vendor-product-search"');
    expect(products).toContain('role="group"');
    expect(products).toContain('aria-label="Filter by visibility"');
  });

  it("communicates filter state and result count to assistive tech", () => {
    expect(products).toContain("aria-pressed={visibility === value}");
    expect(products).toContain('aria-live="polite"');
  });

  it("names the catalog region", () => {
    expect(products).toContain('aria-labelledby="vendor-catalog-title"');
    expect(products).toContain('id="vendor-catalog-title"');
  });

  it("uses semantic controls, not clickable divs", () => {
    expect(products).not.toMatch(/<div[^>]*onClick/);
    expect(products).toContain('type="button"');
  });

  it("keeps touch targets at 44px on the new controls", () => {
    expect(products).toContain("min-h-11 bg-card pl-9");
    expect(products).toContain("min-h-11 flex-1 sm:flex-none");
  });
});

describe("design language and branding", () => {
  it("reuses the Phase 1 panel rather than inventing another surface", () => {
    expect(products).toContain("<WorkspacePanel");
    expect(products).toContain("<WorkspacePage");
    expect(products).not.toContain("rounded-2xl border border-border bg-card");
  });

  it("uses the shared Skeleton and radius token for loading", () => {
    expect(products).toContain("<Skeleton");
    expect(products).toContain("rounded-[var(--radius)]");
    expect(products).not.toContain("animate-pulse rounded-xl bg-muted");
  });

  it("carries no competing brand mark", () => {
    expect(products).not.toContain("GraduationCap");
    expect(products).not.toContain("BrandMark");
  });
});
