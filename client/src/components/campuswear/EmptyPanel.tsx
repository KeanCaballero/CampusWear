import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyPanel({ title, detail, action }: { title: string; detail: string; action?: { label: string; onClick: () => void } }) {
  return <div className="campus-panel px-6 py-11 text-center sm:px-10"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary shadow-sm"><PackageOpen className="size-5" aria-hidden="true" /></span><h2 className="mt-4 text-lg font-extrabold tracking-[-0.025em]">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>{action && <Button className="mt-6 min-h-11" onClick={action.onClick}>{action.label}</Button>}</div>;
}
