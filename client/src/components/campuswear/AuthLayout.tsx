import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronLeft, GraduationCap, ShieldCheck, Store } from "lucide-react";
import { CampusWearMark } from "@/components/campuswear/BrandMark";

/**
 * The shell every signed-out account screen sits in: sign in, create account, password recovery,
 * password reset, and email confirmation.
 *
 * One shell rather than four hand-built pages is the point. Before this, each auth screen invented
 * its own frame — a centred card here, a split panel there, a different background on the third —
 * so moving between them felt like leaving the product. They now share a single composition, and
 * the differences between them are only the words and the form.
 *
 * The brand panel is hidden below lg because a 375px phone should spend its height on the form,
 * not on decoration. The mark is rendered bare, never wrapped in a link: the page already has a
 * "Back to home" anchor, and nesting one anchor inside another is invalid markup that
 * authMarkup.test.ts checks for.
 */

const ROLES = [
  [GraduationCap, "Students", "Check availability and track pickup requests."],
  [Store, "Authorized vendors", "Manage size-level stock and order fulfilment."],
  [ShieldCheck, "School teams", "Oversee authorized campus operations."],
] as const;

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-center" aria-label="About CampusWear">
          <div className="campus-grid pointer-events-none absolute inset-0 opacity-55" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-md px-12 py-16">
            <CampusWearMark variant="color" className="size-24" title="" />

            <span className="uc-rule mt-9" aria-hidden="true" />
            <h2 className="mt-6 text-[2.05rem] font-extrabold leading-[1.1] tracking-[-0.035em] text-primary">
              Your Uniform.
              <br />
              Your Identity.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              The official CampusWear portal for the University of Cebu. One account for availability,
              pickup progress, and the workspace your role allows.
            </p>

            <ul className="mt-10 space-y-5 border-t border-border pt-8">
              {ROLES.map(([Icon, title, detail]) => (
                <li key={title} className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-edge bg-secondary text-primary" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-foreground">{title}</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex min-h-dvh flex-col px-5 py-5 sm:px-8 lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back to home
            </Link>
            <span className="inline-flex items-center gap-2 lg:hidden">
              <CampusWearMark variant="color" className="size-7 shrink-0" title="" />
              <span className="text-[13px] font-extrabold uppercase tracking-[0.02em] text-primary">CampusWear</span>
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10">
            <div className="w-full campus-fade-in">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
