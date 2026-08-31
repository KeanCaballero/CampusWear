import { MapPin, Store } from "lucide-react";
import type { StorePickupLocation } from "@/lib/supabaseCatalog";

/**
 * Pickup information, set like campus building signage.
 *
 * Shows the store's OWN declared collection point (`vendors.pickup_location`), which is real data
 * the vendor maintains in their workspace — not a guess and not a placeholder. Street address and
 * opening hours are still not shown, because no such column exists anywhere in the schema.
 *
 * When locations are not resolvable (an unmatched store name, an unreadable vendor row) the
 * component says only what remains true, rather than inventing a location.
 */
export function PickupPlaque({
  storeNames,
  locations = [],
  compact = false,
}: {
  storeNames: string[];
  locations?: StorePickupLocation[];
  compact?: boolean;
}) {
  const heading = storeNames.length ? storeNames.join(" · ") : "Your school's authorized store";
  const distinct = Array.from(new Set(locations.map(entry => entry.pickupLocation)));

  return (
    <div className={`rounded-xl border border-border border-l-4 border-l-primary bg-muted/50 ${compact ? "p-3" : "p-4"}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Store className="size-3.5" aria-hidden="true" />
        Collecting from
      </p>
      <p className={`mt-1.5 font-extrabold tracking-[-0.02em] ${compact ? "text-sm" : "text-[15px]"}`}>{heading}</p>

      {distinct.length === 1 ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            Collect at <strong className="font-bold text-foreground">{distinct[0]}</strong>. The store confirms when your
            order is ready.
          </span>
        </p>
      ) : distinct.length > 1 ? (
        <ul className="mt-1.5 space-y-1">
          {locations.map(entry => (
            <li key={`${entry.vendorName}-${entry.pickupLocation}`} className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                {entry.vendorName}: <strong className="font-bold text-foreground">{entry.pickupLocation}</strong>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">The store confirms the collection point when your order is ready.</span>
        </p>
      )}
    </div>
  );
}
