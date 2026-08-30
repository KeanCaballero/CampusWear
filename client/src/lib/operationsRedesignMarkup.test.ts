import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const products = readFileSync(new URL("../pages/vendor/VendorProducts.tsx", import.meta.url), "utf8");
const platform = readFileSync(new URL("../pages/PlatformAdmin.tsx", import.meta.url), "utf8");
const school = readFileSync(new URL("../pages/SchoolAdmin.tsx", import.meta.url), "utf8");

describe("Pasted Content 11/12 operational redesign", () => {
  it("keeps vendor product inventory and photo workflows in the redesigned catalog", () => {
    expect(products).toContain("ProductPhotoAdjuster");
    expect(products).toContain("Sizes, SKU, and stock");
    expect(products).toContain("Available now");
    // The catalog panels now use the shared WorkspacePanel/campus-panel shell instead of a
    // hand-rolled one. The workflows asserted above are what this test protects.
    expect(products).toContain("<WorkspacePanel");
  });

  it("keeps controlled platform approval and school availability operations visible", () => {
    expect(platform).toContain("approve.mutate(application.id)");
    expect(platform).toContain("setSchoolStatus.mutate");
    expect(platform).toContain("Vendor applications");
  });

  it("keeps school vendor authorization and announcement publication actions intact", () => {
    expect(school).toContain("authorization.mutate");
    expect(school).toContain("publish.mutate");
    expect(school).toContain("School announcement");
  });
});
