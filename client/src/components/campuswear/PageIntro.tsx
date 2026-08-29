import { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="campus-eyebrow">{eyebrow}</p>
        <h1 className="mt-2 campus-page-title">{title}</h1>
        {description && <p className="mt-3 campus-page-copy">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
