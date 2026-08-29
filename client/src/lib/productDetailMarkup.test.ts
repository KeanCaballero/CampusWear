import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/ProductDetail.tsx", import.meta.url), "utf8");

describe("product detail resilient markup", () => {
  it("separates load failures from unavailable products and gives the student a retry action", () => {
    expect(source).toContain("if (product.isError)");
    expect(source).toContain("This product could not be loaded");
    expect(source).toContain("onClick: () => product.refetch()");
  });

  it("groups size controls semantically and announces the selected-size availability", () => {
    expect(source).toContain("<fieldset className=");
    expect(source).toContain("<legend className=");
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain("min-h-12 min-w-12");
  });
});
