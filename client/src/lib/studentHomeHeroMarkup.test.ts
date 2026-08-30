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

// The hero previously stretched to the full container while every child kept a max-width fixed at
// the `sm` breakpoint, so above ~1024px roughly half the navy panel was empty. Measured on
// production: 1176px panel against 576px of content — 600px dead, 51%.
describe("the hero fills wide screens deliberately", () => {
  it("becomes a two-column composition from lg up", () => {
    expect(page).toContain("lg:grid lg:grid-cols-[minmax(0,1fr)_300px]");
    expect(page).toContain("lg:items-center");
    // The column widens again at xl so the left side is not squeezed on large tablets.
    expect(page).toContain("xl:grid-cols-[minmax(0,1fr)_340px]");
  });

  it("stays a single stacked column below lg", () => {
    // The second column is opt-in at lg, so mobile and tablet keep the original composition.
    expect(page).toContain('className="hidden lg:block"');
  });

  it("lets the controls grow into the wider column", () => {
    // Search field and the two shortcut tiles fill the left column instead of stopping at max-w-lg.
    expect(page.match(/sm:max-w-lg[^"]*lg:max-w-none/g)?.length).toBe(2);
  });

  it("does NOT widen body copy, which would hurt readability", () => {
    // The supporting paragraph keeps its measure; only headings and controls scale up.
    expect(page).toContain('className="mt-2.5 max-w-md text-sm leading-6 text-blue-100"');
  });

  it("scales the heading for large screens without removing its cap", () => {
    // Display size is held until xl: at 1024 a 36px heading wrapped to three lines and made the
    // hero taller than the stacked layout it replaced.
    expect(page).toContain("lg:max-w-2xl xl:text-4xl");
  });
});

describe("the wide-screen column uses real data, never invented content", () => {
  it("reuses the catalogue already fetched for this page", () => {
    // No second query: the spotlight is derived from the existing `featured` slice.
    expect(page).toContain("const spotlight = featured[0]");
    expect(page).not.toMatch(/useQuery\([^)]*spotlight/);
  });

  it("renders the product's real name, price and vendor", () => {
    expect(page).toContain("{spotlight.name}");
    expect(page).toContain("formatPeso(spotlight.priceInCentavos)");
    expect(page).toContain("{spotlight.vendorName}");
  });

  it("routes to the real product page and is labelled for assistive tech", () => {
    expect(page).toContain("href={`/shop/${spotlight.id}`}");
    expect(page).toContain("aria-label={`View ${spotlight.name}`}");
  });

  it("falls back to the brand panel when there is no product to show", () => {
    // Covers loading, offline, error and a genuinely empty catalogue without fabricating a product.
    expect(page).toContain("spotlight ? (");
    expect(page).toContain("<CampusWearMark");
    expect(page).toContain("Your Uniform. Your Identity.");
  });

  it("invents no statistics, addresses or pickup details", () => {
    expect(page).not.toMatch(/\b\d{2,3}\+?\s*(students|orders|vendors|products) served\b/i);
    expect(page).not.toMatch(/\d{1,4}\s+\w+\s+(Ave|Street|Road)/i);
    expect(page).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it("keeps the spotlight keyboard-focusable with a visible focus ring", () => {
    expect(page).toContain("focus-visible:ring-2 focus-visible:ring-campus-gold");
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
});
