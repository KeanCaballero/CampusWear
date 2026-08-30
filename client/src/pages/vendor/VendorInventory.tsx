import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { WorkspacePage } from "@/components/campuswear/WorkspacePage";
import { WorkspacePanel } from "@/components/campuswear/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listVendorInventory, updateVendorInventory, vendorInventoryQueryKey, type VendorInventoryItem } from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, CircleAlert, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

function useInventoryUpdate(inventoryQueryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateVendorInventory,
    onSuccess: () => {
      toast.success("Inventory updated.");
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["supabase-catalog"] });
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Inventory could not be updated."),
  });
}

function InventoryRow({ item, inventoryQueryKey }: { item: VendorInventoryItem; inventoryQueryKey: readonly unknown[] }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [threshold, setThreshold] = useState(item.lowStockThreshold);
  const update = useInventoryUpdate(inventoryQueryKey);
  const unchanged = quantity === item.quantity && threshold === item.lowStockThreshold;

  return <tr className="border-b border-border last:border-0 hover:bg-muted/35"><td className="px-5 py-4"><p className="font-mono text-xs font-bold text-foreground">{item.sku}</p></td><td className="px-4 py-4"><span className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-bold text-primary">{item.size}</span></td><td className="px-4 py-4"><StatusBadge kind="inventory" value={item.availability} /></td><td className="px-4 py-4"><Input aria-label={`Quantity for ${item.productName} size ${item.size}`} type="number" min="0" value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="min-h-10 w-24 bg-card" /></td><td className="px-4 py-4"><Input aria-label={`Low-stock threshold for ${item.productName} size ${item.size}`} type="number" min="0" value={threshold} onChange={event => setThreshold(Number(event.target.value))} className="min-h-10 w-24 bg-card" /></td><td className="px-5 py-4 text-right"><Button size="sm" variant="outline" disabled={update.isPending || unchanged} onClick={() => update.mutate({ variantId: item.variantId, quantity, lowStockThreshold: threshold })} className="min-h-10 gap-1.5"><Save className="size-3.5" aria-hidden="true" />{update.isPending ? "Saving…" : "Save"}</Button></td></tr>;
}

function InventoryCard({ item, inventoryQueryKey }: { item: VendorInventoryItem; inventoryQueryKey: readonly unknown[] }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [threshold, setThreshold] = useState(item.lowStockThreshold);
  const update = useInventoryUpdate(inventoryQueryKey);
  const unchanged = quantity === item.quantity && threshold === item.lowStockThreshold;

  return <WorkspacePanel as="article" padding="none" className="overflow-hidden"><div className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><h2 className="truncate font-extrabold tracking-[-0.02em]">{item.productName}</h2><p className="mt-1 text-xs text-muted-foreground">SKU (internal code): {item.sku}</p></div><StatusBadge kind="inventory" value={item.availability} /></div><div className="grid grid-cols-3 divide-x divide-border border-y border-border bg-secondary/35 text-xs"><div className="p-3"><p className="font-semibold text-muted-foreground">Size</p><p className="mt-1.5 font-extrabold text-primary">{item.size}</p></div><div className="p-3"><p className="font-semibold text-muted-foreground">Current stock</p><p className="mt-1.5 font-extrabold tabular-nums">{item.quantity}</p></div><div className="p-3"><p className="font-semibold text-muted-foreground">Alert at</p><p className="mt-1.5 font-extrabold tabular-nums">{item.lowStockThreshold}</p></div></div><div className="p-4"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Available now<Input aria-label={`Quantity for ${item.productName} size ${item.size}`} type="number" min="0" value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="mt-1.5 min-h-11 bg-card" /></label><label className="text-xs font-bold">Low-stock alert<Input aria-label={`Low-stock threshold for ${item.productName} size ${item.size}`} type="number" min="0" value={threshold} onChange={event => setThreshold(Number(event.target.value))} className="mt-1.5 min-h-11 bg-card" /></label></div><Button size="sm" variant="outline" disabled={update.isPending || unchanged} onClick={() => update.mutate({ variantId: item.variantId, quantity, lowStockThreshold: threshold })} className="mt-4 min-h-11 w-full gap-1.5"><Save className="size-3.5" aria-hidden="true" />{update.isPending ? "Saving inventory…" : "Save inventory"}</Button></div></WorkspacePanel>;
}

export default function VendorInventory() {
  const { user, loading } = useAuth();
  const inventoryKey = vendorInventoryQueryKey(user?.id);
  const inventory = useQuery({ queryKey: inventoryKey, queryFn: listVendorInventory, enabled: !loading && Boolean(user?.id) });
  const records = inventory.data ?? [];
  const needsAttention = (item: VendorInventoryItem) => item.availability === "low_stock" || item.availability === "out_of_stock";
  const lowStockCount = records.filter(needsAttention).length;

  const [search, setSearch] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const filtersActive = search.trim().length > 0 || attentionOnly;

  // Narrows the list already in memory. listVendorInventory() takes no arguments, so this changes
  // no query semantics and needs no backend support.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records
      .filter(item => !attentionOnly || needsAttention(item))
      .filter(item => !term || item.productName.toLowerCase().includes(term) || item.size.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term));
  }, [records, search, attentionOnly]);

  // Consecutive runs only, so listVendorInventory's existing product ordering is preserved rather
  // than re-sorted.
  const grouped = useMemo(() => {
    const groups: Array<{ productName: string; items: VendorInventoryItem[] }> = [];
    for (const item of filtered) {
      const current = groups[groups.length - 1];
      if (current && current.productName === item.productName) current.items.push(item);
      else groups.push({ productName: item.productName, items: [item] });
    }
    return groups;
  }, [filtered]);

  const clearFilters = () => { setSearch(""); setAttentionOnly(false); };

  return <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace"><WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}><WorkspacePage eyebrow="VARIANT INVENTORY" title="Stock by size, ready for pickup." description="Every size is tracked independently. Change only the current quantity and the number of units that should trigger a low-stock alert."><div className="mt-7 grid gap-3 sm:grid-cols-2"><WorkspacePanel as="section" padding="compact" className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Boxes className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Variant records</p><p className="mt-1 text-xl font-extrabold tabular-nums">{inventory.isLoading ? "—" : records.length}</p></div></WorkspacePanel><section className="flex gap-3 rounded-[var(--radius)] border border-campus-gold/40 bg-campus-gold/10 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm"><CircleAlert className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Need attention</p><p className="mt-1 text-xl font-extrabold tabular-nums text-amber-800">{inventory.isLoading ? "—" : lowStockCount}</p></div></section></div><WorkspacePanel padding="default" className="mt-3"><div className="flex flex-col gap-2.5 sm:flex-row sm:items-center"><div className="relative flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><label className="sr-only" htmlFor="vendor-inventory-search">Search inventory</label><Input id="vendor-inventory-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by product, size, or SKU" className="min-h-11 bg-card pl-9" /></div><Button type="button" variant={attentionOnly ? "default" : "outline"} aria-pressed={attentionOnly} onClick={() => setAttentionOnly(value => !value)} className={`min-h-11 shrink-0 gap-1.5 ${attentionOnly ? "" : "bg-card"}`}><CircleAlert className="size-4" aria-hidden="true" />Needs attention</Button></div>{filtersActive && <p className="mt-3 text-xs font-semibold text-muted-foreground" aria-live="polite">Showing {filtered.length} of {records.length} variant{records.length === 1 ? "" : "s"}</p>}</WorkspacePanel>{inventory.isLoading ? <Skeleton className="mt-5 h-72 rounded-[var(--radius)]" /> : isStalledWithoutData(inventory) ? <div className="mt-5"><OfflinePanel title="You are offline" detail="Reconnect to load size-level stock." onRetry={() => inventory.refetch()} /></div> : inventory.isError ? <div className="mt-5"><EmptyPanel title="Inventory could not be loaded" detail="Please try again to view variant stock." action={{ label: "Try again", onClick: () => inventory.refetch() }} /></div> : records.length ? (filtered.length ? <><section className="mt-5 md:hidden" aria-label="Mobile inventory records"><div className="mb-3 rounded-[var(--radius)] border border-primary/10 bg-secondary/40 px-4 py-3 text-xs leading-5 text-muted-foreground">Use <strong className="text-foreground">Available now</strong> for the physical quantity and <strong className="text-foreground">Low-stock alert</strong> for the threshold that needs attention.</div><div className="space-y-3">{filtered.map(item => <InventoryCard key={item.variantId} item={item} inventoryQueryKey={inventoryKey} />)}</div></section><WorkspacePanel as="section" padding="none" className="mt-5 hidden overflow-x-auto md:block" aria-labelledby="inventory-table-title"><div className="flex items-end justify-between gap-4 border-b border-border px-5 py-4"><div><p className="campus-eyebrow">STOCK LEDGER</p><h2 id="inventory-table-title" className="mt-1 font-extrabold">Size-level inventory</h2></div><p className="text-xs leading-5 text-muted-foreground">Edit the physical stock and alert threshold, then save the individual size row.</p></div><table className="min-w-[800px] w-full text-left text-sm"><thead className="border-b border-border bg-muted/60 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground"><tr><th scope="col" className="px-5 py-3">SKU (internal code)</th><th scope="col" className="px-4 py-3">Size</th><th scope="col" className="px-4 py-3">Availability</th><th scope="col" className="px-4 py-3">Stock</th><th scope="col" className="px-4 py-3">Alert at</th><th scope="col" className="px-5 py-3 text-right">Action</th></tr></thead>{grouped.map(group => <tbody key={group.productName}><tr className="bg-muted/40"><th scope="colgroup" colSpan={6} className="px-5 py-2.5 text-left text-sm font-extrabold tracking-[-0.02em] text-foreground">{group.productName}<span className="ml-2 text-xs font-semibold text-muted-foreground">{group.items.length} size{group.items.length === 1 ? "" : "s"}</span></th></tr>{group.items.map(item => <InventoryRow key={item.variantId} item={item} inventoryQueryKey={inventoryKey} />)}</tbody>)}</table></WorkspacePanel></> : <div className="mt-5"><EmptyPanel title="No variants match your filters" detail="No size in your inventory matches the current search or the needs-attention filter." action={{ label: "Clear filters", onClick: clearFilters }} /></div>) : <div className="mt-5"><EmptyPanel title="No variants yet" detail="Create a product with sizes to manage its inventory here." /></div>}</WorkspacePage></WorkspaceGate></DashboardLayout>;
}
