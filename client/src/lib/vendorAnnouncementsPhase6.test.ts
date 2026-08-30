import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Behavioural coverage for the vendor announcement workspace.
//
// The table grants INSERT, SELECT and UPDATE to `authenticated` and has NO delete policy, so
// withdrawal is an UPDATE of is_active. A filtered UPDATE returns 200 with an empty array rather
// than an error, so every write here asks for a representation and treats zero rows as a refusal.
const harness = vi.hoisted(() => {
  const scenario = {
    rows: [] as Array<Record<string, unknown>>,
    selectError: null as { message: string; code?: string } | null,
    writeError: null as { message: string; code?: string } | null,
    writtenRows: [] as Array<{ id: string }>,
    calls: [] as Array<{ table: string; op: string; payload?: unknown; selected?: string; eq?: Array<[string, unknown]> }>,
  };

  function tableBuilder(table: string) {
    const state = { op: "select", payload: undefined as unknown, eq: [] as Array<[string, unknown]>, selected: undefined as string | undefined };
    const settle = () =>
      state.op === "select"
        ? { data: scenario.rows, error: scenario.selectError }
        : { data: scenario.writtenRows, error: scenario.writeError };

    const builder: any = {
      select: (cols: string) => { state.selected = cols; return builder; },
      insert: (payload: unknown) => { state.op = "insert"; state.payload = payload; scenario.calls.push({ table, op: "insert", payload }); return builder; },
      update: (payload: unknown) => { state.op = "update"; state.payload = payload; return builder; },
      eq: (col: string, val: unknown) => { state.eq.push([col, val]); return builder; },
      order: () => builder,
      maybeSingle: () => Promise.resolve(settle()),
      then: (ok: any, err: any) => {
        if (state.op !== "insert") scenario.calls.push({ table, op: state.op, payload: state.payload, selected: state.selected, eq: state.eq });
        return Promise.resolve(settle()).then(ok, err);
      },
    };
    return builder;
  }

  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "staff-1" } }, error: null }) },
    from: (table: string) => {
      // vendorContext() resolves vendor_staff with maybeSingle() and vendors with single().
      if (table === "vendor_staff") {
        const b: any = { select: () => b, eq: () => b, maybeSingle: () => Promise.resolve({ data: { vendor_id: "vendor-1" }, error: null }), single: () => Promise.resolve({ data: { vendor_id: "vendor-1" }, error: null }) };
        return b;
      }
      if (table === "vendors") {
        const b: any = { select: () => b, eq: () => b, single: () => Promise.resolve({ data: { school_id: "school-1" }, error: null }), maybeSingle: () => Promise.resolve({ data: { school_id: "school-1" }, error: null }) };
        return b;
      }
      return tableBuilder(table);
    },
  };

  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: harness.client, isSupabaseConfigured: true }));

const {
  listVendorAnnouncements,
  updateVendorAnnouncement,
  deactivateVendorAnnouncement,
  publishVendorAnnouncement,
  VendorFacingError,
} = await import("@/lib/supabaseCatalog");

const page = (() => {
  const raw = readFileSync(new URL("../pages/vendor/VendorAnnouncements.tsx", import.meta.url), "utf8");
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
})();

const capture = async (promise: Promise<unknown>) => {
  try { await promise; } catch (error) { return error; }
  throw new Error("expected a rejection, but it resolved");
};

beforeEach(() => {
  harness.scenario.rows = [];
  harness.scenario.selectError = null;
  harness.scenario.writeError = null;
  harness.scenario.writtenRows = [];
  harness.scenario.calls = [];
});

// 1 + 13
describe("1/13. the vendor list is honest about what RLS exposes", () => {
  it("maps the real columns", async () => {
    harness.scenario.rows = [{ id: "a1", title: "Restock", body: "PE uniforms are back", created_at: "2026-08-30T01:00:00Z", updated_at: "2026-08-30T01:00:00Z" }];
    const result = await listVendorAnnouncements();
    expect(result).toEqual([{ id: "a1", title: "Restock", body: "PE uniforms are back", createdAt: "2026-08-30T01:00:00Z", updatedAt: "2026-08-30T01:00:00Z" }]);
  });

  it("scopes the read to this vendor for display, without replacing RLS", async () => {
    await listVendorAnnouncements();
    const read = harness.scenario.calls.find(c => c.table === "announcements" && c.op === "select");
    expect(read?.eq).toEqual([["vendor_id", "vendor-1"]]);
    // No is_active / expires_at predicate: the SELECT policy already enforces both, and duplicating
    // it client-side would imply the UI is the boundary.
    expect(read?.eq?.some(([col]) => col === "is_active" || col === "expires_at")).toBe(false);
  });

  it("tells the vendor that withdrawn and expired announcements are not shown back", () => {
    expect(page).toContain("Withdrawn and expired announcements are not shown back to vendors");
  });

  it("leaves the shared student read function alone", async () => {
    const catalog = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8");
    expect(catalog).toContain('export async function listAnnouncements(): Promise<Announcement[]>');
    const shared = catalog.slice(catalog.indexOf("export async function listAnnouncements"), catalog.indexOf("export async function listAnnouncements") + 600);
    expect(shared).not.toContain("vendor_id");
  });
});

// 2 + 3
describe("2/3. publish error handling", () => {
  it("2. turns a deliberate authorization refusal into vendor-facing copy", async () => {
    harness.scenario.writeError = { message: 'new row violates row-level security policy for table "announcements"', code: "42501" };
    const error = await capture(publishVendorAnnouncement({ title: "Hi there", body: "A helpful update for students" }));
    expect(error).toBeInstanceOf(VendorFacingError);
    expect((error as Error).message).toBe("You are not authorized to manage announcements for this store.");
    // The raw Postgres wording names internal objects and must never be surfaced.
    expect((error as Error).message).not.toContain("row-level security");
  });

  it("3. leaves an unexpected fault as-is", async () => {
    harness.scenario.writeError = { message: 'relation "announcements" does not exist', code: "42P01" };
    const error = await capture(publishVendorAnnouncement({ title: "Hi there", body: "A helpful update for students" }));
    expect(error).not.toBeInstanceOf(VendorFacingError);
    expect((error as { code: string }).code).toBe("42P01");
  });

  it("keeps the insert contract unchanged", async () => {
    await publishVendorAnnouncement({ title: "  Restock  ", body: "  PE uniforms are back  " });
    const insert = harness.scenario.calls.find(c => c.op === "insert");
    expect(insert?.payload).toEqual({
      school_id: "school-1", vendor_id: "vendor-1", author_id: "staff-1",
      title: "Restock", body: "PE uniforms are back", is_active: true,
    });
  });
});

// 4 + 5 + 6
describe("4/5/6. update is verified, never assumed", () => {
  it("4. asks for a representation", async () => {
    harness.scenario.writtenRows = [{ id: "a1" }];
    await updateVendorAnnouncement({ id: "a1", title: "New title", body: "A longer body for students" });
    const write = harness.scenario.calls.find(c => c.op === "update");
    expect(write?.selected).toBe("id");
    expect(write?.eq).toEqual([["id", "a1"]]);
  });

  it("5. treats zero rows as a failure rather than success", async () => {
    harness.scenario.writtenRows = [];
    const error = await capture(updateVendorAnnouncement({ id: "a1", title: "New title", body: "A longer body for students" }));
    expect(error).toBeInstanceOf(VendorFacingError);
    expect((error as Error).message).toContain("could no longer be updated");
  });

  it("6. resolves when a row really was updated", async () => {
    harness.scenario.writtenRows = [{ id: "a1" }];
    await expect(updateVendorAnnouncement({ id: "a1", title: "New title", body: "A longer body for students" })).resolves.toBeUndefined();
  });

  it("trims what it writes and touches only title, body and updated_at", async () => {
    harness.scenario.writtenRows = [{ id: "a1" }];
    await updateVendorAnnouncement({ id: "a1", title: "  New title  ", body: "  A longer body  " });
    const payload = harness.scenario.calls.find(c => c.op === "update")?.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["body", "title", "updated_at"]);
    expect(payload.title).toBe("New title");
    expect(payload.body).toBe("A longer body");
  });
});

// 7 + 8
describe("7/8. deactivate writes only is_active", () => {
  it("7. sends is_active false", async () => {
    harness.scenario.writtenRows = [{ id: "a1" }];
    await deactivateVendorAnnouncement({ id: "a1" });
    const payload = harness.scenario.calls.find(c => c.op === "update")?.payload;
    expect(payload).toEqual({ is_active: false });
  });

  it("8. sends nothing unrelated", async () => {
    harness.scenario.writtenRows = [{ id: "a1" }];
    await deactivateVendorAnnouncement({ id: "a1" });
    const payload = harness.scenario.calls.find(c => c.op === "update")?.payload as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(["is_active"]);
    for (const forbidden of ["expires_at", "title", "body", "vendor_id", "school_id", "author_id"]) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });

  it("also verifies the row and refuses a filtered write", async () => {
    harness.scenario.writtenRows = [];
    const error = await capture(deactivateVendorAnnouncement({ id: "a1" }));
    expect(error).toBeInstanceOf(VendorFacingError);
    expect(harness.scenario.calls.find(c => c.op === "update")?.selected).toBe("id");
  });
});

// 9
describe("9. validation is announced", () => {
  it("every validation message carries role=alert", () => {
    expect(page.match(/role="alert"/g)?.length).toBe(4);
    expect(page).toContain("Add a meaningful title.");
    expect(page).toContain("Write a brief helpful update.");
  });
});

// 10 + 11 + 12
describe("10/11/12. scope and design constraints", () => {
  it("10. offers no delete affordance anywhere", () => {
    for (const forbidden of [/delete/i, /\bremove\b/i, /deleteAnnouncement/]) {
      expect(page).not.toMatch(forbidden);
    }
  });

  it("10. and no delete function exists in the data layer", () => {
    const catalog = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8");
    expect(catalog).not.toContain("deleteVendorAnnouncement");
    expect(catalog).not.toMatch(/from\("announcements"\)\s*\.delete\(/);
  });

  it("11. keeps the narrow workspace layout", () => {
    expect(page).toContain('width="narrow"');
    expect(page).toContain("<WorkspacePage");
    expect(page).toContain("<WorkspacePanel");
  });

  it("12. introduces no raw brand hex", () => {
    expect(page).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(page).toContain("bg-secondary text-primary");
  });

  it("adds no expiry control, which is a later phase", () => {
    expect(page).not.toMatch(/expires_at|expiry|Expire/);
  });

  it("keeps the shared foundation and radius token", () => {
    expect(page).toContain("rounded-[var(--radius)]");
    expect(page).not.toContain("GraduationCap");
    expect(page).not.toContain("BrandMark");
    expect(page).toContain('allowedRoles={["vendor_staff", "platform_admin", "admin"]}');
  });
});

// 14 + 15
describe("14/15. per-announcement pending and edit lifecycle", () => {
  it("14. each card owns its mutations, so one save cannot freeze another", () => {
    // pending is derived inside AnnouncementCard from that card's own mutations only.
    expect(page).toContain("const pending = save.isPending || withdraw.isPending;");
    expect(page).toContain("function AnnouncementCard({ announcement, vendorKey }");
    // No cross-card gate is passed down.
    expect(page).not.toMatch(/isBusy|busyId/);
  });

  it("15. edit exposes save and cancel, and cancel restores the original values", () => {
    expect(page).toContain("setEditing(true)");
    expect(page).toContain("setEditing(false)");
    expect(page).toContain("form.reset({ title: announcement.title, body: announcement.body })");
    expect(page).toContain('{save.isPending ? "Saving…" : "Save changes"}');
  });

  it("confirms before withdrawing and states the consequence honestly", () => {
    expect(page).toContain("<AlertDialog>");
    expect(page).toContain("stop appearing to students");
    expect(page).toContain("not be able to restore or reuse it");
    expect(page).toContain("Keep it published");
  });

  it("refreshes both the vendor list and the shared student key after a write", () => {
    expect(page).toContain("invalidateQueries({ queryKey: vendorKey })");
    expect(page).toContain('invalidateQueries({ queryKey: ["supabase-announcements"] })');
  });
});

describe("query states", () => {
  it("keeps all five and orders offline before error before empty", () => {
    const loading = page.indexOf("announcements.isLoading");
    const offline = page.indexOf("isStalledWithoutData(announcements)");
    const error = page.indexOf("announcements.isError");
    const empty = page.indexOf("notices.length ?");
    expect(loading).toBeGreaterThan(-1);
    expect(loading).toBeLessThan(offline);
    expect(offline).toBeLessThan(error);
    expect(error).toBeLessThan(empty);
    expect(page).toContain("<OfflinePanel");
    expect(page).toContain('title="Nothing published yet"');
  });
});
