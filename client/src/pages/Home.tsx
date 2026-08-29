import { BrandMark } from "@/components/campuswear/BrandMark";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ClipboardList, PackageCheck, SearchCheck, ShieldCheck, Store, Truck } from "lucide-react";
import { Link } from "wouter";

const studentJourney = [
  { icon: SearchCheck, title: "Check availability", text: "See live size availability before you make the trip." },
  { icon: PackageCheck, title: "Request pickup", text: "Reserve the items you need and share a pickup preference." },
  { icon: Truck, title: "Track progress", text: "Follow preparation and know exactly when to collect your order." },
];

const vendorCapabilities = [
  ["Size-level inventory", "Keep each product size accurate and easy to review."],
  ["Order fulfillment", "Move requests from pending to ready for pickup."],
  ["Campus updates", "Share practical announcements with students in one place."],
  ["Approval-led access", "Vendor tools activate only after administrator review."],
] as const;

export default function Home() {
  return (
    <div className="min-h-dvh overflow-hidden bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="container flex min-h-18 items-center justify-between gap-4 py-2">
          <BrandMark />
          <nav className="hidden items-center gap-1 text-sm font-bold text-muted-foreground md:flex" aria-label="Marketing navigation">
            <a href="#how-it-works" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-primary">How it works</a>
            <a href="#vendors" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-primary">For vendors</a>
            <Link href="/shop" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-primary">Browse catalog</Link>
          </nav>
          <Button asChild size="sm" variant="outline" className="border-primary/20 bg-card text-primary hover:bg-secondary">
            <Link href="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-border bg-card">
          <div className="campus-grid absolute inset-0 -z-20 opacity-65" />
          <div className="absolute -right-24 top-12 -z-10 size-80 rounded-full bg-secondary" />
          <div className="absolute -bottom-32 left-[37%] -z-10 size-72 rotate-12 rounded-[3rem] bg-[rgb(244_185_66/0.19)]" />
          <div className="container grid min-h-[570px] items-center gap-10 py-14 lg:grid-cols-[1.06fr_0.94fr] lg:gap-14 lg:py-24">
            <div className="max-w-2xl campus-fade-in">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-card/90 px-3 py-1.5 text-xs font-extrabold text-primary shadow-sm">
                <span className="size-1.5 rounded-full bg-campus-gold" aria-hidden="true" />
                OFFICIAL CAMPUS COMMERCE
              </p>
              <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.04] tracking-[-0.065em] text-foreground sm:text-5xl lg:text-6xl">Your Uniform. Your Identity.</h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">Your official school uniform store. Check availability, choose a size, and request pickup before you go to campus.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full gap-2 px-6 sm:w-auto">
                  <Link href="/shop">Browse uniforms <ArrowRight className="size-4" aria-hidden="true" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full border-border bg-card px-6 sm:w-auto">
                  <Link href="/vendor/apply">Apply as a vendor</Link>
                </Button>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-700" aria-hidden="true" />Live size-level availability</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-700" aria-hidden="true" />Pickup-first, no online payment</span>
              </div>
            </div>

            <aside className="campus-panel surface-shadow relative mx-auto w-full max-w-md p-4 sm:p-5" aria-label="CampusWear availability overview">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="campus-eyebrow">YOUR CAMPUS STORE</p>
                  <p className="mt-1 text-sm font-extrabold">Ready before your visit</p>
                </div>
                <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Store className="size-5" aria-hidden="true" /></span>
              </div>
              <div className="mt-4 rounded-xl border border-primary/10 bg-secondary/75 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-card text-primary shadow-sm"><SearchCheck className="size-5" aria-hidden="true" /></span>
                <h2 className="mt-4 text-lg font-extrabold tracking-[-0.03em]">Availability you can act on.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Authorized vendors publish actual products and size availability. Students see a current status, not a stock estimate.</p>
              </div>
              <div className="mt-4 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                <p className="text-sm font-bold">Clear price, size, stock, and pickup information in one place.</p>
              </div>
            </aside>
          </div>
        </section>

        <section id="how-it-works" className="container py-16 sm:py-20">
          <div className="max-w-xl">
            <p className="campus-eyebrow">FOR STUDENTS</p>
            <h2 className="mt-3 campus-page-title">A clearer route from browsing to pickup.</h2>
            <p className="mt-4 campus-page-copy">CampusWear focuses on the details students need before leaving for a uniform: current availability, the right size, and the pickup status.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {studentJourney.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="campus-panel campus-panel-interactive p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                  <p className="mt-5 text-xs font-extrabold tracking-[0.1em] text-muted-foreground">0{index + 1}</p>
                  <h3 className="mt-2 text-lg font-extrabold tracking-[-0.03em]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="vendors" className="border-y border-border bg-secondary/40">
          <div className="container grid gap-10 py-16 md:grid-cols-[0.9fr_1.1fr] md:items-center sm:py-20">
            <div>
              <p className="campus-eyebrow">FOR AUTHORIZED VENDORS</p>
              <h2 className="mt-3 campus-page-title">Keep the campus store in sync with demand.</h2>
              <p className="mt-5 campus-page-copy">Apply with real business and pickup details. A CampusWear platform administrator reviews every vendor application before any staff access is granted.</p>
              <Button asChild className="mt-7 gap-2">
                <Link href="/vendor/apply">Apply as a vendor <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {vendorCapabilities.map(([title, text]) => (
                <div key={title} className="campus-panel p-5">
                  <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-extrabold tracking-[-0.02em]">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="container flex flex-col gap-2 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} CampusWear · Your Uniform. Your Identity.</p><p>Built for schools, students, and authorized vendors.</p></footer>
    </div>
  );
}
