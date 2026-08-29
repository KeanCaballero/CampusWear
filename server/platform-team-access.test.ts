import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260825083000_platform_team_access.sql"), "utf8");

describe("platform team access controls", () => {
  it("requires a confirmed ordinary account before granting an auditable individual platform role", () => {
    expect(migration).toContain("u.email_confirmed_at is not null");
    expect(migration).toContain("Only an ordinary student account can be granted platform team access.");
    expect(migration).toContain("values (target_id, 'granted', auth.uid())");
  });

  it("prevents self-revocation and protects the bootstrap owner", () => {
    expect(migration).toContain("You cannot revoke your own platform access.");
    expect(migration).toContain("The bootstrap owner cannot be revoked through team management.");
    expect(migration).toContain("values (p_user_id, 'revoked', auth.uid())");
  });

  it("denies anonymous access to every team-management RPC", () => {
    expect(migration).toContain("revoke all on function public.grant_platform_team_access(text) from public, anon");
    expect(migration).toContain("revoke all on function public.revoke_platform_team_access(uuid) from public, anon");
  });
});
