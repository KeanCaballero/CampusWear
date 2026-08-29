import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderTimeline } from "@/components/campuswear/OrderTimeline";

describe("OrderTimeline", () => {
  it("identifies the current status and exposes readable progress semantics", () => {
    const markup = renderToStaticMarkup(createElement(OrderTimeline, { status: "preparing" }));

    expect(markup).toContain('aria-label="Order progress"');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("Current step: ");
    expect(markup).toContain("Preparing");
  });

  it("gives terminal states a distinct accessible label", () => {
    const markup = renderToStaticMarkup(createElement(OrderTimeline, { status: "cancelled" }));

    expect(markup).toContain('aria-label="Order cancelled"');
    expect(markup).not.toContain('aria-current="step"');
  });
});
