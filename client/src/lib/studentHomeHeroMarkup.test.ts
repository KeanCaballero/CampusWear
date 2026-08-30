import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/StudentHome.tsx", import.meta.url), "utf8");

describe("CampusWear student-home hero layering", () => {
  it("keeps decorative artwork behind the readable workspace content", () => {
    expect(page).toContain("relative isolate overflow-hidden");
    // Asserted as a pattern rather than an exact class string: the wrapper also carries the
    // wide-screen grid classes, and the guarantee being protected is the stacking, not the
    // literal attribute value.
    expect(page).toMatch(/className="relative z-10(\s|")/);

    // Full-bleed decorative layers must sit behind content and stay out of hit-testing
    // and the accessibility tree.
    const backdrops = page.match(/pointer-events-none absolute inset-0[^"]*"/g) ?? [];
    expect(backdrops.length).toBeGreaterThan(0);
    for (const layer of backdrops) {
      expect(layer).toContain("z-0");
    }
    expect(page).toMatch(/campus-grid[\s\S]{0,80}aria-hidden="true"/);
  });
});

// The Stitch reference moves the two shortcuts out of the text column and promotes them to
// stacked cards beside the copy, which is also what keeps the panel from being half-empty at
// 1440px and 1920px.
describe("hero composition follows the Stitch reference", () => {
  it("splits into copy and action cards from lg up", () => {
    expect(page).toContain("lg:grid lg:grid-cols-[minmax(0,1fr)_auto]");
    expect(page).toContain("lg:items-center");
  });

  it("stacks the cards under the copy on smaller screens rather than hiding them", () => {
    // They are real navigation, so unlike a decorative panel they must survive at every width.
    // Two-across on phones: full-width stacked cards pushed the hero to ~73% of a 375px viewport.
    expect(page).toContain("mt-7 grid grid-cols-2 gap-3 lg:mt-0");
  });

  it("keeps both shortcuts pointing at the existing routes", () => {
    expect(page).toContain('href="/shop"');
    expect(page).toContain('href="/orders"');
    expect(page).toContain("Check catalog");
    expect(page).toContain("My orders");
  });

  it("uses gold once, for the eyebrow, rather than as a general accent", () => {
    expect(page).toContain("text-campus-gold");
    expect(page.match(/text-campus-gold/g)?.length).toBe(1);
  });

  it("joins the search field and button from sm, as the reference does", () => {
    expect(page).toContain("sm:rounded-r-none");
    expect(page).toContain("sm:rounded-l-none");
  });

  it("does NOT widen body copy, which would hurt readability", () => {
    expect(page).toMatch(/max-w-md text-sm leading-6 text-blue-100/);
  });

  it("scales the heading without removing its cap", () => {
    expect(page).toContain("lg:max-w-2xl xl:text-5xl");
  });
});

describe("product cards follow the Stitch card language", () => {
  it("uses the reference image ratio and overlays the store on it", () => {
    expect(page).toContain('className="aspect-[4/3] w-full"');
    expect(page).toContain("absolute left-2.5 top-2.5");
  });

  it("pairs the name and price on one row", () => {
    expect(page).toContain("flex items-start justify-between gap-2");
    expect(page).toContain("formatPeso(product.priceInCentavos)");
  });

  it("closes each card with a divided call to action", () => {
    expect(page).toContain("border-t border-border pt-3");
    expect(page).toContain("View product");
  });

  it("grows from two columns to four without leaving an orphan row", () => {
    // Four featured products, so 2 -> 4 avoids a single card stranded on a second row.
    expect(page.match(/grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4/g)?.length).toBe(2);
  });

  it("keeps the shared visual component so the broken-image fallback still applies", () => {
    expect(page).toContain("<ProductVisual");
    expect(page).not.toMatch(/<img[^>]*imageUrl/);
  });

  it("keeps availability as a labelled badge, not a colour-only dot", () => {
    // The reference uses a bare coloured dot; StatusBadge carries an icon and text label.
    expect(page).toContain('<StatusBadge kind="inventory"');
  });
});

describe("real data only — nothing from the reference is hardcoded", () => {
  it("binds every product field to the query result", () => {
    for (const binding of ["{product.name}", "product.priceInCentavos", "{product.vendorName}", "product.id", "firstVariant.size", "firstVariant.availability"]) {
      expect(page).toContain(binding);
    }
  });

  it("hardcodes none of the reference's sample products, prices or stores", () => {
    for (const sample of ["PE Uniform Set", "BSIT Male Uniform", "Official University Lanyard", "UC Main Store", "Banilad Campus", "₱450", "₱650", "₱250", "₱85"]) {
      expect(page).not.toContain(sample);
    }
  });

  it("adds no footer links to pages that do not exist", () => {
    for (const link of ["Terms of Service", "Privacy Policy", "Store Locator", "Help Center", "Contact Support"]) {
      expect(page).not.toContain(link);
    }
  });

  it("adds no add-to-cart control on a card, which would bypass size selection", () => {
    // The reference's mobile card has one; CampusWear requires choosing a variant first.
    expect(page).not.toMatch(/add_shopping_cart|Add to cart/i);
  });

  it("invents no statistics, addresses or pickup times", () => {
    expect(page).not.toMatch(/\b\d{2,3}\+?\s*(students|orders|vendors|products) served\b/i);
    expect(page).not.toMatch(/\d{1,4}\s+\w+\s+(Ave|Street|Road)/i);
    expect(page).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });
});

describe("existing student-home behaviour is untouched", () => {
  it("keeps the shared query-state model for the catalogue and announcements", () => {
    expect(page).toContain("isStalledWithoutData(catalog)");
    expect(page).toContain("isStalledWithoutData(notices)");
    expect(page).toContain("<OfflinePanel");
    expect(page).toContain("catalog.refetch()");
    expect(page).toContain("notices.refetch()");
  });

  it("keeps every state branch, including the legitimate empty catalogue", () => {
    expect(page).toContain("catalog.isLoading");
    expect(page).toContain("catalogOffline");
    expect(page).toContain("catalog.isError");
    expect(page).toContain("The catalog is getting ready");
  });

  it("keeps the existing navigation targets", () => {
    for (const href of ['href="/shop"', 'href="/orders"', 'href="/announcements"']) {
      expect(page).toContain(href);
    }
  });

  it("keeps the search form semantics and its submit handler", () => {
    expect(page).toContain('role="search"');
    expect(page).toContain("onSubmit={submitSearch}");
    expect(page).toContain("Search the campus catalog");
  });

  it("adds no new data fetching", () => {
    expect(page.match(/useQuery\(/g)?.length).toBe(2);
  });
});
