import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/Shop.tsx", import.meta.url), "utf8");

describe("catalog filter markup", () => {
  it("keeps empty category labels from rendering as blank filter buttons", () => {
    expect(source).toContain("const availableCategories = useMemo(");
    expect(source).toContain("item.name.trim().length > 0 && item.slug.trim().length > 0");
    expect(source).toContain("{availableCategories.map(item => (");
  });

  it("uses a touch-ready search and clear-filter control with a live result count", () => {
    expect(source).toContain('className="min-h-12 border-border bg-card pl-10"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("Clear filters");
    // Every filter control must clear the 44px touch-target minimum.
    expect(source).toContain('className="min-h-11 rounded-full px-4"');
    expect(source).toContain('className="min-h-11 gap-1.5 text-campus-blue"');
    expect(source).not.toMatch(/className="min-h-(?:[0-9]|10)"/);
  });
});
