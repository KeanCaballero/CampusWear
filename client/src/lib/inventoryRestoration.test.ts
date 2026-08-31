import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Coverage for the inventory-restoration migration.
 *
 * SCOPE, STATED PLAINLY: these are STRUCTURAL assertions about the migration SQL. This repository
 * has no Postgres available — no psql, no Docker, no Supabase CLI — so the migration cannot be
 * executed here, and nothing below pretends to have run it. Runtime behaviour was instead evidenced
 * read-only against the live database (an EXPLAIN of the exact restoration statement, and the
 * restoration CTE run as a plain SELECT); that evidence is recorded in the pull request, not
 * simulated here. Writing a TypeScript re-implementation and asserting against that would prove
 * only that the re-implementation matches itself.
 *
 * What these tests do protect is real: that the shipped SQL keeps every security property of the
 * function it replaces, restores for exactly the two states that warrant it, sources the amount
 * from the movement ledger, and cannot credit stock twice.
 */

const MIGRATIONS_DIR = new URL("../../../supabase/migrations/", import.meta.url);
const FILENAME = "20260831060000_restore_inventory_on_terminal_orders.sql";
const migration = readFileSync(new URL(FILENAME, MIGRATIONS_DIR), "utf8");
/** SQL with `--` comments removed, so prose can never satisfy an assertion. */
const sql = migration.replace(/^\s*--.*$/gm, "");

describe("the migration is append-only and does not rewrite history", () => {
  it("is a new file, and no earlier migration was edited", () => {
    const files = readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith(".sql")).sort();
    expect(files).toContain(FILENAME);
    // It must sort last, so the ledger stays chronological.
    expect(files[files.length - 1]).toBe(FILENAME);
  });

  it("replaces the function rather than dropping it", () => {
    expect(sql).toMatch(/create or replace function public\.transition_order_status/i);
    expect(sql).not.toMatch(/drop\s+function/i);
  });

  it("changes no table schema and drops nothing", () => {
    expect(sql).not.toMatch(/alter table/i);
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/drop index/i);
    expect(sql).not.toMatch(/drop policy/i);
    expect(sql).not.toMatch(/delete from/i);
    expect(sql).not.toMatch(/truncate/i);
  });

  it("backfills nothing — the 5 lost units are a separate, approved operation", () => {
    // A backfill would have to touch existing rows outside the function body.
    expect(sql).not.toMatch(/update public\.inventory[\s\S]*where[\s\S]*status in \('cancelled', 'rejected'\)/i);
    expect(sql).not.toMatch(/insert into public\.inventory_movements[\s\S]*from public\.orders/i);
  });
});

describe("every security property of the original function survives", () => {
  it("stays SECURITY DEFINER with a pinned search_path", () => {
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path to 'public', 'auth', 'pg_temp'/i);
  });

  it("keeps the authentication guard", () => {
    expect(sql).toContain("if auth.uid() is null then");
    expect(sql).toContain("errcode = '28000'");
  });

  it("keeps vendor authorization, and does not weaken it", () => {
    expect(sql).toContain("if not private.is_vendor_staff(current_order.vendor_id) then");
    expect(sql).toContain("errcode = '42501'");
  });

  it("keeps the row lock that serialises concurrent transitions", () => {
    expect(sql).toContain("select * into current_order from public.orders where id = p_order_id for update;");
  });

  it("grants execute no more widely than before", () => {
    expect(sql).toMatch(/revoke all on function public\.transition_order_status\(uuid, order_status\) from public;/i);
    expect(sql).toMatch(/grant execute on function public\.transition_order_status\(uuid, order_status\) to authenticated, service_role;/i);
    expect(sql).not.toMatch(/to\s+anon/i);
  });

  it("adds no service-role logic inside the function", () => {
    // service_role appears once, in the GRANT that already existed. It must never be assumed as a
    // role inside the body, and no secret may be embedded.
    expect(sql).not.toMatch(/set\s+(local\s+)?role/i);
    expect(sql).not.toMatch(/sb_secret_|SUPABASE_SERVICE|eyJ[A-Za-z0-9_-]{20,}/);
    const serviceRoleMentions = sql.match(/service_role/g) ?? [];
    expect(serviceRoleMentions).toHaveLength(1);
  });

  it("touches no RLS policy", () => {
    expect(sql).not.toMatch(/create policy|alter policy|enable row level security|disable row level security/i);
  });
});

describe("the order state machine is untouched", () => {
  it("keeps all four legal transition groups exactly as they were", () => {
    expect(sql).toContain("(current_order.status = 'pending' and p_new_status in ('confirmed', 'rejected', 'cancelled'))");
    expect(sql).toContain("(current_order.status = 'confirmed' and p_new_status in ('preparing', 'cancelled'))");
    expect(sql).toContain("(current_order.status = 'preparing' and p_new_status in ('ready_for_pickup', 'cancelled'))");
    expect(sql).toContain("(current_order.status = 'ready_for_pickup' and p_new_status in ('completed', 'cancelled'))");
    expect(sql).toContain("errcode = '22023'");
  });

  it("adds no new status", () => {
    expect(sql).not.toMatch(/create type|alter type .* add value/i);
  });

  it("leaves pickup_status semantics alone", () => {
    expect(sql).toContain("when p_new_status = 'ready_for_pickup' then 'ready'::public.pickup_status");
    expect(sql).toContain("when p_new_status = 'completed' then 'picked_up'::public.pickup_status");
  });

  it("still writes completed_at only on completion", () => {
    expect(sql).toContain("completed_at = case when p_new_status = 'completed' then now() else completed_at end");
  });

  it("still notifies the student on every transition", () => {
    expect(sql).toContain("insert into public.notifications (recipient_user_id, school_id, order_id, type, title, body)");
    expect(sql).toContain("'order_' || p_new_status::text");
  });
});

describe("restoration happens for exactly the right states", () => {
  it("restores on cancelled and rejected", () => {
    expect(sql).toContain("if p_new_status in ('cancelled', 'rejected') then");
  });

  it("does not restore on completed, nor on any forward transition", () => {
    // The guard is a single `in` list; completed and the non-terminal states are absent from it.
    const guard = /if p_new_status in \(([^)]*)\) then/.exec(sql)?.[1] ?? "";
    expect(guard).toContain("'cancelled'");
    expect(guard).toContain("'rejected'");
    expect(guard).not.toContain("'completed'");
    expect(guard).not.toContain("'confirmed'");
    expect(guard).not.toContain("'preparing'");
    expect(guard).not.toContain("'ready_for_pickup'");
    expect(guard).not.toContain("'pending'");
  });

  it("restores inside the same transaction as the status change, after the row lock", () => {
    const lockAt = sql.indexOf("for update;");
    const updateAt = sql.indexOf("update public.orders");
    const restoreAt = sql.indexOf("if p_new_status in ('cancelled', 'rejected') then");
    expect(lockAt).toBeGreaterThan(-1);
    expect(updateAt).toBeGreaterThan(lockAt);
    expect(restoreAt).toBeGreaterThan(updateAt);
    // No commit/rollback inside the function: it inherits the caller's transaction.
    expect(sql).not.toMatch(/\bcommit\b|\brollback\b/i);
  });
});

describe("the amount restored is what was actually consumed", () => {
  it("reads the movement ledger, not order_items.quantity", () => {
    expect(sql).toContain("from public.inventory_movements m");
    expect(sql).toContain("and m.reason = 'order_placed'");
    expect(sql).not.toMatch(/from public\.order_items[\s\S]{0,200}update public\.inventory/i);
  });

  it("aggregates per variant, so several movements for one variant cannot double-count", () => {
    expect(sql).toContain("sum(m.quantity_delta) as net_delta");
    expect(sql).toContain("group by m.variant_id");
  });

  it("reverses only genuine consumption, so stock can never be manufactured", () => {
    expect(sql).toContain("having sum(m.quantity_delta) < 0");
    expect(sql).toContain("-c.net_delta");
  });

  it("skips a movement whose variant is gone, rather than guessing", () => {
    expect(sql).toContain("and m.variant_id is not null");
  });

  it("adds to the existing quantity rather than overwriting it", () => {
    expect(sql).toContain("set quantity = i.quantity + r.quantity_delta");
    expect(sql).not.toMatch(/set quantity = [^i]/);
  });

  it("restores each variant independently, matched by primary key", () => {
    expect(sql).toContain("where i.variant_id = r.variant_id");
  });
});

describe("idempotency is enforced by the schema, not by application code", () => {
  it("adds a partial unique index covering restoration rows only", () => {
    expect(sql).toMatch(/create unique index if not exists inventory_movements_one_restoration_per_order_variant/i);
    expect(sql).toContain("on public.inventory_movements (order_id, variant_id)");
    expect(sql).toContain("where reason in ('order_cancelled', 'order_rejected')");
  });

  it("leaves order_placed and future manual adjustments free to repeat", () => {
    const indexClause = /create unique index[\s\S]*?;/.exec(sql)?.[0] ?? "";
    expect(indexClause).not.toContain("'order_placed'");
  });

  it("the credit is driven by the insert's RETURNING rows, so a skipped insert credits nothing", () => {
    expect(sql).toContain("on conflict do nothing");
    expect(sql).toContain("returning variant_id, quantity_delta");
    expect(sql).toContain("from restored r");
  });

  it("records the order on every restoration movement, keeping the audit trail complete", () => {
    expect(sql).toContain("insert into public.inventory_movements (variant_id, quantity_delta, reason, order_id, created_by)");
    expect(sql).toContain("p_order_id, auth.uid()");
  });

  it("labels the movement with the outcome that caused it", () => {
    expect(sql).toContain("'order_' || p_new_status::text, p_order_id");
  });

  it("never deletes or rewrites an existing movement", () => {
    expect(sql).not.toMatch(/delete from public\.inventory_movements/i);
    expect(sql).not.toMatch(/update public\.inventory_movements/i);
  });
});

describe("the client is not asked to compensate for any of this", () => {
  const catalog = readFileSync(new URL("./supabaseCatalog.ts", import.meta.url), "utf8");

  it("the data layer still just calls the RPC and adds no restoration of its own", () => {
    expect(catalog).toContain('client.rpc("transition_order_status"');
    expect(catalog).not.toMatch(/from\("inventory"\)[^;]*\.update\([^)]*quantity[^)]*\+/);
    expect(catalog).not.toContain("order_cancelled");
    expect(catalog).not.toContain("order_rejected");
  });
});
