import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260825079000_vendor_applications.sql"), "utf8");

describe("vendor application approval policy", () => {
  it("keeps submitted vendor requests pending and scopes applicant reads to their own records", () => {
    expect(migration).toContain("status public.vendor_application_status not null default 'pending'");
    expect(migration).toContain("applicant_user_id = (select auth.uid()) or private.is_platform_admin()");
    expect(migration).toContain("and status = 'pending'");
  });

  it("allows only ordinary student accounts to submit an application", () => {
    const hardening = readFileSync(resolve(process.cwd(), "supabase/migrations/20260825080000_vendor_application_submit_hardening.sql"), "utf8");
    expect(hardening).toContain("role = 'student'");
    expect(hardening).toContain("applicant_user_id = (select auth.uid())");
  });

  it("requires a platform administrator before creating a vendor, staff assignment, school membership, and vendor role", () => {
    expect(migration).toContain("not private.is_platform_admin()");
    expect(migration).toContain("insert into public.vendors");
    expect(migration).toContain("insert into public.vendor_staff");
    expect(migration).toContain("insert into public.school_memberships");
    expect(migration).toContain("role = 'vendor_staff'");
  });

  it("denies anonymous execution of state-changing approval functions", () => {
    expect(migration).toContain("revoke all on function public.approve_vendor_application(uuid) from public, anon");
    expect(migration).toContain("revoke all on function public.reject_vendor_application(uuid, text) from public, anon");
  });
});
