import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(new URL("../pages/Home.tsx", import.meta.url), "utf8");
const studentHome = readFileSync(new URL("../pages/StudentHome.tsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../pages/Auth.tsx", import.meta.url), "utf8");

describe("Pasted Content 11/12 public and student redesign", () => {
  it("keeps clear primary actions and real-workflow marketing routes", () => {
    expect(home).toContain('href="/shop"');
    expect(home).toContain('href="/vendor/apply"');
    expect(home).toContain("Live size-level availability");
    expect(home).toContain("Pickup-first, no online payment");
  });

  it("gives the student workspace direct catalog and order paths without a deferred store route", () => {
    expect(studentHome).toContain('href="/shop"');
    expect(studentHome).toContain('href="/orders"');
    expect(studentHome).toContain('href="/announcements"');
    expect(studentHome).not.toContain('href="/stores"');
  });

  it("keeps vendor applications distinct from ordinary account entry", () => {
    expect(auth).toContain("Vendor registration is a separate application and approval process.");
    expect(auth).toContain('href="/vendor/apply"');
    expect(auth).toContain("This does not grant vendor access automatically.");
  });
});
