import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const viteConfig = readFileSync(new URL("../../../vite.config.ts", import.meta.url), "utf8");

describe("production diagnostic asset safety", () => {
  it("keeps the browser debug collector development-only", () => {
    expect(viteConfig).toContain('apply: "serve"');
    expect(viteConfig).toContain('name: "prune-production-debug-assets"');
    expect(viteConfig).toContain('apply: "build"');
    expect(viteConfig).toContain('path.join(PROJECT_ROOT, "dist", "public", "__manus__")');
  });
});
