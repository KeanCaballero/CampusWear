import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ruler } from "lucide-react";

/**
 * Size guide.
 *
 * NO MEASUREMENTS ARE SHOWN, because none exist. The schema was checked: there is no size or
 * measurement table, no measurement columns, and no JSON metadata anywhere. `product_variants`
 * carries only `size` (S / M / L) and `sku`. Inventing chest or length figures and attributing them
 * to the university would be worse than useless — a student would order the wrong size on the
 * strength of a number nobody measured.
 *
 * So this states plainly what is and is not known, lists the sizes the product genuinely offers,
 * and is shaped to accept real measurements the moment a vendor supplies them: drop a rows array in
 * beside `sizes` and render it as a table.
 */
export function SizeGuide({ sizes, schoolName }: { sizes: string[]; schoolName?: string | null }) {
  const provider = schoolName ? `${schoolName} CampusWear vendor` : "CampusWear vendor";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 gap-1.5">
          <Ruler className="size-4" aria-hidden="true" />
          Size guide
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Size guide</DialogTitle>
          <DialogDescription>
            Official measurements will be provided by the {provider}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.09em] text-muted-foreground">Sizes offered</p>
          {sizes.length ? (
            <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Sizes offered for this product">
              {sizes.map(size => (
                <li key={size} className="rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-bold text-primary">
                  {size}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No sizes have been published for this item yet.</p>
          )}
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          Detailed measurements are not published for this item yet. Check the fit with your vendor before placing your
          order, and use the pickup counter to confirm sizing if you are unsure.
        </p>
      </DialogContent>
    </Dialog>
  );
}
