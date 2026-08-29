import { Link } from "wouter";

/**
 * Official CampusWear identity — a structured polo silhouette on a shield hem.
 * Geometry taken verbatim from the supplied "CampusWear Logo System" (64×64 artboard).
 *
 * Body outline + collar knockout. The collar/placket is painted separately so it can carry
 * the blue accent, and the two gold buttons sit on the placket.
 */
const MARK_BODY =
  "M17.5 15.8L24.5 13L26.8 10.8L32 12.9L37.2 10.8L39.5 13L46.5 15.8L57 21.5L51.5 33.5L45.5 30.5L45.5 53.5L18.5 53.5L18.5 30.5L12.5 33.5L7 21.5ZM22.8 15.4L32 27.2L41.2 15.4L37.6 14.1L32 22.2L26.4 14.1ZM30 24L34 24L34 38L30 38Z";
const MARK_COLLAR = "M22.8 15.4L32 27.2L41.2 15.4L37.6 14.1L32 22.2L26.4 14.1ZM30 24L34 24L34 38L30 38Z";

const NAVY = "#0F2747";
const BLUE = "#2563EB";
const GOLD = "#F4B942";

/** The three approved lockups from the logo system. */
export type CampusWearMarkVariant = "color" | "reversed" | "mono";

/**
 * - `color`    full colour: navy body, blue placket, gold buttons (light surfaces)
 * - `reversed` knockout: white body, gold buttons (dark/navy surfaces)
 * - `mono`     single colour via `currentColor`, no accents (stamps, print, inherited colour)
 */
export function CampusWearMark({
  variant = "color",
  className = "",
  title = "CampusWear",
}: {
  variant?: CampusWearMarkVariant;
  className?: string;
  title?: string;
}) {
  const body = variant === "reversed" ? "#FFFFFF" : variant === "mono" ? "currentColor" : NAVY;

  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      <path d={MARK_BODY} fill={body} fillRule="evenodd" stroke={body} strokeWidth={0.9} strokeLinejoin="round" />
      {variant === "color" && <path d={MARK_COLLAR} fill={BLUE} stroke={BLUE} strokeWidth={0.7} strokeLinejoin="round" />}
      {variant !== "mono" && (
        <>
          <circle cx={32} cy={29} r={1.15} fill={GOLD} />
          <circle cx={32} cy={34.2} r={1.15} fill={GOLD} />
        </>
      )}
    </svg>
  );
}

export function BrandMark({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="CampusWear home"
      className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CampusWearMark variant={light ? "reversed" : "color"} className="size-9 shrink-0" />
      {!compact && (
        <span className="leading-none">
          <span className={`block text-[15px] font-extrabold uppercase tracking-[0.005em] ${light ? "text-primary-foreground" : "text-primary"}`}>
            CampusWear
          </span>
          <span className={`mt-1.5 block text-[8px] font-semibold uppercase tracking-[0.17em] ${light ? "text-blue-200" : "text-campus-blue"}`}>
            Your Uniform. Your Identity.
          </span>
        </span>
      )}
    </Link>
  );
}
