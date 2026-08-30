import { beforeEach, describe, expect, it, vi } from "vitest";

// Behavioural coverage for marking a notification read.
//
// The bug: PostgREST answers 200 with an empty array when a write matches no rows. An
// RLS-filtered or already-read UPDATE is therefore NOT an error. The original call issued
// `.update(...).eq(...).is("read_at", null)` with no `select()`, so there was no representation to
// inspect: `error` was null, the mutation reported success, the query was invalidated, and the
// notification came back still unread. The student clicked Read and nothing happened, silently.
const harness = vi.hoisted(() => {
  const scenario = {
    updatedRows: [] as Array<{ id: string }>,
    updateError: null as { message: string; code?: string } | null,
    existingRow: null as { read_at: string | null } | null,
    lookupError: null as { message: string } | null,
    selectArgsAfterUpdate: [] as string[],
    updateCalls: 0,
    lookupCalls: 0,
  };

  function tableBuilder() {
    const state = { updated: false };
    const settle = () =>
      state.updated
        ? { data: scenario.updatedRows, error: scenario.updateError }
        : { data: scenario.existingRow, error: scenario.lookupError };

    const builder: any = {
      update: () => {
        state.updated = true;
        scenario.updateCalls += 1;
        return builder;
      },
      select: (columns: string) => {
        if (state.updated) scenario.selectArgsAfterUpdate.push(columns);
        else scenario.lookupCalls += 1;
        return builder;
      },
      eq: () => builder,
      is: () => builder,
      order: () => builder,
      maybeSingle: () => Promise.resolve(settle()),
      single: () => Promise.resolve(settle()),
      then: (onFulfilled: any, onRejected: any) => Promise.resolve(settle()).then(onFulfilled, onRejected),
    };
    return builder;
  }

  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } }, error: null }) },
    from: () => tableBuilder(),
  };

  return { scenario, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: harness.client, isSupabaseConfigured: true }));

const { markNotificationRead, UserFacingError } = await import("@/lib/supabaseCatalog");

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to reject, but it resolved");
}

beforeEach(() => {
  harness.scenario.updatedRows = [];
  harness.scenario.updateError = null;
  harness.scenario.existingRow = null;
  harness.scenario.lookupError = null;
  harness.scenario.selectArgsAfterUpdate = [];
  harness.scenario.updateCalls = 0;
  harness.scenario.lookupCalls = 0;
});

describe("the update asks for a representation", () => {
  it("selects after updating, so zero rows can be detected at all", () => {
    harness.scenario.updatedRows = [{ id: "notification-1" }];
    return markNotificationRead("notification-1").then(() => {
      // Without this, supabase-js sends no Prefer: return=representation and the caller is blind.
      expect(harness.scenario.selectArgsAfterUpdate).toContain("id");
    });
  });
});

describe("a real update", () => {
  it("resolves when the row was actually marked read", async () => {
    harness.scenario.updatedRows = [{ id: "notification-1" }];
    await expect(markNotificationRead("notification-1")).resolves.toBeUndefined();
    expect(harness.scenario.updateCalls).toBe(1);
  });

  it("does not perform a second lookup when the write already succeeded", async () => {
    harness.scenario.updatedRows = [{ id: "notification-1" }];
    await markNotificationRead("notification-1");
    expect(harness.scenario.lookupCalls).toBe(0);
  });
});

describe("zero rows is investigated, never reported as blind success", () => {
  it("checks why nothing was updated instead of resolving immediately", async () => {
    harness.scenario.updatedRows = [];
    harness.scenario.existingRow = { read_at: "2026-08-31T00:00:00.000Z" };
    await markNotificationRead("notification-1");
    // The regression: the old implementation stopped here with no idea whether anything changed.
    expect(harness.scenario.lookupCalls).toBe(1);
  });

  it("treats an already-read notification as done rather than an error", async () => {
    harness.scenario.updatedRows = [];
    harness.scenario.existingRow = { read_at: "2026-08-31T00:00:00.000Z" };
    // A double click or a second tab must not raise a scary failure.
    await expect(markNotificationRead("notification-1")).resolves.toBeUndefined();
  });

  it("raises a student-facing error when the notification is not readable by this user", async () => {
    harness.scenario.updatedRows = [];
    harness.scenario.existingRow = null;
    const error = await captureError(markNotificationRead("someone-elses-notification"));
    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as Error).message).toBe("That notification is no longer available.");
  });
});

describe("genuine database faults are not swallowed", () => {
  it("propagates an error from the update itself", async () => {
    harness.scenario.updateError = { message: "permission denied for table notifications", code: "42501" };
    const error = await captureError(markNotificationRead("notification-1"));
    expect((error as { code?: string }).code).toBe("42501");
    // A PostgREST error is a plain object, not an Error instance — the reason an
    // `instanceof Error` check in the UI silently degraded real faults to a generic message.
    expect(error).not.toBeInstanceOf(Error);
  });

  it("propagates an error from the follow-up lookup", async () => {
    harness.scenario.updatedRows = [];
    harness.scenario.lookupError = { message: "connection reset" };
    const error = await captureError(markNotificationRead("notification-1"));
    expect((error as { message: string }).message).toBe("connection reset");
  });
});
