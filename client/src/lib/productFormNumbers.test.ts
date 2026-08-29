import { describe, expect, it } from "vitest";
import { toFormNumber } from "./productFormNumbers";

describe("vendor product numeric form values", () => {
  it("converts valid peso and stock input strings to numbers before schema validation", () => {
    expect(toFormNumber("1111")).toBe(1111);
    expect(toFormNumber("0")).toBe(0);
    expect(toFormNumber("5.5")).toBe(5.5);
  });

  it("keeps blank numeric fields invalid instead of silently turning them into zero", () => {
    expect(Number.isNaN(toFormNumber(""))).toBe(true);
  });
});
