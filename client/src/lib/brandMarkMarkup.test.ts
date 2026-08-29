import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const brandMark = readFileSync(new URL("../components/campuswear/BrandMark.tsx", import.meta.url), "utf8");

describe("CampusWear brand mark", () => {
  it("keeps an accessible home route and the approved tagline", () => {
    expect(brandMark).toContain('href="/"');
    expect(brandMark).toContain('aria-label="CampusWear home"');
    // Rendered uppercase via CSS, so assert the words and the transform rather than literal caps.
    expect(brandMark).toMatch(/Your Uniform\. Your Identity\./i);
    expect(brandMark).toContain("uppercase");
  });

  it("uses the official polo mark from the supplied logo system, not a stand-in icon", () => {
    // Body outline + collar knockout, verbatim from the 64x64 artboard.
    expect(brandMark).toContain('viewBox="0 0 64 64"');
    expect(brandMark).toContain("M17.5 15.8L24.5 13L26.8 10.8L32 12.9");
    expect(brandMark).toContain("M22.8 15.4L32 27.2L41.2 15.4");
    expect(brandMark).not.toContain("lucide-react");
  });

  it("paints the mark in the CampusWear palette with the gold buttons", () => {
    expect(brandMark).toContain("#0F2747");
    expect(brandMark).toContain("#2563EB");
    expect(brandMark).toContain("#F4B942");
    expect(brandMark).toMatch(/<circle[^>]*fill=\{GOLD\}/);
  });

  it("ships all three approved lockups from the logo system", () => {
    expect(brandMark).toContain('"color" | "reversed" | "mono"');
    // reversed: white body for dark surfaces, accents kept
    expect(brandMark).toContain('variant === "reversed" ? "#FFFFFF"');
    // mono: inherits colour, no accents
    expect(brandMark).toContain('"mono" ? "currentColor"');
    expect(brandMark).toContain('{variant !== "mono" && (');
    // the blue placket belongs to the full-colour lockup only
    expect(brandMark).toContain('{variant === "color" && <path');
  });

  it("selects the reversed lockup on dark surfaces and colour on light ones", () => {
    expect(brandMark).toContain('variant={light ? "reversed" : "color"}');
  });

  it("keeps the component API every call site depends on", () => {
    expect(brandMark).toContain("compact = false");
    expect(brandMark).toContain("light = false");
  });

  it("labels the mark for assistive technology", () => {
    expect(brandMark).toContain('role="img"');
    // labelled via the `title` prop, defaulting to the brand name
    expect(brandMark).toContain("aria-label={title}");
    expect(brandMark).toContain('title = "CampusWear"');
    expect(brandMark).toContain('aria-label="CampusWear home"');
  });
});
