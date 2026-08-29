import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260825084000_platform_account_directory.sql"), "utf8");

describe("platform account directory controls", () => {
  it("exposes only a bounded, platform-admin-only account directory", () => {
    expect(migration).toContain("not private.is_platform_admin()");
    expect(migration).toContain("limit 100");
    expect(migration).toContain("u.email_confirmed_at is not null");
  });

  it("denies anonymous execution of the account directory RPC", () => {
    expect(migration).toContain("revoke all on function public.list_platform_accounts(text) from public, anon");
    expect(migration).toContain("grant execute on function public.list_platform_accounts(text) to authenticated");
  });
});
