import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Integration-level coverage for the vendor product deletion contract.
//
// The mocked-builder suite (vendorProductDeleteBehavior.test.ts) pins our own logic. This suite
// exercises the REAL @supabase/supabase-js client — real PostgrestClient, real StorageClient,
// real header/verb construction — against a stubbed transport that replays genuine PostgREST
// response shapes. That is what proves the premise the whole fix rests on:
//
//     an RLS-filtered DELETE is NOT an error. PostgREST answers 200 with an empty array,
//     so supabase-js hands back { data: [], error: null }.
//
// Only auth.getUser is replaced (session bootstrapping is not what is under test here).
type RecordedRequest = { method: string; url: string; headers: Record<string, string>; body?: string };

const SUPABASE_URL = "https://project.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_test";

const scenario = {
  requests: [] as RecordedRequest[],
  deleteRows: [] as Array<{ id: string }>,
  productRow: { id: "product-1", image_path: "vendor-1/product-1/photo.jpg" } as Record<string, unknown> | null,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const transport: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = Object.fromEntries(new Headers(init?.headers as HeadersInit).entries());
  scenario.requests.push({ method, url, headers, body: init?.body as string | undefined });

  const wantsSingleObject = (headers["accept"] ?? "").includes("pgrst.object");

  if (url.includes("/rest/v1/vendor_staff")) {
    return jsonResponse(wantsSingleObject ? { vendor_id: "vendor-1" } : [{ vendor_id: "vendor-1" }]);
  }
  if (url.includes("/rest/v1/vendors")) {
    return jsonResponse(wantsSingleObject ? { school_id: "school-1" } : [{ school_id: "school-1" }]);
  }
  if (url.includes("/rest/v1/products")) {
    if (method === "DELETE") {
      // PostgREST returns the rows it actually deleted. RLS-filtered rows simply are not there,
      // and crucially this is a 200, not an error status.
      return jsonResponse(scenario.deleteRows);
    }
    if (method === "PATCH") return jsonResponse(scenario.deleteRows);
    if (scenario.productRow === null) {
      return wantsSingleObject
        ? jsonResponse({ code: "PGRST116", message: "no rows" }, 406)
        : jsonResponse([]);
    }
    return jsonResponse(wantsSingleObject ? scenario.productRow : [scenario.productRow]);
  }
  if (url.includes("/storage/v1/object")) {
    return jsonResponse([{ name: "photo.jpg" }]);
  }

  throw new Error(`unstubbed request: ${method} ${url}`);
};

function makeClient(): SupabaseClient {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: transport },
  });
  client.auth.getUser = (async () => ({ data: { user: { id: "staff-1" } }, error: null })) as SupabaseClient["auth"]["getUser"];
  return client;
}

const realClient = makeClient();

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return realClient;
  },
  isSupabaseConfigured: true,
}));

const { deleteManagedProduct, ProductDeleteBlockedError, setManagedProductVisibility } = await import("@/lib/supabaseCatalog");

const storageRequests = () => scenario.requests.filter(request => request.url.includes("/storage/v1/object"));

beforeEach(() => {
  scenario.requests = [];
  scenario.deleteRows = [];
  scenario.productRow = { id: "product-1", image_path: "vendor-1/product-1/photo.jpg" };
});

describe("PostgREST semantics the fix depends on", () => {
  it("returns success with zero rows — not an error — when a delete is filtered by RLS", async () => {
    scenario.deleteRows = [];

    const result = await realClient.from("products").delete().eq("id", "product-1").select("id");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("asks PostgREST to return the affected rows so a filtered delete is detectable", async () => {
    scenario.deleteRows = [];
    scenario.requests = [];

    await realClient.from("products").delete().eq("id", "product-1").select("id");

    const deleteRequest = scenario.requests.find(request => request.method === "DELETE");
    expect(deleteRequest?.headers.prefer).toContain("return=representation");
  });

  it("returns the deleted row when the policy allows the delete", async () => {
    scenario.deleteRows = [{ id: "product-1" }];

    const result = await realClient.from("products").delete().eq("id", "product-1").select("id");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: "product-1" }]);
  });
});

describe("deleteManagedProduct against the real client — deletable product", () => {
  it("deletes the product and cleans up its stored image", async () => {
    scenario.deleteRows = [{ id: "product-1" }];

    await expect(deleteManagedProduct({ id: "product-1" })).resolves.toEqual({ imageRemoved: true });
    expect(storageRequests()).toHaveLength(1);
  });

  it("scopes the delete to the authenticated vendor", async () => {
    scenario.deleteRows = [{ id: "product-1" }];

    await deleteManagedProduct({ id: "product-1" });

    const deleteRequest = scenario.requests.find(request => request.method === "DELETE" && request.url.includes("/rest/v1/products"));
    expect(deleteRequest?.url).toContain("id=eq.product-1");
    expect(deleteRequest?.url).toContain("vendor_id=eq.vendor-1");
  });
});

describe("deleteManagedProduct against the real client — order-linked product", () => {
  it("refuses instead of reporting success", async () => {
    scenario.deleteRows = [];

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toBeInstanceOf(ProductDeleteBlockedError);
  });

  it("NEVER issues a storage request when the delete was blocked", async () => {
    scenario.deleteRows = [];

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow();
    expect(storageRequests()).toEqual([]);
  });

  it("leaves the product image intact across repeated blocked attempts", async () => {
    scenario.deleteRows = [];

    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow();
    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow();
    await expect(deleteManagedProduct({ id: "product-1" })).rejects.toThrow();

    expect(storageRequests()).toEqual([]);
  });
});

describe("setManagedProductVisibility uses the existing authorized update path", () => {
  it("PATCHes is_active through PostgREST, vendor-scoped, with no delete or storage call", async () => {
    await setManagedProductVisibility({ id: "product-1", isActive: false });

    const patch = scenario.requests.find(request => request.method === "PATCH");
    expect(patch).toBeDefined();
    expect(patch?.url).toContain("/rest/v1/products");
    expect(patch?.url).toContain("id=eq.product-1");
    expect(patch?.url).toContain("vendor_id=eq.vendor-1");
    expect(JSON.parse(patch?.body ?? "{}")).toEqual({ is_active: false });

    expect(scenario.requests.some(request => request.method === "DELETE")).toBe(false);
    expect(storageRequests()).toEqual([]);
  });

  it("can restore visibility through the same path", async () => {
    await setManagedProductVisibility({ id: "product-1", isActive: true });

    const patch = scenario.requests.find(request => request.method === "PATCH");
    expect(JSON.parse(patch?.body ?? "{}")).toEqual({ is_active: true });
  });
});
