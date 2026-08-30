import { Shirt } from "lucide-react";
import { useState } from "react";

const palettes = ["bg-[#dce9f8] text-[#244a76]", "bg-[#f5e3e5] text-[#7b4550]", "bg-[#e7efe6] text-[#3c6248]", "bg-[#f4ead8] text-[#87632e]"];

/**
 * A product's picture, with the CampusWear placeholder as its fallback.
 *
 * A stored image can disappear from the bucket while the product still references it — verified in
 * production, where a real product's image 404s (`naturalWidth: 0`). Branching on `imageUrl` alone
 * is not enough: the URL is truthy, so the <img> rendered and the browser painted an empty box.
 * A failed load is therefore treated exactly like a missing image.
 *
 * The failed URL is remembered rather than a boolean flag, so the component recovers on its own
 * when it is handed a different image (list virtualisation, navigating between products) without
 * needing an effect to reset it.
 */
export function ProductVisual({ name, imageUrl, index = 0, className = "" }: { name: string; imageUrl?: string | null; index?: number; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const isBroken = Boolean(imageUrl) && failedUrl === imageUrl;

  if (imageUrl && !isBroken) {
    return <img src={imageUrl} alt={name} className={`object-cover ${className}`} loading="lazy" onError={() => setFailedUrl(imageUrl)} />;
  }

  return (
    <div className={`relative grid place-items-center overflow-hidden ${palettes[index % palettes.length]} ${className}`} aria-label={`${name} visual placeholder`}>
      <div className="absolute -left-5 -top-4 size-24 rounded-full bg-white/30" />
      <div className="absolute -bottom-10 -right-7 size-28 rotate-12 rounded-3xl bg-white/35" />
      <Shirt className="relative size-16 stroke-[1.25]" aria-hidden="true" />
      <span className="absolute bottom-3 left-3 rounded bg-white/70 px-2 py-1 text-[10px] font-bold tracking-[0.08em]">CAMPUSWEAR</span>
    </div>
  );
}
