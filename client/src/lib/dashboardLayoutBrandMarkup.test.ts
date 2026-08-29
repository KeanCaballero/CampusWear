import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardLayout = readFileSync(new URL("../components/DashboardLayout.tsx", import.meta.url), "utf8");

describe("reference-inspired CampusWear operations shell", () => {
  it("uses an official navy shell while retaining named accessible navigation semantics", () => {
    expect(dashboardLayout).toContain("bg-sidebar text-sidebar-foreground");
    expect(dashboardLayout).toContain("<BrandMark light />");
    expect(dashboardLayout).toContain('aria-current={active ? "page" : undefined}');
    expect(dashboardLayout).toContain("navigation");
  });
});

describe("collapsed sidebar keeps the CampusWear mark visible", () => {
  it("swaps the full lockup for the compact one in icon mode", () => {
    expect(dashboardLayout).toContain('group-data-[collapsible=icon]:hidden"><BrandMark light /></div>');
    expect(dashboardLayout).toContain('hidden group-data-[collapsible=icon]:block"><BrandMark light compact /></div>');
  });

  it("reuses the existing compact API rather than a second logo implementation", () => {
    expect(dashboardLayout).toContain("<BrandMark light compact />");
    expect(dashboardLayout).not.toContain("CampusWearMark");
    expect((dashboardLayout.match(/<BrandMark/g) ?? []).length).toBe(3);
  });

  it("stacks and centres the collapsed header so the mark is not clipped", () => {
    expect(dashboardLayout).toContain("group-data-[collapsible=icon]:flex-col");
    expect(dashboardLayout).toContain("group-data-[collapsible=icon]:justify-center");
    // narrower gutter in the 48px icon rail
    expect(dashboardLayout).toContain("group-data-[collapsible=icon]:px-1");
  });

  it("leaves the expanded lockup and the workspace label untouched", () => {
    expect(dashboardLayout).toContain('<BrandMark light />');
    expect(dashboardLayout).toContain('group-data-[collapsible=icon]:hidden">{workspaceLabel}</p>');
  });
});
