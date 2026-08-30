import type { ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * The vendor workspace's panel shell.
 *
 * This is deliberately thin: it applies the EXISTING `campus-panel` utility that the student and
 * platform surfaces already use, so the vendor workspace stops being the only area with a
 * hand-rolled `rounded-xl border border-border bg-card` shell. It introduces no new design
 * language, colours, or radii of its own.
 *
 * One constraint worth knowing before adding props: `.campus-panel` is declared UNLAYERED in
 * index.css, and unlayered rules outrank every layered Tailwind utility in v4. It sets `border`,
 * `border-radius`, `background`, and `box-shadow`, so a caller CANNOT override any of those four
 * with a Tailwind class on the same element — the utility is silently discarded. Use
 * `interactive` for hover treatment rather than a bespoke `hover:shadow-*`, and keep an element
 * off this component entirely when it genuinely needs its own border or background.
 */
const PADDING = {
  /** For panels that own their internal spacing — dividers, tables, edge-to-edge media. */
  none: "",
  compact: "p-4",
  default: "p-5",
  comfortable: "p-5 sm:p-6",
  spacious: "p-5 sm:p-7",
} as const;

export type WorkspacePanelPadding = keyof typeof PADDING;

export interface WorkspacePanelProps extends HTMLAttributes<HTMLElement> {
  /** Rendered element. Defaults to `div`; pass `section`/`article` to keep page semantics. */
  as?: ElementType;
  padding?: WorkspacePanelPadding;
  /** Adds the existing `campus-panel-interactive` hover treatment. */
  interactive?: boolean;
  children?: ReactNode;
}

export function WorkspacePanel({
  as: Tag = "div",
  padding = "default",
  interactive = false,
  className = "",
  children,
  ...rest
}: WorkspacePanelProps) {
  const classes = ["campus-panel", interactive ? "campus-panel-interactive" : "", PADDING[padding], className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
