import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Camera, CameraOff, CheckCircle2, KeyRound, Loader2, ScanLine, XCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { WorkspacePage } from "@/components/campuswear/WorkspacePage";
import { WorkspacePanel } from "@/components/campuswear/WorkspacePanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/campuswear/StatusBadge";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lookupPickupOrder, transitionVendorOrder, VendorFacingError, vendorOrdersQueryKey, type PickupLookup, type PickupOrder } from "@/lib/supabaseCatalog";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

/**
 * Pickup verification on the vendor's phone.
 *
 * The whole point is speed at a busy counter: scan the student's saved code instead of hunting
 * through a list. Two things it deliberately does NOT do.
 *
 * Scanning never completes an order. A camera pointed at a screen is an identification step, not
 * consent — the vendor reads the result and confirms explicitly, behind a dialog.
 *
 * The QR grants nothing. It carries an order number and no credential, so every lookup is still
 * decided by RLS against the signed-in vendor, and every completion still goes through
 * transition_order_status, which locks the row, permits only ready_for_pickup → completed, notifies
 * the student and leaves inventory alone. Two phones scanning the same code cannot both complete it.
 *
 * Camera work is guarded throughout: a denied permission, a browser without the API, or a device
 * with no camera all fall through to manual entry rather than locking the vendor out of a queue.
 */

type Phase =
  | { step: "idle" }
  | { step: "scanning" }
  | { step: "looking-up" }
  | { step: "result"; lookup: PickupLookup }
  | { step: "confirmed"; order: PickupOrder }
  | { step: "error"; message: string };

const CAMERA_DENIED =
  "Camera access is unavailable. You can still verify a pickup by entering the order number.";

export default function VendorPickup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [manualCode, setManualCode] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<PickupOrder | null>(null);

  /** Always release the camera: an abandoned stream keeps the lamp on and drains the battery. */
  const stopScanner = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  useEffect(() => stopScanner, [stopScanner]);

  const runLookup = useCallback(async (orderNumber: string) => {
    setPhase({ step: "looking-up" });
    try {
      const lookup = await lookupPickupOrder(orderNumber);
      setPhase({ step: "result", lookup });
    } catch {
      // Never surface PostgREST text to a vendor standing at a counter.
      setPhase({ step: "error", message: "Unable to verify this order. Check your connection and try again." });
    }
  }, []);

  const startScanner = useCallback(async () => {
    stopScanner();
    setPhase({ step: "scanning" });
    try {
      if (!(await QrScanner.hasCamera())) {
        setPhase({ step: "error", message: CAMERA_DENIED });
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      const scanner = new QrScanner(
        video,
        result => {
          // Stop before looking up, so the camera is not left running behind the result card.
          stopScanner();
          void runLookup(result.data);
        },
        { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 5 },
      );
      scannerRef.current = scanner;
      await scanner.start();
    } catch {
      stopScanner();
      setPhase({ step: "error", message: CAMERA_DENIED });
    }
  }, [runLookup, stopScanner]);

  const confirmPickup = useMutation({
    mutationFn: (order: PickupOrder) => transitionVendorOrder({ orderId: order.id, status: "completed" }),
    onSuccess: (_result, order) => {
      setPhase({ step: "confirmed", order });
      // The fulfilment queue reads this key; the student's notification is created by the RPC.
      void queryClient.invalidateQueries({ queryKey: vendorOrdersQueryKey(user?.id) });
    },
    onError: error => {
      setPhase({
        step: "error",
        message: error instanceof VendorFacingError ? error.message : "This pickup could not be confirmed. Please try again.",
      });
    },
  });

  const reset = () => { stopScanner(); setManualCode(""); setPhase({ step: "idle" }); };

  return (
    <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace">
      <WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}>
        <WorkspacePage
          eyebrow="PICKUP"
          title="Pickup verification"
          description="Scan the student's code to bring up their order, then confirm the handover."
          width="narrow"
        >
          {/* ---------------- idle: the two ways in ---------------- */}
          {phase.step === "idle" && (
            <WorkspacePanel as="section" className="mt-7">
              <Button onClick={() => void startScanner()} className="min-h-12 w-full gap-2">
                <Camera className="size-4" aria-hidden="true" />
                Scan QR
              </Button>

              <div className="mt-6 border-t border-border pt-5">
                <label htmlFor="pickup-order-number" className="block text-sm font-extrabold">
                  Or enter the order number
                </label>
                <p id="pickup-manual-help" className="mt-1 text-xs leading-5 text-muted-foreground">
                  Use this if the code will not scan. It checks exactly the same records.
                </p>
                <form
                  className="mt-2.5 flex flex-col gap-2 sm:flex-row"
                  onSubmit={event => { event.preventDefault(); void runLookup(manualCode); }}
                >
                  <Input
                    id="pickup-order-number"
                    value={manualCode}
                    onChange={event => setManualCode(event.target.value)}
                    placeholder="CW-XXXXXXXXXX"
                    aria-describedby="pickup-manual-help"
                    autoCapitalize="characters"
                    className="min-h-12 bg-card font-mono"
                  />
                  <Button type="submit" variant="outline" disabled={!manualCode.trim()} className="min-h-12 gap-1.5 sm:w-auto">
                    <KeyRound className="size-4" aria-hidden="true" />
                    Find order
                  </Button>
                </form>
              </div>
            </WorkspacePanel>
          )}

          {/* ---------------- scanning ---------------- */}
          <div className={phase.step === "scanning" ? "mt-7" : "hidden"}>
            <WorkspacePanel as="section" padding="compact">
              <p className="text-sm font-extrabold">Scan the student&apos;s QR code</p>
              <p className="mt-1 text-xs text-muted-foreground" role="status" aria-live="polite">
                Point the camera at the code on their phone.
              </p>
              {/* Kept mounted so the scanner always has a video element to attach to. */}
              <div className="mt-3 overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline aria-label="Camera preview for scanning a pickup QR code" />
              </div>
              <Button variant="outline" onClick={reset} className="mt-3 min-h-12 w-full gap-1.5">
                <CameraOff className="size-4" aria-hidden="true" />
                Stop scanner
              </Button>
            </WorkspacePanel>
          </div>

          {/* ---------------- looking up ---------------- */}
          {phase.step === "looking-up" && (
            <WorkspacePanel as="section" className="mt-7">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground" role="status" aria-live="polite">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Checking this order…
              </p>
            </WorkspacePanel>
          )}

          {/* ---------------- result ---------------- */}
          {phase.step === "result" && <PickupResult lookup={phase.lookup} onConfirm={setPendingConfirm} onReset={reset} busy={confirmPickup.isPending} />}

          {/* ---------------- confirmed ---------------- */}
          {phase.step === "confirmed" && (
            <WorkspacePanel as="section" className="mt-7">
              <div role="status" aria-live="polite">
                <p className="flex items-center gap-2 text-lg font-extrabold text-emerald-700">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                  Pickup confirmed
                </p>
                <p className="mt-2 font-mono text-sm font-bold">{phase.order.orderNumber}</p>
                <p className="mt-1 text-sm text-muted-foreground">This order is now completed and the student has been notified.</p>
              </div>
              <Button onClick={() => void startScanner()} className="mt-5 min-h-12 w-full gap-2">
                <ScanLine className="size-4" aria-hidden="true" />
                Scan next order
              </Button>
              <Button variant="outline" onClick={reset} className="mt-2.5 min-h-12 w-full">Done</Button>
            </WorkspacePanel>
          )}

          {/* ---------------- error ---------------- */}
          {phase.step === "error" && (
            <WorkspacePanel as="section" className="mt-7">
              <p className="flex items-start gap-2 text-sm font-bold text-destructive" role="alert">
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {phase.message}
              </p>
              <Button variant="outline" onClick={reset} className="mt-4 min-h-12 w-full gap-1.5">
                <KeyRound className="size-4" aria-hidden="true" />
                Enter order number manually
              </Button>
            </WorkspacePanel>
          )}

          {/* ---------------- explicit confirmation ---------------- */}
          <AlertDialog open={pendingConfirm !== null} onOpenChange={open => { if (!open) setPendingConfirm(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm pickup?</AlertDialogTitle>
                <AlertDialogDescription>
                  This marks {pendingConfirm?.orderNumber} as completed and notifies the student. It cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { if (pendingConfirm) confirmPickup.mutate(pendingConfirm); setPendingConfirm(null); }}
                >
                  Confirm pickup
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </WorkspacePage>
      </WorkspaceGate>
    </DashboardLayout>
  );
}

/** The four things a scan can mean. Only one of them offers a Confirm button. */
function PickupResult({
  lookup,
  onConfirm,
  onReset,
  busy,
}: {
  lookup: PickupLookup;
  onConfirm: (order: PickupOrder) => void;
  onReset: () => void;
  busy: boolean;
}) {
  if (lookup.kind === "not_available") {
    return (
      <WorkspacePanel as="section" className="mt-7">
        {/* Deliberately identical for "no such order" and "another vendor's order". */}
        <p className="text-sm font-bold text-destructive" role="alert">Order not available for pickup.</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Check the code with the student, or search your fulfilment queue.</p>
        <Button variant="outline" onClick={onReset} className="mt-4 min-h-12 w-full">Try another order</Button>
      </WorkspacePanel>
    );
  }

  const { order } = lookup;
  const ready = lookup.kind === "found";

  return (
    <WorkspacePanel as="section" className="mt-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg font-extrabold text-primary">{order.orderNumber}</p>
          <p className="mt-1 text-sm text-muted-foreground">Collect at <strong className="font-bold text-foreground">{order.pickupLocation}</strong></p>
        </div>
        <StatusBadge kind="order" value={order.status} />
      </div>

      <ul className="mt-4 divide-y divide-border border-y border-border" aria-label="Items in this order">
        {order.items.map((item, index) => (
          <li key={`${item.productName}-${item.size}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 text-sm font-semibold">{item.productName}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">Size {item.size} · ×{item.quantity}</span>
          </li>
        ))}
      </ul>

      {ready ? (
        <Button onClick={() => onConfirm(order)} disabled={busy} className="mt-5 min-h-12 w-full gap-2">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {busy ? "Confirming…" : "Confirm pickup"}
        </Button>
      ) : (
        <p className="mt-5 text-sm font-semibold text-muted-foreground" role="status">
          {lookup.kind === "not_ready"
            ? "This order is not ready for pickup yet."
            : "This order is no longer available for pickup."}
        </p>
      )}

      <Button variant="outline" onClick={onReset} className="mt-2.5 min-h-12 w-full gap-1.5">
        <ScanLine className="size-4" aria-hidden="true" />
        Scan another order
      </Button>
    </WorkspacePanel>
  );
}
