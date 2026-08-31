import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isUnread,
  NOTIFICATION_BADGE_MAX,
  notificationAriaLabel,
  notificationBadgeText,
  unreadNotificationCount,
} from "./notificationBadge";
import type { NotificationItem } from "./supabaseCatalog";

const notification = (id: string, readAt: string | null): NotificationItem => ({
  id,
  title: `Update ${id}`,
  body: "Body",
  readAt,
  createdAt: "2026-08-31T00:00:00Z",
});

const READ = "2026-08-31T01:00:00Z";

describe("unread count", () => {
  it("0 unread → no badge", () => {
    const items = [notification("a", READ), notification("b", READ)];
    expect(unreadNotificationCount(items)).toBe(0);
    expect(notificationBadgeText(0)).toBe("");
  });

  it("1 unread → badge \"1\"", () => {
    const items = [notification("a", null), notification("b", READ)];
    expect(unreadNotificationCount(items)).toBe(1);
    expect(notificationBadgeText(1)).toBe("1");
  });

  it("2 unread → badge \"2\"", () => {
    const items = [notification("a", null), notification("b", null), notification("c", READ)];
    expect(unreadNotificationCount(items)).toBe(2);
    expect(notificationBadgeText(2)).toBe("2");
  });

  it("counts several unread exactly", () => {
    const items = Array.from({ length: 7 }, (_, index) => notification(String(index), index < 5 ? null : READ));
    expect(unreadNotificationCount(items)).toBe(5);
    expect(notificationBadgeText(5)).toBe("5");
  });

  it("caps the printed count so the header cannot be stretched", () => {
    expect(notificationBadgeText(NOTIFICATION_BADGE_MAX)).toBe(String(NOTIFICATION_BADGE_MAX));
    expect(notificationBadgeText(NOTIFICATION_BADGE_MAX + 1)).toBe(`${NOTIFICATION_BADGE_MAX}+`);
    expect(notificationBadgeText(250)).toBe(`${NOTIFICATION_BADGE_MAX}+`);
  });

  it("all read → no badge again", () => {
    const before = [notification("a", null), notification("b", null)];
    expect(unreadNotificationCount(before)).toBe(2);
    // The page invalidates the shared query after marking read; the refreshed rows carry read_at.
    const after = before.map(item => ({ ...item, readAt: READ }));
    expect(unreadNotificationCount(after)).toBe(0);
    expect(notificationBadgeText(unreadNotificationCount(after))).toBe("");
  });

  it("marking one of two read leaves the count at one", () => {
    const items = [notification("a", null), notification("b", null)];
    const afterOne = items.map(item => (item.id === "a" ? { ...item, readAt: READ } : item));
    expect(unreadNotificationCount(afterOne)).toBe(1);
    expect(notificationBadgeText(1)).toBe("1");
  });

  it("treats a missing read_at as unread and never invents a count", () => {
    expect(isUnread({ readAt: null })).toBe(true);
    expect(isUnread({ readAt: undefined as unknown as string | null })).toBe(true);
    expect(isUnread({ readAt: READ })).toBe(false);
    expect(unreadNotificationCount(undefined)).toBe(0);
    expect(unreadNotificationCount(null)).toBe(0);
    expect(unreadNotificationCount([])).toBe(0);
  });
});

describe("accessibility", () => {
  it("names the control and its count, so red is never the only signal", () => {
    expect(notificationAriaLabel(0)).toBe("Notifications, none unread");
    expect(notificationAriaLabel(1)).toBe("Notifications, 1 unread");
    expect(notificationAriaLabel(4)).toBe("Notifications, 4 unread");
  });

  it("keeps the accessible name exact even when the badge glyph is capped", () => {
    // The badge may print "9+", but a reader is told the real number.
    expect(notificationBadgeText(12)).toBe("9+");
    expect(notificationAriaLabel(12)).toBe("Notifications, 12 unread");
  });
});

describe("the shell wires the badge to the existing notification data", () => {
  const shell = readFileSync(new URL("../components/campuswear/StudentShell.tsx", import.meta.url), "utf8");
  const helper = readFileSync(new URL("./notificationBadge.ts", import.meta.url), "utf8");

  it("reuses the Notifications page query key rather than adding a second source", () => {
    expect(shell).toContain("notificationsQueryKey(user?.id)");
    expect(shell).toContain("queryFn: listNotifications");
  });

  it("does not fetch for a signed-out visitor", () => {
    expect(shell).toContain("enabled: !loading && Boolean(user?.id)");
  });

  it("puts the count in the accessible name and marks the badge decorative", () => {
    expect(shell).toContain("aria-label={notificationAriaLabel(unreadCount)}");
    expect(shell).toMatch(/unreadBadge && \(\s*<span\s*\n\s*aria-hidden="true"/);
  });

  it("gives the bell a visible focus state", () => {
    expect(shell).toContain("focus-visible:ring-2");
  });

  it("introduces no service-role access or secret", () => {
    for (const source of [shell, helper]) {
      expect(source).not.toContain("service_role");
      expect(source).not.toContain("sb_secret_");
      expect(source).not.toMatch(/SUPABASE_SERVICE/);
    }
  });

  it("does not build its own notification query against the table", () => {
    // The count must come through listNotifications, which RLS scopes to the signed-in student.
    expect(shell).not.toContain('from("notifications")');
  });
});
