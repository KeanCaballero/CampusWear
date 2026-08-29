import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/StudentHome.tsx", import.meta.url), "utf8");

describe("CampusWear student-home hero layering", () => {
  it("keeps decorative artwork behind the readable workspace content", () => {
    expect(page).toContain("relative isolate overflow-hidden");
    expect(page).toContain('className="relative z-10"');

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
