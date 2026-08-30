import type { ReactNode } from "react";
import { WorkspacePanel } from "./WorkspacePanel";

/**
 * A single read-only statistic: the value, then its label.
 *
 * Scope note — this consolidates the three literally-copied stat tiles on Reports. It deliberately
 * does NOT absorb the other numeric tiles in the workspace, because they are different
 * presentations rather than duplicates of this one:
 *
 * - Vendor Dashboard's four tiles are navigation `Link`s with an icon chip, the label ABOVE the
 *   value, a hover affordance, and a destructive emphasis border.
 * - Vendor Inventory's two tiles put an icon beside a label/value pair, and one of them is
 *   deliberately gold-tinted rather than a default panel.
 *
 * Folding those into this component would mean redesigning those pages, which Phase 1 excludes.
 * The presentation below matches the existing Reports tiles exactly.
 */
const TONE = {
  default: "",
  primary: "text-primary",
  warning: "text-amber-700",
} as const;

export type MetricCardTone = keyof typeof TONE;

export function MetricCard({
  value,
  label,
  tone = "default",
}: {
  /** Already-formatted value. This component performs no calculation and invents no data. */
  value: ReactNode;
  label: string;
  tone?: MetricCardTone;
}) {
  const valueClasses = ["text-2xl font-extrabold tracking-[-0.05em]", TONE[tone]].filter(Boolean).join(" ");

  return (
    <WorkspacePanel as="article">
      <p className={valueClasses}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </WorkspacePanel>
  );
}
