import { readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression cover for "Read" failing with "We could not mark that notification as read."
 *
 * THE ROOT CAUSE WAS NOT IN THIS FILE'S REACH. public.notifications carried a correct RLS policy
 * ("users mark own notifications read", USING and WITH CHECK on recipient_user_id = auth.uid())
 * but authenticated held only SELECT on the table — no UPDATE grant, at table or column level.
 * A policy filters the rows a privilege may touch; it does not confer the privilege. Postgres
 * therefore rejected the statement with 42501 before any policy ran, and that raw PostgREST object
 * is not a UserFacingError, so the page fell through to its generic message.
 *
 * Every existing notification test mocks the Supabase client, which is exactly why none of them
 * caught it — a mock has no grants. So the behavioural suite below pins the CLIENT contract (which
 * was already correct and must stay correct), and the migration suite pins the actual fix.
 */

const harness = vi.hoisted(() => {
  const scenario = {
    /** Rows the UPDATE reports as changed. Empty models a filtered or already-read write. */
    updatedRows: [{ id: "n1" }] as Array<{ id: string }>,
    updateError: null as { code?: string; message: string } | null,
    /** The row as a follow-up SELECT sees it. null models "not visible to this user". */
    existingRow: { read_at: null } as { read_at: string | null } | null,
    lookupError: null as { message: string } | null,
    calls: [] as Array<{ op: string; payload?: unknown; filters: string[] }>,
  };

  function builder() {
    const state: any = { op: "select", filters: [] as string[] };
    const settle = () => {
      scenario.calls.push({ op: state.op, payload: state.payload, filters: state.filters });
      if (state.op === "update") return { data: scenario.updateError ? null : scenario.updatedRows, error: scenario.updateError };
      return { data: scenario.existingRow, error: scenario.lookupError };
    };
    const b: any = {
      select: () => b,
      update: (payload: unknown) => { state.op = "update"; state.payload = payload; return b; },
      eq: (col: string) => { state.filters.push(`eq:${col}`); return b; },
      is: (col: string, val: unknown) => { state.filters.push(`is:${col}=${String(val)}`); return b; },
      maybeSingle: () => Promise.resolve(settle()),
      then: (ok: any, err: any) => Promise.resolve(settle()).then(ok, err),
    };
    return b;
  }

  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } }, error: null }) },
    from: () => builder(),
  };
  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: harness.client, isSupabaseConfigured: true }));

const { markNotificationRead, UserFacingError } = await import("./supabaseCatalog");

beforeEach(() => {
  harness.scenario.updatedRows = [{ id: "n1" }];
  harness.scenario.updateError = null;
  harness.scenario.existingRow = { read_at: null };
  harness.scenario.lookupError = null;
  harness.scenario.calls = [];
});

describe("1–2. an unread notification becomes read", () => {
  it("1. resolves when the row is updated", async () => {
    await expect(markNotificationRead("n1")).resolves.toBeUndefined();
  });

  it("2. asks for a representation, so the affected row is knowable", async () => {
    await markNotificationRead("n1");
    const write = harness.scenario.calls.find(c => c.op === "update");
    expect(write).toBeDefined();
    expect(write?.payload).toMatchObject({ read_at: expect.any(String) });
  });

  it("stamps read_at with a real timestamp, not a placeholder", async () => {
    await markNotificationRead("n1");
    const write = harness.scenario.calls.find(c => c.op === "update");
    const stamped = (write?.payload as { read_at: string }).read_at;
    expect(Number.isNaN(Date.parse(stamped))).toBe(false);
  });

  it("targets one notification and only the unread state of it", async () => {
    await markNotificationRead("n1");
    const write = harness.scenario.calls.find(c => c.op === "update");
    expect(write?.filters).toContain("eq:id");
    expect(write?.filters).toContain("is:read_at=null");
  });
});

describe("3–5. zero rows is never reported as success blindly", () => {
  it("3. a filtered write on a row the user cannot see is a failure", async () => {
    harness.scenario.updatedRows = [];
    harness.scenario.existingRow = null;
    await expect(markNotificationRead("n1")).rejects.toBeInstanceOf(UserFacingError);
    await expect(markNotificationRead("n1")).rejects.toThrow(/no longer available/i);
  });

  it("4. an already-read notification resolves quietly rather than erroring", async () => {
    // Another tab, or a double click. Nothing changed, but nothing is wrong either.
    harness.scenario.updatedRows = [];
    harness.scenario.existingRow = { read_at: "2026-08-31T09:00:00Z" };
    await expect(markNotificationRead("n1")).resolves.toBeUndefined();
  });

  it("5. distinguishes the two zero-row cases by looking the row up", async () => {
    harness.scenario.updatedRows = [];
    harness.scenario.existingRow = { read_at: "2026-08-31T09:00:00Z" };
    await markNotificationRead("n1");
    expect(harness.scenario.calls.filter(c => c.op === "select")).toHaveLength(1);
  });
});

describe("6. unexpected database errors stay generic", () => {
  it("propagates the raw 42501 rather than mislabelling it as a user-facing message", async () => {
    // This is precisely what production was throwing while the GRANT was missing.
    harness.scenario.updateError = { code: "42501", message: "permission denied for table notifications" };
    const caught = await markNotificationRead("n1").catch(e => e);
    expect(caught).not.toBeInstanceOf(UserFacingError);
    expect(caught).toMatchObject({ code: "42501" });
  });

  it("does not leak raw Postgres text as if it were written for a student", async () => {
    harness.scenario.updateError = { code: "42501", message: "permission denied for table notifications" };
    const caught = await markNotificationRead("n1").catch(e => e);
    // The page renders `message` only for UserFacingError, so a non-instance means safe copy.
    expect(caught instanceof UserFacingError).toBe(false);
  });

  it("surfaces a failed lookup instead of silently succeeding", async () => {
    harness.scenario.updatedRows = [];
    harness.scenario.lookupError = { message: "connection reset" };
    await expect(markNotificationRead("n1")).rejects.toBeTruthy();
  });
});

describe("7–8. the page keeps per-row pending state", () => {
  const page = readFileSync(new URL("../pages/Notifications.tsx", import.meta.url), "utf8");

  it("7. only the clicked row shows progress and is disabled", () => {
    expect(page).toContain("markRead.isPending && markRead.variables === alert.id");
  });

  it("8. the disabled state is bound to that row's id, never to the mutation alone", () => {
    expect(page).not.toMatch(/disabled=\{markRead\.isPending\}/);
  });

  it("renders safe copy for a user-facing error and generic copy otherwise", () => {
    expect(page).toContain("error instanceof UserFacingError ? error.message");
    expect(page).toContain("We could not mark that notification as read.");
  });
});

describe("9–10. the badge follows the shared query", () => {
  const page = readFileSync(new URL("../pages/Notifications.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/campuswear/StudentShell.tsx", import.meta.url), "utf8");

  it("9. a successful read invalidates the key the badge reads from", () => {
    expect(page).toContain("queryClient.invalidateQueries({ queryKey })");
    expect(page).toContain("notificationsQueryKey(user?.id)");
    expect(shell).toContain("notificationsQueryKey(user?.id)");
  });

  it("10. the badge is derived from the list, so it empties when the last unread is read", () => {
    expect(shell).toContain("unreadNotificationCount(notifications.data)");
    expect(shell).toContain("notificationBadgeText(unreadCount)");
  });
});

describe("the migration grants the privilege the policy was relying on", () => {
  const dir = new URL("../../../supabase/migrations/", import.meta.url);
  const filename = "20260831140000_grant_notification_read_privilege.sql";
  const sql = readFileSync(new URL(filename, dir), "utf8").replace(/^\s*--.*$/gm, "");

  it("is appended, not an edit of existing history", () => {
    const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
    expect(files).toContain(filename);
    expect(files.indexOf(filename)).toBeGreaterThan(files.indexOf("20260831060000_restore_inventory_on_terminal_orders.sql"));
  });

  it("grants UPDATE to authenticated on notifications", () => {
    expect(sql).toMatch(/grant\s+update[\s\S]*on\s+public\.notifications\s+to\s+authenticated/i);
  });

  it("grants only read_at, so a student cannot rewrite a notification's contents", () => {
    expect(sql).toMatch(/grant\s+update\s*\(\s*read_at\s*\)/i);
    for (const column of ["title", "body", "recipient_user_id", "type", "order_id", "school_id"]) {
      expect(sql).not.toMatch(new RegExp(`grant[\\s\\S]*\\(${column}\\)`, "i"));
    }
  });

  it("changes no policy and no schema", () => {
    expect(sql).not.toMatch(/create policy|alter policy|drop policy/i);
    expect(sql).not.toMatch(/alter table|create table|drop table/i);
    expect(sql).not.toMatch(/row level security/i);
  });

  it("grants nothing to anon and revokes nothing", () => {
    expect(sql).not.toMatch(/to\s+anon/i);
    expect(sql).not.toMatch(/\brevoke\b/i);
  });

  it("touches no other table", () => {
    const grants = sql.match(/on\s+public\.\w+/gi) ?? [];
    expect(new Set(grants.map(g => g.toLowerCase().replace(/\s+/g, " ")))).toEqual(new Set(["on public.notifications"]));
  });
});
