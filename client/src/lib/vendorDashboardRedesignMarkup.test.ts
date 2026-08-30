import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(new URL("../pages/vendor/VendorDashboard.tsx", import.meta.url), "utf8");

describe("Pasted Content 11/12 vendor-dashboard redesign", () => {
  it("keeps operational priority cards and the real pickup location update workflow", () => {
    expect(dashboard).toContain("Pending orders");
    expect(dashboard).toContain("Low stock alerts");
    expect(dashboard).toContain("Ready for pickup");
    expect(dashboard).toContain("savePickupLocation.mutate(pickupDraft)");
    expect(dashboard).toContain("Vendor-managed");
  });

  it("uses the shared operational page framing and semantic visual system", () => {
    // The page framing moved into WorkspacePage, which renders the same PageIntro, and the panel
    // shells moved onto the shared campus-panel primitive via WorkspacePanel. The guarantee being
    // protected is that this page uses the SHARED framing rather than a hand-rolled one.
    expect(dashboard).toContain("<WorkspacePage");
    expect(dashboard).toContain("<WorkspacePanel");
    expect(dashboard).not.toContain("bg-[#dce9f8]");
  });

  it("keeps the priority tiles on their own shell, which campus-panel would break", () => {
    // campus-panel is unlayered, so it outranks Tailwind utilities and would discard both the
    // destructive emphasis border and the hover shadow on these four navigation tiles.
    expect(dashboard).toContain("border-destructive/30");
    expect(dashboard).toContain("hover:shadow-[0_4px_12px_rgb(15_39_71/0.08)]");
  });

  it("still gives those tiles the shared radius token, so the page has one radius", () => {
    // Before Phase 1 all six panels on this page were rounded-xl. The tiles were never
    // distinguished by radius, so leaving them at 12px while siblings moved to the 14px token
    // would be an inconsistency introduced by the refactor, not a preserved intent.
    expect(dashboard).toContain("rounded-[var(--radius)]");
    expect(dashboard).not.toMatch(/group rounded-xl border bg-card/);
  });
});
