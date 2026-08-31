import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../components/campuswear/StudentShell.tsx", import.meta.url), "utf8");
const popover = readFileSync(new URL("../components/campuswear/NotificationPopover.tsx", import.meta.url), "utf8");

describe("student shell navigation markup", () => {
  it("provides a keyboard skip link and keeps announcements reachable in the labelled mobile navigation", () => {
    expect(source).toContain('href="#campuswear-main"');
    expect(source).toContain('id="campuswear-main"');
    expect(source).toContain('{ label: "Updates", href: "/announcements", icon: Megaphone }');
    expect(source).toContain('aria-label="Student navigation"');
  });

  it("surfaces active state for the primary header shortcut links", () => {
    expect(source).toContain('aria-current={isCurrent("/cart") ? "page" : undefined}');
    // The bell is a popover trigger now, not a link, so it has no aria-current. Its active state
    // is passed through and applied to the trigger's styling instead.
    expect(source).toContain('isCurrent={isCurrent("/notifications")}');
    expect(source).toContain('aria-current={isCurrent("/profile") ? "page" : undefined}');
  });

  it("uses the official high-contrast campus header without changing its accessible utility controls", () => {
    expect(source).toContain("bg-primary text-white");
    expect(source).toContain("<BrandMark light />");
    // The cart's accessible name now carries the item count, so it is built rather than literal —
    // the same change the bell already went through. The guarantee is unchanged: the control still
    // has a name, and it does not depend on the badge being visible.
    expect(source).toContain("aria-label={cartAriaLabel(cartCount)}");
    // The bell's accessible name now carries the unread count, so it is built rather than literal.
    // The guarantee is unchanged: the control still has a name that does not depend on the badge.
    // The bell now lives in NotificationPopover; the shell renders that component instead. Same
    // guarantee, different file.
    expect(source).toContain("<NotificationPopover");
    expect(popover).toContain("aria-label={notificationAriaLabel(unreadCount)}");
  });
});
