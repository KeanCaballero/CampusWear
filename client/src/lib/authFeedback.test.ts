import { describe, expect, it } from "vitest";
import { authFeedback } from "./authFeedback";

describe("CampusWear authentication feedback", () => {
  it("explains Supabase email rate limits without suggesting weaker verification", () => {
    expect(authFeedback("email rate limit exceeded")).toContain("custom SMTP");
    expect(authFeedback("email rate limit exceeded")).toContain("do not disable email confirmation");
  });

  it("gives a safe next step for custom SMTP confirmation failures", () => {
    expect(authFeedback("Error sending confirmation email")).toContain("saved transactional-email sender and SMTP configuration");
    expect(authFeedback("Error sending confirmation email")).toContain("Keep email confirmation and rate limits enabled");
  });

  it("preserves unrelated authentication errors", () => {
    expect(authFeedback("Invalid login credentials")).toBe("Invalid login credentials");
  });
});
