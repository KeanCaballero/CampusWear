import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260825082000_platform_school_status.sql"), "utf8");

describe("platform school status RPC", () => {
  it("requires an authenticated platform administrator and changes only the existing school availability flag", () => {
    expect(migration).toContain("if auth.uid() is null");
    expect(migration).toContain("where user_id = auth.uid() and role = 'platform_admin'");
    expect(migration).toContain("set is_active = p_is_active");
    expect(migration).toContain("where id = p_school_id");
  });

  it("denies anonymous execution", () => {
    expect(migration).toContain("revoke all on function public.set_platform_school_active(uuid, boolean) from public, anon");
    expect(migration).toContain("grant execute on function public.set_platform_school_active(uuid, boolean) to authenticated");
  });
});
