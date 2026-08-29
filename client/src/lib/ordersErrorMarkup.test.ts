import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/Orders.tsx", import.meta.url), "utf8");

describe("student order history error markup", () => {
  it("shows an authenticated retry state instead of incorrectly prompting the user to sign in again", () => {
    expect(source).toContain('title="Orders could not be loaded"');
    expect(source).toContain('label: "Try again"');
    expect(source).not.toContain('title="Sign in to view orders"');
  });
});
