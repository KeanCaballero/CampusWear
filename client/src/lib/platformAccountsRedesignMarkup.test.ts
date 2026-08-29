import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/PlatformAccounts.tsx", import.meta.url), "utf8");

describe("Pasted Content 11/12 platform accounts redesign", () => {
  it("retains controlled role actions and bootstrap-owner protection", () => {
    expect(page).toContain("account.isBootstrapOwner");
    expect(page).toContain("Make platform admin");
    expect(page).toContain("Restore student");
    expect(page).toContain("approved vendor application");
  });

  it("uses the shared accessible page framing and search control", () => {
    expect(page).toContain("<PageIntro");
    expect(page).toContain('htmlFor="platform-account-search"');
    expect(page).toContain("campus-panel mt-7");
  });
});
