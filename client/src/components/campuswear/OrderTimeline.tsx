import { Check } from "lucide-react";
import React from "react";
import { OrderStatus } from "../../../../server/campuswear/domain";

const stages: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Order placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = stages.findIndex(stage => stage.value === status);
  const isTerminal = status === "cancelled" || status === "rejected";
  return (
    <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-5 sm:gap-1" aria-label={isTerminal ? `Order ${status}` : "Order progress"}>
      {stages.map((stage, index) => {
        const complete = !isTerminal && index < currentIndex;
        const current = !isTerminal && index === currentIndex;
        return <li key={stage.value} className="relative flex min-w-0 items-start gap-3 sm:block sm:pr-1" aria-current={current ? "step" : undefined}>
          {index < stages.length - 1 && <span aria-hidden="true" className={`absolute left-3 top-7 hidden h-px w-[calc(100%-24px)] sm:block ${complete ? "bg-primary" : "bg-border"}`} />}
          <span className={`relative grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${complete ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`} aria-hidden="true">
            {complete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
          </span>
          <p className={`pt-1 text-xs font-semibold leading-5 sm:pt-2 ${current ? "text-foreground" : "text-muted-foreground"}`}><span className="sr-only">{current ? "Current step: " : complete ? "Completed step: " : "Upcoming step: "}</span>{stage.label}</p>
        </li>;
      })}
    </ol>
  );
}
