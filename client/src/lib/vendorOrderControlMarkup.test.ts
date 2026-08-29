import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VendorOrderTransitionControl } from "@/pages/vendor/VendorOrders";

describe("VendorOrderTransitionControl", () => {
  it("replaces a disabled status selector with clear finalized feedback for terminal orders", () => {
    const markup = renderToStaticMarkup(createElement(VendorOrderTransitionControl, { status: "completed", isPending: false, onStatusChange: () => undefined }));

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Finalized — no further updates");
    expect(markup).not.toContain("Update status");
  });

  it("keeps the controlled status selector for active orders", () => {
    const markup = renderToStaticMarkup(createElement(VendorOrderTransitionControl, { status: "preparing", isPending: false, onStatusChange: () => undefined }));

    expect(markup).toContain("Update order status from Preparing");
    expect(markup).toContain("Update status");
  });

  it("keeps status filters touch-ready, wrapping, and readable when a filter is selected", async () => {
    const { readFileSync } = await import("node:fs");
    const page = readFileSync(new URL("../pages/vendor/VendorOrders.tsx", import.meta.url), "utf8");

    expect(page).toContain('className="mt-7 flex flex-wrap gap-2"');
    expect(page).toContain('className={filter === option.value ? "" : "bg-card"}');
    expect(page).toContain('aria-live="polite"');
  });
});
