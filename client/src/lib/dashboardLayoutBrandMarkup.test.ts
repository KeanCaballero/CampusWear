import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardLayout = readFileSync(new URL("../components/DashboardLayout.tsx", import.meta.url), "utf8");

describe("reference-inspired CampusWear operations shell", () => {
  it("uses an official navy shell while retaining named accessible navigation semantics", () => {
    expect(dashboardLayout).toContain("bg-primary text-white");
    expect(dashboardLayout).toContain("<BrandMark light />");
    expect(dashboardLayout).toContain('aria-current={active ? "page" : undefined}');
    expect(dashboardLayout).toContain("navigation");
  });
});
