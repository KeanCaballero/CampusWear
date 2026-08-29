import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

// Regression guard for the transparent mobile workspace drawer.
//
// Two independent defects combined to let dashboard content read through the drawer:
//   1. the --sidebar design tokens were never defined, so `bg-sidebar` emitted no CSS, and
//      tailwind-merge dropped SheetContent's own `bg-background` in favour of that dead class
//   2. the Sidebar mobile branch hardcoded SheetContent's className, discarding the surface
//      classes DashboardLayout passes in
// These assertions are source-level, not rendered-DOM, so they pin the root cause rather than
// the symptom.
const stylesheet = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../components/ui/sidebar.tsx", import.meta.url), "utf8");

const sidebarSurface = /--sidebar:\s*([^;]+);/.exec(stylesheet)?.[1]?.trim();

describe("workspace navigation drawer surface tokens", () => {
  it("defines a --sidebar surface value", () => {
    expect(sidebarSurface).toBeTruthy();
  });

  it("keeps the drawer surface fully opaque", () => {
    expect(sidebarSurface).toMatch(/^#(?:[0-9a-f]{6}|[0-9a-f]{3})$/i);
    expect(sidebarSurface).not.toMatch(/transparent|rgba|\/\s*0?\.\d/i);
  });

  it("exposes the sidebar tokens to Tailwind so bg-sidebar actually emits a colour", () => {
    expect(stylesheet).toContain("--color-sidebar: var(--sidebar);");
    expect(stylesheet).toContain("--color-sidebar-foreground: var(--sidebar-foreground);");
    expect(stylesheet).toContain("--color-sidebar-border: var(--sidebar-border);");
  });
});

describe("mobile drawer composition", () => {
  it("merges the caller's surface classes into the drawer instead of discarding them", () => {
    const mobileBranch = sidebar.slice(sidebar.indexOf("if (isMobile)"), sidebar.indexOf("</Sheet>"));

    expect(mobileBranch).toContain("className={cn(");
    expect(mobileBranch).toContain("bg-sidebar text-sidebar-foreground");
    expect(mobileBranch).toMatch(/className=\{cn\(\s*"bg-sidebar[^"]*",\s*className\s*\)\}/);
  });

  it("forwards remaining props to the drawer surface rather than the dialog root", () => {
    const mobileBranch = sidebar.slice(sidebar.indexOf("if (isMobile)"), sidebar.indexOf("</Sheet>"));

    expect(mobileBranch).not.toContain("<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>");
    expect(mobileBranch).toContain("{...props}");
  });
});

// --- Why the token had to exist at all -------------------------------------------------------
// SheetContent ships its own `bg-background`. tailwind-merge classifies `bg-sidebar` as a
// background-colour utility, so it drops `bg-background` in favour of it. When `--sidebar` was
// undefined that left the drawer with NO background rule whatsoever. This exercises the real
// cn() from the codebase so the interaction is pinned, not assumed.
describe("class merging on the drawer surface", () => {
  it("drops SheetContent's own background in favour of the sidebar surface class", () => {
    const merged = cn("bg-background fixed z-50 flex flex-col", "bg-sidebar text-sidebar-foreground p-0");

    expect(merged).toContain("bg-sidebar");
    expect(merged).not.toContain("bg-background");
  });

  it("lets the caller's surface class win, which is what makes the merge fix meaningful", () => {
    const merged = cn("bg-sidebar text-sidebar-foreground p-0", "bg-primary text-white");

    expect(merged).toContain("bg-primary");
    expect(merged).not.toContain("bg-sidebar");
  });
});

// --- Every workspace shares this shell, so all three inherit the fix --------------------------
const workspaces = {
  vendor: readFileSync(new URL("../pages/vendor/VendorDashboard.tsx", import.meta.url), "utf8"),
  school: readFileSync(new URL("../pages/SchoolAdmin.tsx", import.meta.url), "utf8"),
  platform: readFileSync(new URL("../pages/PlatformAdmin.tsx", import.meta.url), "utf8"),
  platformAccounts: readFileSync(new URL("../pages/PlatformAccounts.tsx", import.meta.url), "utf8"),
  platformTeam: readFileSync(new URL("../pages/PlatformTeam.tsx", import.meta.url), "utf8"),
};

describe("workspace navigation across every role", () => {
  it.each(Object.entries(workspaces))("%s renders through the shared DashboardLayout shell", (_name, source) => {
    expect(source).toContain('import DashboardLayout from "@/components/DashboardLayout"');
    expect(source).toContain("<DashboardLayout");
    expect(source).toContain("items={");
  });

  it("keeps every vendor navigation destination", () => {
    const workspace = readFileSync(new URL("../pages/vendor/workspace.ts", import.meta.url), "utf8");

    for (const path of ["/vendor", "/vendor/orders", "/vendor/inventory", "/vendor/products", "/vendor/announcements", "/vendor/reports"]) {
      expect(workspace).toContain(`path: "${path}"`);
    }
  });

  it("keeps school-admin navigation intact", () => {
    expect(workspaces.school).toContain('path: "/admin"');
    expect(workspaces.school).toContain('workspaceLabel="School administration"');
  });

  it("keeps platform-admin navigation intact", () => {
    for (const path of ["/platform", "/platform/accounts", "/platform/team"]) {
      expect(workspaces.platform).toContain(`path: "${path}"`);
    }
    expect(workspaces.platform).toContain('workspaceLabel="Platform administration"');
  });

  it("does not leak the vendor-only fulfillment CTA into admin workspaces", () => {
    expect(workspaces.vendor).toContain("primaryAction={vendorPrimaryAction}");
    expect(workspaces.school).not.toContain("primaryAction");
    expect(workspaces.platform).not.toContain("primaryAction");
    expect(workspaces.platformAccounts).not.toContain("primaryAction");
    expect(workspaces.platformTeam).not.toContain("primaryAction");
  });
});

describe("desktop shell did not regress", () => {
  it("paints the sidebar the same navy the shell used before the token existed", () => {
    const primary = /^\s*--primary:\s*([^;]+);/m.exec(stylesheet)?.[1]?.trim();

    expect(sidebarSurface).toBe(primary);
  });

  it("keeps the desktop-only resize affordance out of the mobile drawer", () => {
    const layout = readFileSync(new URL("../components/DashboardLayout.tsx", import.meta.url), "utf8");

    expect(layout).toContain("cursor-col-resize");
    expect(layout).toMatch(/cursor-col-resize[^"]*md:block/);
  });
});

// --- Discovered while verifying the drawer visually (BUG-019) ---------------------------------
// Tailwind v4 emits utilities into @layer utilities. An UNLAYERED rule outranks every layered
// rule regardless of specificity, so a top-level `* { border-color: … }` silently defeated every
// border-<color> utility in the app — border-transparent, border-campus-gold, border-destructive/30.
// Measured in a real browser against the compiled stylesheet before the fix: every border-colour
// resolved to rgb(217, 226, 236). Keeping the reset layered is what makes intentional borders work.
describe("global border reset stays layered", () => {
  it("declares the border-colour reset inside @layer base", () => {
    expect(stylesheet).toMatch(/@layer base\s*\{[^}]*\*\s*\{[^}]*border-color:\s*var\(--border\)/);
  });

  it("does not reintroduce an unlayered universal border-colour reset", () => {
    const withoutLayerBlocks = stylesheet.replace(/@layer[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");

    expect(withoutLayerBlocks).not.toMatch(/^\s*\*\s*\{[^}]*border-color/m);
  });
});
