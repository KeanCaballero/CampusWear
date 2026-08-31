import type { NotificationItem } from "@/lib/supabaseCatalog";

/**
 * Unread-count logic for the header bell, kept pure so it can be tested without a browser.
 *
 * The count comes from the notifications the signed-in student can already read. RLS decides that:
 * `users view own notifications` exposes only rows where `recipient_user_id = auth.uid()`, so the
 * number can never include anyone else's. There is no separate query and no separate endpoint —
 * the shell reuses the same query key the Notifications page uses, so marking one read updates the
 * badge through the invalidation that already happens.
 */

/** Above this, the badge shows "9+" rather than growing wide enough to break the header. */
export const NOTIFICATION_BADGE_MAX = 9;

/** A notification is unread when the database has not stamped `read_at`. */
export function isUnread(notification: Pick<NotificationItem, "readAt">): boolean {
  return notification.readAt === null || notification.readAt === undefined;
}

export function unreadNotificationCount(notifications: readonly NotificationItem[] | undefined | null): number {
  return (notifications ?? []).filter(isUnread).length;
}

/** What the badge prints. Empty string when there is nothing to show, so the caller renders none. */
export function notificationBadgeText(count: number): string {
  if (count <= 0) return "";
  return count > NOTIFICATION_BADGE_MAX ? `${NOTIFICATION_BADGE_MAX}+` : String(count);
}

/**
 * The accessible name for the bell.
 *
 * The count must not be conveyed by a red dot alone — colour is not available to every reader, and
 * the badge glyph is decorative once the control itself is named.
 */
export function notificationAriaLabel(count: number): string {
  if (count <= 0) return "Notifications, none unread";
  return `Notifications, ${count} unread`;
}
