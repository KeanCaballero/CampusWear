import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../components/campuswear/StudentShell.tsx", import.meta.url), "utf8");

describe("student shell navigation markup", () => {
  it("provides a keyboard skip link and keeps announcements reachable in the labelled mobile navigation", () => {
    expect(source).toContain('href="#campuswear-main"');
    expect(source).toContain('id="campuswear-main"');
    expect(source).toContain('{ label: "Updates", href: "/announcements", icon: Megaphone }');
    expect(source).toContain('aria-label="Student navigation"');
  });

  it("surfaces active state for the primary header shortcut links", () => {
    expect(source).toContain('aria-current={isCurrent("/cart") ? "page" : undefined}');
    expect(source).toContain('aria-current={isCurrent("/notifications") ? "page" : undefined}');
    expect(source).toContain('aria-current={isCurrent("/profile") ? "page" : undefined}');
  });

  it("uses the official high-contrast campus header without changing its accessible utility controls", () => {
    expect(source).toContain("bg-primary text-white");
    expect(source).toContain("<BrandMark light />");
    expect(source).toContain('aria-label="View cart"');
    expect(source).toContain('aria-label="View notifications"');
  });
});
