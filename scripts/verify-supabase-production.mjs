const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.");

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const tables = ["schools", "profiles", "vendors", "categories", "products", "product_variants", "inventory", "orders", "order_items", "announcements", "notifications", "pickup_slots"];
const missing = [];

for (const table of tables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
  if (response.status === 404) missing.push(table);
  else if (![200, 401, 403].includes(response.status)) throw new Error(`Unexpected ${table} response: HTTP ${response.status}`);
}

const rpcProbes = {
  create_order_from_cart: { pickup_location_input: "readiness-check" },
  transition_order_status: { p_order_id: "00000000-0000-0000-0000-000000000000", p_new_status: "confirmed" },
  get_public_catalog: {},
  list_platform_accounts: { p_search: "__readiness_check__" },
};

for (const [rpc, payload] of Object.entries(rpcProbes)) {
  const response = await fetch(`${url}/rest/v1/rpc/${rpc}`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (response.status === 404) missing.push(`rpc:${rpc}`);
  else if (![200, 400, 401, 403].includes(response.status)) throw new Error(`Unexpected ${rpc} response: HTTP ${response.status}`);
}

if (missing.length) {
  throw new Error(`CampusWear Supabase schema is not ready. Apply the repository migrations; missing: ${missing.join(", ")}`);
}

console.log("CampusWear Supabase production schema and RPC endpoints are reachable.");
