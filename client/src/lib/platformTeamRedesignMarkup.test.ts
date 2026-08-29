import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/PlatformTeam.tsx", import.meta.url), "utf8");

describe("latest reference platform-team redesign", () => {
  it("uses consistent operations hierarchy while retaining individual-access guardrails", () => {
    expect(page).toContain("<PageIntro");
    expect(page).toContain("Grant platform access");
    expect(page).toContain("approved organization workflows");
    expect(page).toContain("member.isBootstrapOwner");
  });

  it("keeps the scoped data keys and access mutations", () => {
    expect(page).toContain("platformTeamQueryKey(user?.id)");
    expect(page).toContain("grantPlatformTeamAccess");
    expect(page).toContain("revokePlatformTeamAccess");
  });
});
