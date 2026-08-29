import { describe, expect, it } from "vitest";

describe("CampusWear Supabase configuration", () => {
  it("can reach the configured Supabase Auth settings endpoint with the publishable key", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(url, "VITE_SUPABASE_URL must be configured").toBeTruthy();
    expect(publishableKey, "VITE_SUPABASE_PUBLISHABLE_KEY must be configured").toBeTruthy();

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey! },
    });

    expect(response.ok, `Supabase settings check failed with HTTP ${response.status}`).toBe(true);
  });
});
