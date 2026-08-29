import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260828050000_fix_platform_rpc_email_type.sql", import.meta.url),
  "utf8",
);

describe("platform RPC email return-type repair", () => {
  it("casts auth email to text in both platform-only functions", () => {
    expect(migration).toContain("u.email::text");
    expect(migration.match(/u\.email::text/g)).toHaveLength(2);
  });

  it("retains the timestamp casts and platform authorization boundaries", () => {
    expect(migration).toContain("p.created_at::timestamptz");
    expect(migration).toContain("p.updated_at::timestamptz");
    expect(migration.match(/private\.is_platform_admin\(\)/g)).toHaveLength(2);
    expect(migration.match(/security definer/g)).toHaveLength(2);
    expect(migration).toContain("revoke all on function public.list_platform_accounts(text) from public, anon;");
    expect(migration).toContain("revoke all on function public.list_platform_team_members() from public, anon;");
    expect(migration).toContain("grant execute on function public.list_platform_accounts(text) to authenticated;");
    expect(migration).toContain("grant execute on function public.list_platform_team_members() to authenticated;");
  });
});
