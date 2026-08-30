import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// BUG-016 follow-up. Migration 20260828050000 was never recorded as applied against the live
// project, so production kept list_platform_team_members WITHOUT the ::text cast its sibling
// list_platform_accounts already carries. This append-only migration closes that DRIFT.
//
// It is contract hygiene, not a proven outage fix: varchar -> text is binary coercible, so the
// live mismatch does not by itself establish a 42804 runtime failure.
const migration = readFileSync(
  new URL("../../../supabase/migrations/20260830120000_fix_platform_team_members_email_type.sql", import.meta.url),
  "utf8",
);

// The header comment explains the drift, so it legitimately names the sibling function and the
// unapplied migration. Every assertion about what the migration EXECUTES reads `sql`, never the
// raw file, so prose can never satisfy a behavioural check.
const sql = migration.replace(/^\s*--.*$/gm, "");

describe("assertions read executable SQL, not prose", () => {
  it("actually strips the comments", () => {
    expect(sql.length).toBeLessThan(migration.length);
    expect(sql).not.toContain("--");
  });

  it("discriminates: a name that appears ONLY in prose is absent from the executable SQL", () => {
    // If comment stripping ever broke, this pair fails and every "nothing unrelated" check below
    // becomes worthless.
    expect(migration).toContain("list_platform_accounts");
    expect(sql).not.toContain("list_platform_accounts");
  });
});

describe("the executable change is exactly the email cast", () => {
  it("adds u.email::text once", () => {
    expect(sql).toContain("u.email::text");
    expect(sql.match(/u\.email::text/g)).toHaveLength(1);
  });

  it("adds NO other cast — the only :: in the executable SQL is that one", () => {
    // profiles.updated_at is already timestamptz and full_name is already text, so the earlier
    // migration's p.updated_at::timestamptz was a no-op. It is deliberately not carried over.
    expect(sql.match(/::/g)).toHaveLength(1);
    expect(sql).toContain("p.updated_at");
    expect(sql).not.toContain("p.updated_at::");
    expect(sql).not.toContain("p.created_at::");
  });

  it("replaces exactly one function, the one it targets", () => {
    expect(sql.match(/create or replace function/g)).toHaveLength(1);
    expect(sql).toContain("create or replace function public.list_platform_team_members()");
  });
});

describe("the return contract is identical", () => {
  it("keeps the declared columns and their types", () => {
    expect(sql).toContain(
      "returns table (user_id uuid, email text, full_name text, is_bootstrap_owner boolean, granted_at timestamptz)",
    );
  });

  it("keeps all five selected columns in the same order, with the same ordering clause", () => {
    const body = sql.split("as $$")[1];
    const columns = ["p.user_id", "u.email::text", "p.full_name", "claimed_by", "p.updated_at"];
    let cursor = -1;
    for (const column of columns) {
      const at = body.indexOf(column);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
    expect(body).toContain("order by p.created_at");
  });

  it("keeps the same source relations and filter", () => {
    expect(sql).toContain("from public.profiles p");
    expect(sql).toContain("join auth.users u on u.id = p.user_id");
    expect(sql).toContain("where p.role = 'platform_admin'");
    expect(sql).toContain("private.bootstrap_admin_state");
  });
});

describe("the security boundary is preserved, not weakened", () => {
  it("keeps the platform-admin guard and its 42501 error code", () => {
    expect(sql).toContain("private.is_platform_admin()");
    expect(sql).toContain("auth.uid() is null");
    expect(sql).toContain("Platform administrator access is required.");
    expect(sql).toContain("errcode = '42501'");
  });

  it("keeps security definer and the same pinned search_path", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, private, auth, pg_temp");
    expect(sql).not.toMatch(/security\s+invoker/i);
  });

  it("leaves EXECUTE permissions exactly as they are", () => {
    expect(sql.match(/revoke all on function public\.list_platform_team_members\(\) from public, anon;/g)).toHaveLength(1);
    expect(sql.match(/grant execute on function public\.list_platform_team_members\(\) to authenticated;/g)).toHaveLength(1);
    // Exactly one grant, and it must not reach anon or public.
    expect(sql.match(/\bgrant\b/gi)).toHaveLength(1);
    expect(sql).not.toMatch(/grant\s+execute[^;]*to[^;]*\banon\b/i);
    expect(sql).not.toMatch(/grant\s+execute[^;]*to[^;]*\bpublic\s*;/i);
  });
});

describe("nothing unrelated is touched", () => {
  it("leaves the sibling RPC and every other function alone", () => {
    for (const other of ["list_platform_accounts", "create_order_from_cart", "transition_order_status", "get_public_catalog", "grant_platform_team_access", "revoke_platform_team_access"]) {
      expect(sql).not.toContain(other);
    }
  });

  it("changes no RLS policy, table, role or row", () => {
    for (const forbidden of [/create\s+policy/i, /drop\s+policy/i, /alter\s+policy/i, /alter\s+table/i, /row\s+level\s+security/i, /create\s+role/i, /alter\s+role/i]) {
      expect(sql).not.toMatch(forbidden);
    }
    for (const forbidden of [/\binsert\s+into\b/i, /\bupdate\s+public\./i, /\bdelete\s+from\b/i, /\bdrop\s+table\b/i, /\btruncate\b/i]) {
      expect(sql).not.toMatch(forbidden);
    }
  });

  it("is append-only: it replaces the function rather than dropping or altering it", () => {
    expect(sql).not.toMatch(/drop\s+function/i);
    expect(sql).not.toMatch(/alter\s+function/i);
  });
});
