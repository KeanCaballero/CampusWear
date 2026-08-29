import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const brandMark = readFileSync(new URL("../components/campuswear/BrandMark.tsx", import.meta.url), "utf8");

describe("CampusWear brand mark", () => {
  it("keeps an accessible home route, official-campus icon, and current approved tagline", () => {
    expect(brandMark).toContain('href="/"');
    expect(brandMark).toContain('aria-label="CampusWear home"');
    expect(brandMark).toContain("Landmark");
    expect(brandMark).toContain("YOUR UNIFORM. YOUR IDENTITY.");
  });
});
