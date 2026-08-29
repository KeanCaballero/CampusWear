import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/Notifications.tsx", import.meta.url), "utf8");

describe("notification center error markup", () => {
  it("uses a contextual retry state instead of incorrectly asking an already authenticated user to sign in", () => {
    expect(source).toContain('title="Notifications could not be loaded"');
    expect(source).toContain('label: "Try again"');
    expect(source).not.toContain('title="Sign in to see updates"');
  });
});
