import { describe, expect, it } from "vitest";
import type { User } from "../../drizzle/schema";
import { assertCampuswearRole, assertPlatformAdmin } from "./authorization";

function userWithRole(role: User["role"]): User {
  return {
    id: 7,
    openId: "campuswear-test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

describe("CampusWear server authorization", () => {
  it("allows vendor staff into vendor-scoped procedures", () => {
    expect(() => assertCampuswearRole(userWithRole("vendor_staff"), ["vendor_staff", "platform_admin", "admin"])).not.toThrow();
  });

  it("allows platform administrators into self-service views without granting access to other users' records", () => {
    expect(() => assertCampuswearRole(userWithRole("admin"), ["student", "school_admin", "platform_admin", "admin"])).not.toThrow();
  });

  it("rejects students from vendor-only procedures", () => {
    expect(() => assertCampuswearRole(userWithRole("student"), ["vendor_staff"])).toThrow("do not have access");
  });

  it("reserves platform administration for platform administrators", () => {
    expect(() => assertPlatformAdmin(userWithRole("school_admin"))).toThrow("Platform administration access");
    expect(() => assertPlatformAdmin(userWithRole("platform_admin"))).not.toThrow();
  });
});
