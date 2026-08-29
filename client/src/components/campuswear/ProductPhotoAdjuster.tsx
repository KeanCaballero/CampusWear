import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createAdjustedProductPhoto, type ProductPhotoAdjustment } from "@/lib/productPhotoCrop";
import { ImagePlus, MoveHorizontal, MoveVertical, RotateCcw, ZoomIn } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const initialAdjustment: ProductPhotoAdjustment = { zoom: 1, panX: 0, panY: 0 };

function isSupportedImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 4 * 1024 * 1024;
}

export function ProductPhotoAdjuster({ productName, isPending, onSave }: { productName: string; isPending: boolean; onSave: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState<ProductPhotoAdjustment>(initialAdjustment);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!isSupportedImage(selected)) {
      toast.error("Choose a PNG, JPG, or WebP image smaller than 4 MB.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setAdjustment(initialAdjustment);
  };

  const save = async () => {
    if (!file) return;
    setPreparing(true);
    try {
      onSave(await createAdjustedProductPhoto(file, adjustment));
      setOpen(false);
      setFile(null);
      setPreviewUrl(null);
      setAdjustment(initialAdjustment);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The adjusted photo could not be prepared.");
    } finally {
      setPreparing(false);
    }
  };

  const busy = isPending || preparing;
  return <Dialog open={open} onOpenChange={setOpen}><Button type="button" variant="outline" className="mt-4 min-h-10 w-full justify-start gap-2 border-dashed border-primary/30 text-xs font-bold text-primary hover:bg-secondary" onClick={() => setOpen(true)}><ImagePlus className="size-4" />Adjust or replace product photo</Button><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Adjust product photo</DialogTitle><DialogDescription>Choose a photo, then zoom and position it. CampusWear saves a clean 4:3 product-card version; the original file is not published by this adjustment step.</DialogDescription></DialogHeader><div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]"><div><div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"><div className="grid h-full place-items-center overflow-hidden"><img src={previewUrl ?? ""} alt={previewUrl ? `Preview for ${productName}` : ""} className={previewUrl ? "h-full w-full object-cover transition-transform duration-150" : "hidden"} style={previewUrl ? { transform: `translate(${adjustment.panX * 25}%, ${adjustment.panY * 25}%) scale(${adjustment.zoom})` } : undefined} /><p className={previewUrl ? "hidden" : "px-6 text-center text-sm text-muted-foreground"}>Choose an image to see the card preview.</p></div></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Tip: keep the uniform centered and leave a little space around the edges for a clean catalog card.</p></div><div className="space-y-4"><label className="block text-sm font-bold" htmlFor="product-photo-file">Photo file<Input id="product-photo-file" className="mt-2 h-11 bg-card" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} /></label><p className="text-xs leading-5 text-muted-foreground">PNG, JPG, or WebP. Maximum 4 MB.</p><fieldset disabled={!previewUrl || busy} className="space-y-4"><label className="block text-sm font-bold" htmlFor="photo-zoom"><span className="flex items-center gap-2"><ZoomIn className="size-4 text-primary" />Zoom <output className="ml-auto text-xs text-muted-foreground">{Math.round(adjustment.zoom * 100)}%</output></span><Input id="photo-zoom" className="mt-2" type="range" min="1" max="2" step="0.05" value={adjustment.zoom} onChange={event => setAdjustment(current => ({ ...current, zoom: Number(event.target.value) }))} /></label><label className="block text-sm font-bold" htmlFor="photo-horizontal"><span className="flex items-center gap-2"><MoveHorizontal className="size-4 text-primary" />Horizontal position</span><Input id="photo-horizontal" className="mt-2" type="range" min="-1" max="1" step="0.05" value={adjustment.panX} onChange={event => setAdjustment(current => ({ ...current, panX: Number(event.target.value) }))} /></label><label className="block text-sm font-bold" htmlFor="photo-vertical"><span className="flex items-center gap-2"><MoveVertical className="size-4 text-primary" />Vertical position</span><Input id="photo-vertical" className="mt-2" type="range" min="-1" max="1" step="0.05" value={adjustment.panY} onChange={event => setAdjustment(current => ({ ...current, panY: Number(event.target.value) }))} /></label></fieldset><Button type="button" variant="ghost" size="sm" className="gap-1.5" disabled={!previewUrl || busy} onClick={() => setAdjustment(initialAdjustment)}><RotateCcw className="size-3.5" />Reset adjustment</Button></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button type="button" onClick={() => void save()} disabled={!file || busy} className="gap-2">{busy ? "Preparing photo…" : "Save adjusted photo"}<ImagePlus className="size-4" /></Button></DialogFooter></DialogContent></Dialog>;
}
