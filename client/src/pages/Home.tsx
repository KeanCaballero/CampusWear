import { Link } from "wouter";
import { ArrowRight, CheckCircle2, ClipboardList, PackageSearch, QrCode, Ruler, ScanLine, ShieldCheck, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampusWearMark } from "@/components/campuswear/BrandMark";
import { PublicFooter } from "@/components/campuswear/PublicFooter";
import { PublicNav } from "@/components/campuswear/PublicNav";

/**
 * The public landing page for University of Cebu CampusWear.
 *
 * Every claim on this page is something the product actually does. There are no student counts, no
 * order volumes, no testimonials, no partner logos and no campus statistics, because CampusWear has
 * none of those to report and a university service that invents them is worth less, not more.
 *
 * The visual language is deliberately institutional rather than startup: a solid navy band instead
 * of a translucent floating header, hairline rules instead of drop shadows, and near-square corners
 * (--radius-edge) instead of the workspace's 14px pills. The hero visual is the CampusWear mark
 * itself rather than a stock photograph — it is the real asset, and no image had to be invented.
 */

/** What a student can do here, in the order they encounter it. Matches the workspace's own wording. */
const CAPABILITIES = [
  { icon: PackageSearch, label: "Know what's available" },
  { icon: Store, label: "Order for pickup" },
  { icon: Truck, label: "Track your order" },
  { icon: QrCode, label: "QR pickup" },
] as const;

/**
 * The five steps CampusWear performs, in the order they happen. Kept word-for-word in step with
 * the workspace's own HowItWorks panel, so the promise a visitor reads matches what a student sees
 * after signing in.
 */
const STEPS = [
  { icon: PackageSearch, title: "Browse", detail: "Find the uniforms and campus essentials your school's authorized vendors have published." },
  { icon: Ruler, title: "Choose your size", detail: "Pick your size and quantity, with live availability shown before you commit." },
  { icon: ClipboardList, title: "Order", detail: "Send a pickup request to the store. Nothing is paid online." },
  { icon: Truck, title: "Track", detail: "Follow the status as the store confirms, prepares, and readies your order." },
  { icon: CheckCircle2, title: "Collect", detail: "Show your code at the counter and collect it." },
] as const;

const PICKUP_FLOW = [
  "Your order gets a pickup code and a QR you can save to your phone.",
  "At the counter, the CampusWear vendor scans it to pull up your order.",
  "The vendor checks the items against your order, then confirms the handover.",
] as const;

const VENDOR_TOOLS = ["Products", "Inventory", "Orders", "Announcements", "Reports", "QR pickup"] as const;

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicNav />

      <main>
        {/* ---------------------------------------------------------------- Hero */}
        <section className="border-b border-border bg-card">
          <div className="container grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
            <div className="campus-fade-in">
              <p className="uc-eyebrow text-campus-blue">
                <span className="size-1.5 rounded-full bg-campus-gold" aria-hidden="true" />
                University of Cebu · CampusWear
              </p>
              <h1 className="uc-display mt-5 max-w-xl text-primary">
                Your Uniform.
                <br />
                Your Identity.
              </h1>
              <p className="mt-6 max-w-lg text-[17px] leading-8 text-muted-foreground">
                Find your university uniforms and campus merchandise, check availability, order for
                pickup, and track your order in one place.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-h-12 w-full rounded-edge px-7 sm:w-auto">
                  <Link href="/shop">
                    Browse uniforms <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 w-full rounded-edge border-primary/25 bg-card px-7 text-primary sm:w-auto"
                >
                  <a href="#how-it-works">How it works</a>
                </Button>
              </div>

              <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5 text-[13px] font-semibold text-muted-foreground">
                <li className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-campus-blue" aria-hidden="true" />
                  Live size-level availability
                </li>
                <li className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-campus-blue" aria-hidden="true" />
                  Pickup-first, no online payment
                </li>
              </ul>
            </div>

            {/* The mark is the hero image. No stock photography was invented for this page. */}
            <div className="relative w-full">
              <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-edge border border-border bg-background">
                <div className="campus-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
                <div className="relative flex flex-col items-center px-8 text-center">
                  <CampusWearMark variant="color" className="size-28 sm:size-36" title="" />
                  <p className="mt-7 text-lg font-extrabold uppercase tracking-[0.13em] text-primary sm:text-xl">
                    CampusWear
                  </p>
                  <span className="uc-rule mt-4" aria-hidden="true" />
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.19em] text-campus-blue">
                    University of Cebu
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- Capability strip */}
        <section className="border-b border-border bg-background" aria-label="What CampusWear does">
          <ul className="container grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3.5 py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <Icon className="size-6 shrink-0 text-campus-blue" aria-hidden="true" />
                <span className="text-sm font-extrabold text-primary">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------------- How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-card">
          <div className="container py-16 lg:py-20">
            <div className="max-w-2xl">
              <span className="uc-rule" aria-hidden="true" />
              <h2 className="uc-section-title mt-5 text-primary">From browsing to collecting.</h2>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Five steps, and nothing hidden between them. You will know what is in stock before you
                travel, and where your order stands after you place it.
              </p>
            </div>

            <ol className="mt-12 grid gap-px border-t border-border sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="border-b border-border pb-7 pt-7 lg:border-b-0 lg:pr-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-edge bg-secondary text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      {/* The ordered list already conveys sequence; the numeral is decoration. */}
                      <span aria-hidden="true" className="text-xs font-extrabold tabular-nums tracking-[0.1em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-extrabold text-primary">{step.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{step.detail}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ QR pickup */}
        <section className="border-b border-border bg-background">
          <div className="container grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
            <div className="order-2 lg:order-1">
              <div className="rounded-edge border border-border bg-card p-7 sm:p-9">
                <p className="uc-eyebrow text-campus-blue">
                  <ScanLine className="size-3.5" aria-hidden="true" />
                  At the counter
                </p>
                <ol className="mt-7 space-y-6">
                  {["Save your QR", "Vendor scans it", "Vendor confirms pickup"].map((label, index) => (
                    <li key={label} className="flex items-center gap-4">
                      <span
                        aria-hidden="true"
                        className="grid size-10 shrink-0 place-items-center rounded-edge border border-border bg-background text-sm font-extrabold tabular-nums text-primary"
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-extrabold text-primary">{label}</span>
                      {index < 2 && <span className="ml-auto h-px flex-1 bg-border" aria-hidden="true" />}
                    </li>
                  ))}
                </ol>
                <p className="mt-8 border-t border-border pt-6 text-[13px] leading-6 text-muted-foreground">
                  You can save the QR image to your phone and it will still open with no connection.
                  Verifying the order is the vendor's step, and that one needs the network.
                </p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="uc-rule" aria-hidden="true" />
              <h2 className="uc-section-title mt-5 text-primary">Pickup without the queue.</h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Every confirmed order carries a pickup code and a QR. The CampusWear vendor scans it,
                checks the items, and confirms the handover on the spot.
              </p>
              <ul className="mt-7 space-y-3.5">
                {PICKUP_FLOW.map(item => (
                  <li key={item} className="flex gap-3 text-[15px] leading-7 text-foreground">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-campus-gold" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- Vendors */}
        <section className="border-b border-border bg-card">
          <div className="container grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
            <div>
              <span className="uc-rule" aria-hidden="true" />
              <h2 className="uc-section-title mt-5 text-primary">For authorized vendors.</h2>
              <p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
                Apply with real business and pickup details. A CampusWear platform administrator
                reviews every application before any staff access is granted.
              </p>
              <Button asChild className="mt-7 min-h-12 rounded-edge px-7">
                <Link href="/vendor/apply">
                  Apply as a vendor <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <ul className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
              {VENDOR_TOOLS.map(tool => (
                <li key={tool} className="flex items-center gap-2.5 bg-card px-5 py-6">
                  <ShieldCheck className="size-4 shrink-0 text-campus-blue" aria-hidden="true" />
                  <span className="text-[13px] font-extrabold text-primary">{tool}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------ Final CTA */}
        <section className="bg-primary text-primary-foreground">
          <div className="container flex flex-col items-center py-16 text-center lg:py-20">
            <h2 className="uc-section-title max-w-xl">Ready to find your next uniform?</h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-blue-100">
              Check what is in stock, reserve your size, and collect it at the CampusWear counter.
            </p>
            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className="min-h-12 w-full rounded-edge bg-campus-gold px-7 font-bold text-primary hover:bg-campus-gold/90 sm:w-auto">
                <Link href="/shop">Shop CampusWear</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-12 w-full rounded-edge border-white/30 bg-transparent px-7 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto"
              >
                <Link href="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
