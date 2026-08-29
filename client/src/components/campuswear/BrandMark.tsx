import { Landmark } from "lucide-react";
import { Link } from "wouter";

export function BrandMark({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link href="/" aria-label="CampusWear home" className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={`relative grid size-10 place-items-center rounded-xl shadow-sm ring-1 ${light ? "bg-white text-primary ring-white/70" : "bg-primary text-primary-foreground ring-primary/15"}`}>
        <Landmark className="size-5" aria-hidden="true" />
        <span className="absolute bottom-1 right-1 size-1.5 rounded-full bg-campus-gold" aria-hidden="true" />
      </span>
      {!compact && (
        <span className={`leading-none ${light ? "text-primary-foreground" : ""}`}>
          <span className="block text-[15px] font-extrabold tracking-[-0.05em]"><span className="font-extrabold">Campus</span><span className="font-semibold">Wear</span></span>
          <span className={`mt-1 block text-[9px] font-bold tracking-[0.11em] ${light ? "text-blue-100" : "text-muted-foreground"}`}>YOUR UNIFORM. YOUR IDENTITY.</span>
        </span>
      )}
    </Link>
  );
}
