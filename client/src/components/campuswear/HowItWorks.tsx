import { CircleCheck, ClipboardList, PackageSearch, Ruler, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The five steps CampusWear actually performs, in the order they happen.
 *
 * Numbered because the order is real and load-bearing: a student cannot track before ordering, or
 * collect before the store marks the order ready. Every step names something the product genuinely
 * does — nothing here promises delivery, payment online, or scheduling that does not exist.
 *
 * "Collect" is used rather than "pick up" as the verb, matching the terminology already used in the
 * cart, order history and pickup plaque.
 */

const STEPS: Array<{ icon: LucideIcon; title: string; detail: string }> = [
  { icon: PackageSearch, title: "Browse", detail: "Find the uniforms and campus essentials your school's authorized vendors have published." },
  { icon: Ruler, title: "Choose", detail: "Pick your size and quantity, with live availability shown before you commit." },
  { icon: ClipboardList, title: "Order", detail: "Send a pickup request to the store. Nothing is paid online." },
  { icon: Store, title: "Track", detail: "Follow the status as the store confirms, prepares, and readies your order." },
  { icon: CircleCheck, title: "Collect", detail: "Show your order number at the counter and collect it." },
];

export function HowItWorks({ className = "" }: { className?: string }) {
  return (
    <section className={className} aria-labelledby="how-campuswear-works">
      <h2 id="how-campuswear-works" className="text-lg font-extrabold tracking-[-0.03em]">How CampusWear works</h2>
      <p className="mt-1 text-sm text-muted-foreground">From finding your uniform to collecting it at the counter.</p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary" aria-hidden="true">
                  <Icon className="size-4" />
                </span>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {/* The digit is decorative; the ordered list already conveys sequence. */}
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                </span>
              </div>
              <p className="mt-3 text-sm font-extrabold">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
