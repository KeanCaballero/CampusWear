import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsOffline } from "./OfflineNotice";

/**
 * Shown when a query is *stalled* — TanStack Query has paused it rather than failed it, and
 * there is no cached data to fall back on. Without this branch the page would fall through to
 * its empty state and claim there is nothing to show.
 *
 * A pause has two causes, so this panel does not assume connectivity is the problem:
 *   - genuinely offline  → the caller's offline wording
 *   - online but stalled → a retry waiting on window focus, so say we are still trying rather
 *     than wrongly telling the user their connection is down
 *
 * The connectivity signal is the same one OfflineNotice uses, so the banner and this panel can
 * never contradict each other.
 */
export function OfflinePanel({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  const isOffline = useIsOffline();
  const Icon = isOffline ? WifiOff : Loader2;

  return (
    <div className="campus-panel px-6 py-11 text-center sm:px-10" role="status" aria-live="polite">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary shadow-sm">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold tracking-[-0.025em]">
        {isOffline ? title : "Still trying to load this"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {isOffline ? detail : "This is taking longer than usual. You can try again now."}
      </p>
      {onRetry && <Button className="mt-6 min-h-11" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
