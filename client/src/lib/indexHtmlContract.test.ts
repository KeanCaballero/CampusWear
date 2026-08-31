import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Vite substitutes `%VITE_FOO%` tokens in index.html at build time — but when the variable is not
 * defined it leaves the token verbatim rather than failing the build. A dead Umami tag shipped that
 * way, so every production page load requested `/%VITE_ANALYTICS_ENDPOINT%/umami`, hit the SPA
 * rewrite, received HTML where a script was expected, and logged ERR_HTTP2_PROTOCOL_ERROR.
 *
 * This guards the general case, not just that one tag: any unsubstituted token is a shipped 404.
 */
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

describe("the built HTML shell carries no unresolved build-time tokens", () => {
  it("contains no %VITE_*% placeholders", () => {
    expect(html.match(/%VITE_[A-Z0-9_]+%/g) ?? []).toEqual([]);
  });

  it("references no analytics endpoint that the repository never configures", () => {
    expect(html).not.toContain("umami");
  });

  it("still mounts the application", () => {
    expect(html).toContain('<div id="root">');
    expect(html).toContain('src="/src/main.tsx"');
  });
});
