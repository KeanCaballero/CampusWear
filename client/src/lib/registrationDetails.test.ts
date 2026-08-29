import { describe, expect, it } from "vitest";
import { fullNameForProfile, signupDetailsSchema } from "./registrationDetails";

describe("signupDetailsSchema", () => {
  it("accepts a complete registration with matching passwords", () => {
    expect(signupDetailsSchema.safeParse({ firstName: "Kean", lastName: "Caballero", password: "CampusWear2026", passwordConfirmation: "CampusWear2026" }).success).toBe(true);
    expect(fullNameForProfile(" Kean ", " Caballero ")).toBe("Kean Caballero");
  });

  it("rejects missing names and mismatched confirmation", () => {
    const result = signupDetailsSchema.safeParse({ firstName: "", lastName: "", password: "CampusWear2026", passwordConfirmation: "different" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(issue => issue.message)).toContain("Passwords do not match.");
  });
});
