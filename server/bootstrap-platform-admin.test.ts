import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260825077000_bootstrap_platform_admin.sql"), "utf8");

describe("one-time bootstrap platform administrator policy", () => {
  it("binds automatic privilege to the configured owner email and defaults every other sign-up to student", () => {
    expect(migration).toContain("'keancaballero147@gmail.com'");
    expect(migration).toContain("assigned_role public.app_role := 'student'");
    expect(migration).toContain("assigned_role := 'platform_admin'");
    expect(migration).toContain("lower(coalesce(new.email, '')) = lower(configured_email)");
  });

  it("serializes the one-time claim and keeps bootstrap state inaccessible to browser roles", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("where singleton = true and claimed_by is null");
    expect(migration).toContain("revoke all on table private.bootstrap_admin_state from public, anon, authenticated");
  });
});
