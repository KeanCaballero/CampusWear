import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/StudentHome.tsx", import.meta.url), "utf8");

describe("CampusWear student-home hero layering", () => {
  it("keeps decorative artwork behind the readable workspace content", () => {
    expect(page).toContain("relative isolate overflow-hidden");
    expect(page).toContain("pointer-events-none absolute -right-10 -top-16 z-0 hidden");
    expect(page).toContain("relative z-10 grid gap-7");
  });
});
