import { describe, expect, it } from "vitest";
import { canUseStudentWorkspace, canUseWorkspace, destinationForRole, isVendorApplicationPath, safeNextPath, withNextPath } from "./authRouting";

describe("CampusWear Supabase auth routing", () => {
  it("routes each assigned role to its authorized workspace", () => {
    expect(destinationForRole("student")).toBe("/student");
    expect(destinationForRole("vendor_staff")).toBe("/vendor");
    expect(destinationForRole("school_admin")).toBe("/admin");
    expect(destinationForRole("platform_admin")).toBe("/platform");
  });

  it("keeps profiles without an assignment out of student and staff workspaces", () => {
    expect(destinationForRole("pending_assignment")).toBe("/profile");
  });

  it("accepts only an internal protected-route return target", () => {
    expect(safeNextPath("?next=%2Forders")).toBe("/orders");
    expect(safeNextPath("?next=https%3A%2F%2Fevil.example")).toBeNull();
    expect(safeNextPath("?next=%2F%2Fevil.example")).toBeNull();
  });

  it("preserves the distinct vendor application journey without trusting external return URLs", () => {
    expect(isVendorApplicationPath("/vendor/apply")).toBe(true);
    expect(isVendorApplicationPath("/student")).toBe(false);
    expect(withNextPath("/auth/confirmed", "/vendor/apply")).toBe("/auth/confirmed?next=%2Fvendor%2Fapply");
    expect(withNextPath("/auth/confirmed", null)).toBe("/auth/confirmed");
  });

  it("keeps each authenticated operational role inside its assigned workspace", () => {
    expect(canUseStudentWorkspace("student")).toBe(true);
    expect(canUseStudentWorkspace("vendor_staff")).toBe(false);
    expect(canUseStudentWorkspace("school_admin")).toBe(false);
    expect(canUseStudentWorkspace("platform_admin")).toBe(false);
    expect(canUseWorkspace("vendor_staff", "vendor")).toBe(true);
    expect(canUseWorkspace("platform_admin", "vendor")).toBe(false);
    expect(canUseWorkspace("school_admin", "school")).toBe(true);
    expect(canUseWorkspace("vendor_staff", "school")).toBe(false);
    expect(canUseWorkspace("platform_admin", "platform")).toBe(true);
    expect(canUseWorkspace("student", "platform")).toBe(false);
  });
});
