import { Link } from "wouter";
import { CampusWearMark } from "@/components/campuswear/BrandMark";

/**
 * Public footer.
 *
 * Four real routes and nothing else. No invented social accounts, no invented contact addresses,
 * no newsletter box — a university service footer earns trust by not padding itself.
 */

const LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Announcements", href: "/announcements" },
  { label: "Orders", href: "/orders" },
  { label: "Apply as a vendor", href: "/vendor/apply" },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <Link href="/" aria-label="CampusWear home" className="inline-flex items-center gap-2.5 rounded-edge">
          <CampusWearMark variant="color" className="size-8 shrink-0" title="" />
          <span className="leading-none">
            <span className="block text-sm font-extrabold uppercase tracking-[0.02em] text-primary">CampusWear</span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.17em] text-campus-blue">
              University of Cebu
            </span>
          </span>
        </Link>

        <nav className="-my-2 flex flex-wrap gap-x-7" aria-label="Footer navigation">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              /* Standalone nav targets, not links inline in a sentence, so WCAG 2.5.8's inline
                 exception does not apply — they carry a real 44px target on a phone. */
              className="inline-flex min-h-11 items-center text-[13px] font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <p className="container py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} CampusWear · University of Cebu. Your Uniform. Your Identity.
        </p>
      </div>
    </footer>
  );
}
