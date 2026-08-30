import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

// These files carry doc comments that legitimately quote the OLD hand-rolled class names they
// replace. Assertions about what a component RENDERS must read stripped code, never the prose.
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const panelRaw = read("../components/campuswear/WorkspacePanel.tsx");
const panel = stripComments(panelRaw);
const metric = stripComments(read("../components/campuswear/MetricCard.tsx"));
const page = stripComments(read("../components/campuswear/WorkspacePage.tsx"));

const VENDOR_PAGES = ["VendorDashboard", "VendorProducts", "VendorInventory", "VendorOrders", "VendorReports", "VendorAnnouncements"] as const;
const vendorSource = Object.fromEntries(VENDOR_PAGES.map(name => [name, read(`../pages/vendor/${name}.tsx`)])) as Record<
  (typeof VENDOR_PAGES)[number],
  string
>;

describe("WorkspacePanel wraps the existing campus-panel primitive", () => {
  it("uses campus-panel rather than inventing a shell", () => {
    expect(panel).toContain('"campus-panel"');
    expect(panel).toContain("campus-panel-interactive");
  });

  it("introduces no radius, colour, or border of its own", () => {
    // The whole point is that vendor stops hand-rolling a shell. If these appear, the abstraction
    // has grown a competing design language.
    expect(panel).not.toMatch(/rounded-(sm|md|lg|xl|2xl|3xl|full)/);
    expect(panel).not.toMatch(/border-border|bg-card|shadow-\[/);
    expect(panel).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("exposes only padding variants that are actually used", () => {
    for (const variant of ["none", "compact", "default", "comfortable", "spacious"]) {
      expect(panel).toContain(`${variant}:`);
    }
  });

  it("documents why callers cannot override the shell with Tailwind", () => {
    // campus-panel is unlayered, so it outranks layered utilities. Losing this note invites a
    // silent regression the next time someone adds hover:shadow-* to a panel. This one assertion
    // is ABOUT the documentation, so it reads the raw file rather than the stripped source.
    expect(panelRaw).toContain("UNLAYERED");
  });
});

describe("MetricCard consolidates the duplicated Reports tiles", () => {
  it("renders through WorkspacePanel rather than its own shell", () => {
    expect(metric).toContain("WorkspacePanel");
    expect(metric).not.toMatch(/rounded-(xl|2xl)|border-border|bg-card/);
  });

  it("preserves the existing Reports tile presentation exactly", () => {
    expect(metric).toContain("text-2xl font-extrabold tracking-[-0.05em]");
    expect(metric).toContain("mt-1 text-sm font-semibold text-muted-foreground");
  });

  it("computes nothing and invents no metric", () => {
    // Note: .filter(Boolean) on class names is plumbing, not computation — these target DATA.
    for (const forbidden of [/useQuery/, /\.reduce\(/, /data\?\./, /\.length \?\?/]) {
      expect(metric).not.toMatch(forbidden);
    }
  });

  it("is actually adopted by Reports for all three tiles", () => {
    expect(vendorSource.VendorReports.match(/<MetricCard/g)).toHaveLength(3);
    expect(vendorSource.VendorReports).toContain('tone="primary"');
    expect(vendorSource.VendorReports).toContain('tone="warning"');
  });
});

describe("WorkspacePage centralises the container and header", () => {
  it("renders the existing PageIntro rather than a new header", () => {
    expect(page).toContain('from "./PageIntro"');
    expect(page).toContain("<PageIntro");
    expect(page).not.toContain("<h1");
  });

  it("defines exactly the two agreed container widths", () => {
    expect(page).toContain('wide: "max-w-7xl"');
    expect(page).toContain('narrow: "max-w-3xl"');
    expect(page).not.toContain("max-w-6xl");
    expect(page).not.toContain("max-w-[1280px]");
  });

  it("hides no page-specific logic", () => {
    for (const forbidden of [/useQuery/, /useAuth/, /isStalledWithoutData/, /DashboardLayout/, /WorkspaceGate/]) {
      expect(page).not.toMatch(forbidden);
    }
  });
});

describe("every vendor page uses the shared page shell", () => {
  it("routes all six pages through WorkspacePage", () => {
    for (const name of VENDOR_PAGES) {
      expect(vendorSource[name]).toContain("<WorkspacePage");
    }
  });

  it("applies the agreed container strategy: five wide, Announcements narrow", () => {
    expect(vendorSource.VendorAnnouncements).toContain('width="narrow"');
    for (const name of ["VendorDashboard", "VendorProducts", "VendorInventory", "VendorOrders", "VendorReports"] as const) {
      expect(vendorSource[name]).not.toContain('width="narrow"');
    }
  });

  it("leaves no page picking its own container width", () => {
    for (const name of VENDOR_PAGES) {
      expect(vendorSource[name]).not.toMatch(/mx-auto max-w-/);
    }
  });

  it("leaves no page hand-rolling a page title", () => {
    for (const name of VENDOR_PAGES) {
      expect(vendorSource[name]).not.toContain('<h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">');
    }
  });
});

describe("vendor panel shells are standardised", () => {
  it("removes the hand-rolled shell everywhere it was safe to convert", () => {
    for (const name of ["VendorProducts", "VendorInventory", "VendorOrders", "VendorReports", "VendorAnnouncements"] as const) {
      expect(vendorSource[name]).not.toContain("rounded-xl border border-border bg-card");
      expect(vendorSource[name]).not.toContain("rounded-2xl border border-border bg-card");
    }
  });

  it("keeps the two elements that campus-panel would visibly break", () => {
    // Dashboard's priority tiles need a destructive border AND a hover shadow; Inventory's second
    // summary tile is deliberately gold-tinted. campus-panel is unlayered and would discard all of
    // those. Converting them is a Phase 2 decision, not a foundation change.
    expect(vendorSource.VendorDashboard).toContain("border-destructive/30");
    expect(vendorSource.VendorInventory).toContain("border-campus-gold/40 bg-campus-gold/10");
  });

  it("keeps the Inventory stock-ledger eyebrow, which labels a section rather than the page", () => {
    expect(vendorSource.VendorInventory).toContain("campus-eyebrow");
    expect(vendorSource.VendorInventory).toContain("STOCK LEDGER");
  });
});

describe("brand regression — the vendor workspace carries no competing mark", () => {
  it("uses no graduation-cap icon anywhere in the vendor workspace", () => {
    for (const name of VENDOR_PAGES) {
      expect(vendorSource[name]).not.toContain("GraduationCap");
    }
    for (const shared of [panel, metric, page]) {
      expect(shared).not.toContain("GraduationCap");
    }
  });

  it("introduces no alternate CampusWear mark in the shared primitives", () => {
    for (const shared of [panel, metric, page]) {
      expect(shared).not.toMatch(/BrandMark|CampusWearMark|<svg/);
    }
  });

  it("leaves vendor branding owned solely by DashboardLayout", () => {
    const layout = read("../components/DashboardLayout.tsx");
    expect(layout).toContain("BrandMark");
    // Desktop expanded, desktop collapsed, and the signed-out gate all render the official mark.
    expect(layout.match(/<BrandMark/g)?.length).toBe(3);
    for (const name of VENDOR_PAGES) {
      expect(vendorSource[name]).not.toContain("BrandMark");
    }
  });
});
