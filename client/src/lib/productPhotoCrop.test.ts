import { describe, expect, it } from "vitest";
import { cropSourceRect } from "./productPhotoCrop";

describe("cropSourceRect", () => {
  it("uses a centered 4:3 crop at the default adjustment", () => {
    expect(cropSourceRect(1600, 900, { zoom: 1, panX: 0, panY: 0 })).toEqual({ x: 200, y: 0, width: 1200, height: 900 });
  });

  it("clamps zoom and pan so the selected crop cannot move outside the source image", () => {
    expect(cropSourceRect(1600, 900, { zoom: 3, panX: 4, panY: -4 })).toEqual({ x: 1000, y: 0, width: 600, height: 450 });
  });
});
