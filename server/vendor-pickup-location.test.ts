import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260825078000_vendor_pickup_location_settings.sql"), "utf8");

describe("vendor pickup location RPC", () => {
  it("limits updates to the authenticated staff member's assigned vendor and validates the location", () => {
    expect(migration).toContain("if auth.uid() is null");
    expect(migration).toContain("where user_id = auth.uid()");
    expect(migration).toContain("char_length(normalized_location) < 3 or char_length(normalized_location) > 240");
    expect(migration).toContain("where id = assigned_vendor_id");
  });

  it("does not expose pickup-location updates to anonymous callers", () => {
    expect(migration).toContain("revoke all on function public.update_vendor_pickup_location(text) from public, anon");
    expect(migration).toContain("grant execute on function public.update_vendor_pickup_location(text) to authenticated");
  });
});
