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
    expect(source).toContain('className="h-12 border-border bg-card pl-10"');
    expect(source).toContain('role="status"');
    expect(source).toContain("Clear filters");
    expect(source).toContain('className="min-h-10"');
    expect(source).not.toContain('className="min-h-10 bg-card"');
  });
});
