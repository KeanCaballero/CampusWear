import { MapPin, Store } from "lucide-react";

/**
 * Pickup information, set like campus building signage.
 *
 * Deliberately shows ONLY what the student-facing data model actually exposes: the store name,
 * which comes from the public catalogue. Street address and opening hours are NOT available to a
 * student today — `vendors.pickup_location` is not returned by `get_public_catalog`, and there is
 * no hours column at all — so this renders an honest placeholder instead of inventing values.
 *
 * When that data is exposed later, add it here; nothing else needs to change.
 */
export function PickupPlaque({ storeNames, compact = false }: { storeNames: string[]; compact?: boolean }) {
  const heading = storeNames.length ? storeNames.join(" · ") : "Your school's authorized store";

  return (
    <div className={`rounded-xl border border-border border-l-4 border-l-primary bg-muted/50 ${compact ? "p-3" : "p-4"}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Store className="size-3.5" aria-hidden="true" />
        Collecting from
      </p>
      <p className={`mt-1.5 font-extrabold tracking-[-0.02em] ${compact ? "text-sm" : "text-[15px]"}`}>{heading}</p>

      <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">Pickup details will be shown once the store confirms your request.</span>
      </p>
    </div>
  );
}
