import { Bell, Home, Megaphone, PackageSearch, ShoppingBag, UserRound } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "./BrandMark";
import { OfflineNotice } from "./OfflineNotice";
import { useAuth } from "@/_core/hooks/useAuth";
import { canUseStudentWorkspace, destinationForRole } from "@/lib/authRouting";
import { cartAriaLabel, cartBadgeCount, cartBadgeText } from "@/lib/cartBadge";
import { notificationAriaLabel, notificationBadgeText, unreadNotificationCount } from "@/lib/notificationBadge";
import { cartQueryKey, listCart, listNotifications, notificationsQueryKey } from "@/lib/supabaseCatalog";
import { useQuery } from "@tanstack/react-query";

/**
 * One appearance for both header count badges, so the cart and the bell always match.
 *
 * Uses existing CampusWear tokens: `bg-destructive` for the alert colour and `border-primary` so the
 * ring reads against the navy header, both from the theme rather than a literal. `min-w` plus
 * horizontal padding lets "9+" widen without the badge becoming an ellipse, and because it is
 * absolutely positioned it cannot change the header's height.
 */
const BADGE_CLASS =
  "absolute -right-0.5 -top-0.5 grid min-w-[1.15rem] place-items-center rounded-full border-2 border-primary bg-destructive px-1 text-[10px] font-extrabold leading-4 tabular-nums text-white";

const mobileItems = [
  { label: "Home", href: "/student", icon: Home },
  { label: "Shop", href: "/shop", icon: PackageSearch },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Updates", href: "/announcements", icon: Megaphone },
];

const desktopItems = [
  { label: "Home", href: "/student" },
  { label: "Shop", href: "/shop" },
  { label: "Orders", href: "/orders" },
  { label: "Announcements", href: "/announcements" },
];

export function StudentShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const requiresAccount = ["/cart", "/orders", "/notifications", "/profile"].includes(location);
  const mustLeaveStudentWorkspace = Boolean(user && !canUseStudentWorkspace(user.role));
  const isCurrent = (href: string) => location === href;

  /*
    Same query key and same fetcher the Notifications page uses, so TanStack serves both from one
    cache entry: no extra request, and marking a notification read updates this badge through the
    invalidation that page already performs. RLS scopes the rows to this student's own.
  */
  const notifications = useQuery({
    queryKey: notificationsQueryKey(user?.id),
    queryFn: listNotifications,
    enabled: !loading && Boolean(user?.id),
  });
  const unreadCount = unreadNotificationCount(notifications.data);
  const unreadBadge = notificationBadgeText(unreadCount);

  /*
    The same cart the cart page reads — identical query key, identical fetcher — so TanStack serves
    both from one cache entry. Adding an item, changing a quantity, removing a line and completing
    checkout all already invalidate this key, so the badge follows without any new plumbing.
  */
  const cart = useQuery({
    queryKey: cartQueryKey(user?.id),
    queryFn: listCart,
    enabled: !loading && Boolean(user?.id),
  });
  const cartCount = cartBadgeCount(cart.data);
  const cartBadge = cartBadgeText(cartCount);

  useEffect(() => {
    if (requiresAccount && !loading && !user) {
      window.location.assign(`/auth?next=${encodeURIComponent(location)}`);
    }

    if (!loading && user && mustLeaveStudentWorkspace) {
      setLocation(destinationForRole(user.role));
    }
  }, [loading, location, mustLeaveStudentWorkspace, requiresAccount, setLocation, user]);

  if (requiresAccount && (loading || !user)) {
    return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center text-sm font-semibold text-muted-foreground">Checking your CampusWear account…</main>;
  }

  if (mustLeaveStudentWorkspace) {
    return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center text-sm font-semibold text-muted-foreground">Opening your assigned CampusWear workspace…</main>;
  }

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-0">
      <a
        href="#campuswear-main"
        className="sr-only fixed left-4 top-4 z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg focus:not-sr-only"
      >
        Skip to page content
      </a>

      <header className="sticky top-0 z-40 border-b border-primary/40 bg-primary text-white shadow-[0_2px_14px_rgb(15_39_71/0.14)]">
        <div className="container flex h-16 items-center justify-between gap-4">
          <BrandMark light />

          <nav className="hidden items-center gap-2 text-sm font-semibold text-blue-100 md:flex" aria-label="Main navigation">
            {desktopItems.map(item => {
              const active = isCurrent(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 transition-colors ${active ? "bg-white/14 text-white shadow-sm" : "hover:bg-white/10 hover:text-white"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <Link
              href="/cart"
              aria-current={isCurrent("/cart") ? "page" : undefined}
              aria-label={cartAriaLabel(cartCount)}
              className={`relative grid size-10 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold ${isCurrent("/cart") ? "bg-white/14 text-white shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
            >
              <ShoppingBag className="size-4.5" aria-hidden="true" />
              {/* Decorative: the count is already in the link's accessible name above. */}
              {cartBadge && (
                <span
                  aria-hidden="true"
                  className={BADGE_CLASS}
                >
                  {cartBadge}
                </span>
              )}
            </Link>
            <Link
              href="/notifications"
              aria-current={isCurrent("/notifications") ? "page" : undefined}
              aria-label={notificationAriaLabel(unreadCount)}
              className={`relative grid size-10 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold ${isCurrent("/notifications") ? "bg-white/14 text-white shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
            >
              <Bell className="size-4.5" aria-hidden="true" />
              {/*
                Decorative: the count is already in the link's accessible name, so a screen reader
                is not told the number twice and the red dot is never the only signal.
              */}
              {unreadBadge && (
                <span
                  aria-hidden="true"
                  className={BADGE_CLASS}
                >
                  {unreadBadge}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              aria-current={isCurrent("/profile") ? "page" : undefined}
              aria-label="View profile"
              className={`grid size-10 place-items-center rounded-xl transition-colors ${isCurrent("/profile") ? "bg-white/14 text-white shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
            >
              <UserRound className="size-4.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <OfflineNotice />

      <div id="campuswear-main" tabIndex={-1} className="outline-none">
        {children}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
        aria-label="Student navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobileItems.map(item => {
            const Icon = item.icon;
            const active = isCurrent(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${active ? "bg-secondary text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
