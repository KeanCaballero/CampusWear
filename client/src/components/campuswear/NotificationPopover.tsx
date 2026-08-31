import { Bell } from "lucide-react";
import { Link } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatShortDate } from "@/lib/format";
import { notificationAriaLabel } from "@/lib/notificationBadge";
import type { NotificationItem } from "@/lib/supabaseCatalog";

/**
 * A compact view of the newest notifications, hung off the header bell.
 *
 * It renders whatever the shell already fetched — the same `notificationsQueryKey` the Notifications
 * page uses — so opening it costs nothing and can never disagree with the badge beside it.
 *
 * It deliberately does NOT mark anything read. Opening a menu is not the same as reading, and a
 * popover that silently cleared the badge would destroy the one signal a student relies on. Reading
 * stays an explicit action on the Notifications page, where the existing per-row pending state and
 * error handling live untouched.
 *
 * Unread is shown three ways — a dot, a heavier weight, and a tinted row — so it never depends on
 * colour alone. The dot is aria-hidden; each row carries its state in text for a screen reader.
 */

/** Enough to be useful at a glance without turning the popover into a second page. */
const PREVIEW_LIMIT = 5;

export function NotificationPopover({
  notifications,
  unreadCount,
  badge,
  badgeClass,
  isCurrent,
}: {
  notifications: NotificationItem[] | undefined;
  unreadCount: number;
  badge: string;
  badgeClass: string;
  isCurrent: boolean;
}) {
  const recent = (notifications ?? []).slice(0, PREVIEW_LIMIT);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={notificationAriaLabel(unreadCount)}
          className={`relative grid size-10 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold ${isCurrent ? "bg-white/14 text-white shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
        >
          <Bell className="size-4.5" aria-hidden="true" />
          {/* Decorative: the count is already in the trigger's accessible name. */}
          {badge && <span aria-hidden="true" className={badgeClass}>{badge}</span>}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0" aria-label="Recent notifications">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-extrabold">Notifications</p>
          <span className="text-xs font-semibold text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </span>
        </div>

        {recent.length ? (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {recent.map(item => {
              const unread = !item.readAt;
              return (
                <li key={item.id} className={unread ? "bg-secondary/35" : ""}>
                  <Link
                    href="/notifications"
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-campus-blue"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-destructive" : "bg-transparent"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${unread ? "font-extrabold" : "font-semibold text-muted-foreground"}`}>
                        {item.title}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted-foreground">{item.body}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">
                        {formatShortDate(item.createdAt)}
                        {/* State in text, so it does not rely on the dot or the weight. */}
                        <span className="sr-only">{unread ? " · Unread" : " · Read"}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-bold">You&apos;re all caught up</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Updates about your orders and vendor announcements appear here.
            </p>
          </div>
        )}

        <div className="border-t border-border p-2">
          <Link
            href="/notifications"
            className="flex min-h-11 items-center justify-center rounded-lg text-sm font-bold text-campus-blue transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
