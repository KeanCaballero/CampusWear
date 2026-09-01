import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampusWearMark } from "@/components/campuswear/BrandMark";

/**
 * Public navigation: a solid navy band, not a translucent floating pill.
 *
 * The bar carries the real CampusWear mark rather than a stock mortarboard glyph — this is the one
 * place every visitor looks to learn whose service this is, so a generic icon there is a wasted
 * introduction. `reversed` is the approved lockup for dark surfaces.
 *
 * Every destination is a route that exists. /shop and /announcements are genuinely public — they
 * are not in StudentShell's requiresAccount list — so a signed-out visitor who follows them lands
 * on real content rather than a sign-in wall.
 */

const LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "How it works", href: "#how-it-works", inPage: true },
  { label: "Announcements", href: "/announcements" },
] as const;

export function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-primary text-primary-foreground">
      <div className="container flex h-16 items-center justify-between gap-4 sm:h-18">
        <Link
          href="/"
          aria-label="CampusWear home"
          className="inline-flex items-center gap-2.5 rounded-edge focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-gold"
        >
          <CampusWearMark variant="reversed" className="size-8 shrink-0" title="" />
          <span className="leading-none">
            <span className="block text-[15px] font-extrabold uppercase tracking-[0.02em]">CampusWear</span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.17em] text-blue-200">
              University of Cebu
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Public navigation">
          {LINKS.map(link =>
            /* An in-page jump stays a plain anchor: routing it through wouter would push a history
               entry for a scroll position. */
            "inPage" in link ? (
              <a
                key={link.href}
                href={link.href}
                /* min-h-11 gives a real touch target inside the 64px bar. Height only — adding width here
                   is what overflowed the header in an earlier pass. */
                className="inline-flex min-h-11 items-center text-[13px] font-bold tracking-[0.02em] text-blue-100 transition-colors hover:text-primary-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                /* min-h-11 gives a real touch target inside the 64px bar. Height only — adding width here
                   is what overflowed the header in an earlier pass. */
                className="inline-flex min-h-11 items-center text-[13px] font-bold tracking-[0.02em] text-blue-100 transition-colors hover:text-primary-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="hidden rounded-edge bg-campus-gold px-5 font-bold text-primary hover:bg-campus-gold/90 md:inline-flex"
          >
            <Link href="/auth">Sign in</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            aria-expanded={open}
            aria-controls="public-nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center rounded-edge text-primary-foreground transition-colors hover:bg-white/10 md:hidden"
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Rendered only when open, so the links are not reachable by keyboard while hidden. */}
      {open && (
        <div id="public-nav-menu" className="border-t border-white/10 md:hidden">
          <nav className="container flex flex-col py-2" aria-label="Public navigation">
            {LINKS.map(link =>
              "inPage" in link ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-edge text-sm font-bold text-blue-100 transition-colors hover:text-primary-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-edge text-sm font-bold text-blue-100 transition-colors hover:text-primary-foreground"
                >
                  {link.label}
                </Link>
              ),
            )}
            <Button asChild className="my-3 min-h-12 rounded-edge bg-campus-gold font-bold text-primary hover:bg-campus-gold/90">
              <Link href="/auth" onClick={() => setOpen(false)}>Sign in</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
