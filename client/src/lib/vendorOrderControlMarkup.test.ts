import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VendorOrderTransitionControl } from "@/pages/vendor/VendorOrders";

describe("VendorOrderTransitionControl", () => {
  it("replaces a disabled status selector with clear finalized feedback for terminal orders", () => {
    const markup = renderToStaticMarkup(createElement(VendorOrderTransitionControl, { status: "completed", isPending: false, onStatusChange: () => undefined }));

    expect(markup).toContain('role="status"');
    // "Finalized" read identically for a fulfilled pickup and an abandoned one. The terminal note
    // now names the actual outcome, and still promises nothing beyond it.
    expect(markup).toContain("Completed — no further updates.");
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

    // The filter row now sits inside the search toolbar panel, so its top margin changed from
    // mt-7 to mt-3. The guarantee this protects — wrapping, touch-ready chips — is unchanged.
    expect(page).toContain('className="mt-3 flex flex-wrap gap-2"');
    // The chips now carry a count, so the class expression became a template literal that also
    // pins a 44px touch target. The guarantee protected here — wrapping, touch-ready chips — holds.
    expect(page).toContain('className={`min-h-11 ${filter === option.value ? "" : "bg-card"}`}');
    expect(page).toContain('aria-live="polite"');
  });
});
