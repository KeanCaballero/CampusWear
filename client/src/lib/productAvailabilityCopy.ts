import type { Availability } from "@/lib/supabaseCatalog";

export function catalogAvailabilitySummary(size: string | undefined, availableCount: number) {
  const sizeCopy = size ? `Size ${size} · ` : "";
  return `${sizeCopy}${availableCount} size${availableCount === 1 ? "" : "s"} available`;
}

export function selectedVariantAvailabilityCopy(size: string | undefined, availability: Availability | undefined) {
  const sizeCopy = size ? `Size ${size}` : "This size";
  if (availability === "in_stock") return `${sizeCopy} is available for pickup.`;
  if (availability === "low_stock") return `${sizeCopy} has limited availability — request soon.`;
  return `${sizeCopy} is currently unavailable.`;
}
