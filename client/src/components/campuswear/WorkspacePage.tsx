import type { ReactNode } from "react";
import { PageIntro } from "./PageIntro";

/**
 * The vendor workspace's page shell: one content container plus the shared PageIntro header.
 *
 * Before this, every vendor page picked its own container — `max-w-[1280px]`, `max-w-7xl`,
 * `max-w-6xl`, `max-w-3xl` — and two pages hand-rolled a page title instead of using PageIntro,
 * with a fixed `text-3xl` that did not scale like `campus-page-title`'s fluid clamp.
 *
 * Only the container and the header live here. Every page keeps its own query state, branching,
 * and body spacing, so no page-specific logic is hidden behind this component.
 */
const WIDTH = {
  /** ~1280px — the working surface for tables, catalogues, and multi-column layouts. */
  wide: "max-w-7xl",
  /** ~768px — deliberately narrow, for single-column reading and short forms. */
  narrow: "max-w-3xl",
} as const;

export type WorkspacePageWidth = keyof typeof WIDTH;

export function WorkspacePage({
  width = "wide",
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  width?: WorkspacePageWidth;
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${WIDTH[width]}`}>
      <PageIntro eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}
