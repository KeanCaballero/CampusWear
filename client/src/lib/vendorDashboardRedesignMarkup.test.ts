import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(new URL("../pages/vendor/VendorDashboard.tsx", import.meta.url), "utf8");

describe("Pasted Content 11/12 vendor-dashboard redesign", () => {
  it("keeps operational priority cards and the real pickup location update workflow", () => {
    expect(dashboard).toContain("Orders needing action");
    expect(dashboard).toContain("Low or out of stock");
    expect(dashboard).toContain("savePickupLocation.mutate(pickupDraft)");
    expect(dashboard).toContain("Vendor-managed");
  });

  it("uses the shared operational page framing and semantic visual system", () => {
    expect(dashboard).toContain("<PageIntro");
    expect(dashboard).toContain("campus-panel campus-panel-interactive");
    expect(dashboard).not.toContain("bg-[#dce9f8]");
  });
});
