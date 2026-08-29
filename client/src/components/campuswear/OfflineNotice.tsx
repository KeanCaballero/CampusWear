import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Live connectivity, as TanStack Query itself sees it.
 *
 * `onlineManager` is the signal that actually decides whether a query runs, so it is the only
 * honest basis for telling someone they are offline. It is deliberately NOT `navigator.onLine`,
 * which can disagree with it, and deliberately NOT "is any query paused": a fetch also pauses
 * while a retry waits on window focus, so treating paused as offline would report a server
 * outage as a connectivity problem. Confirmed in a browser — `onlineManager.isOnline() === true`
 * with the API returning 500 still produced `fetchStatus: "paused"` in an unfocused tab.
 */
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(() => !onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(online => setOffline(!online)), []);

  return offline;
}

/**
 * Global, non-blocking connectivity banner.
 *
 * Rendered once per workspace shell rather than per page: when a query is paused but cached
 * data exists, the cached view stays on screen and this explains why it may be out of date.
 * Screens with NO data to show render an OfflinePanel instead, which uses this same signal to
 * decide its wording — so the two can never contradict each other.
 */
export function OfflineNotice() {
  const isOffline = useIsOffline();
  const queryClient = useQueryClient();

  if (!isOffline) return null;

  return (
    <div role="status" aria-live="polite" className="border-b border-campus-gold/40 bg-campus-gold/15">
      <div className="container flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
        <WifiOff className="size-4 shrink-0 text-amber-900" aria-hidden="true" />
        <p className="font-semibold text-amber-900">You are offline. Showing your last saved view.</p>
        <button
          type="button"
          onClick={() => queryClient.refetchQueries({ type: "active" })}
          className="ml-auto min-h-11 rounded-lg px-2 text-sm font-bold text-amber-900 underline underline-offset-2 hover:text-amber-950"
        >
          Reconnect
        </button>
      </div>
    </div>
  );
}
