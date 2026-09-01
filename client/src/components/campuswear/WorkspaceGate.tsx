import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { canUseWorkspace, destinationForRole } from "@/lib/authRouting";
import { CampusWearMark } from "@/components/campuswear/BrandMark";

/**
 * What a signed-out visitor sees where a workspace would be.
 *
 * The presentation now belongs to the same family as the auth screens — the CampusWear mark, a gold
 * rule, the same type scale — so being asked to sign in reads as part of the product rather than as
 * an error the app ran into.
 *
 * It deliberately says nothing technical. Not which roles the route allows, not that a role check
 * failed, not the route's own name: a visitor who is not signed in learns only that an account is
 * needed. The redirect still carries the intended path so signing in returns them here.
 *
 * The gating logic is unchanged.
 */
export function WorkspaceGate({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const workspace = allowedRoles.includes("vendor_staff") ? "vendor" : allowedRoles.includes("school_admin") ? "school" : "platform";
  const mustLeaveWorkspace = Boolean(user && !canUseWorkspace(user.role, workspace));
  useEffect(() => { if (!loading && user && mustLeaveWorkspace) setLocation(destinationForRole(user.role)); }, [loading, mustLeaveWorkspace, setLocation, user]);

  if (loading) {
    return (
      <div className="rounded-edge border border-border bg-card p-8">
        <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          Loading workspace…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-edge border border-border bg-card p-8 sm:p-12">
        <div className="mx-auto max-w-sm text-center">
          <CampusWearMark variant="color" className="mx-auto size-12" title="" />
          <span className="uc-rule mx-auto mt-7" aria-hidden="true" />
          <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.03em] text-primary">Sign in to continue</h1>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
            Your CampusWear account keeps your orders, notifications, cart, and saved items connected.
          </p>
          <Button
            className="mt-8 min-h-12 w-full gap-2 rounded-edge"
            onClick={() => window.location.assign(`/auth?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)}
          >
            Sign in <ShieldCheck className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  if (mustLeaveWorkspace) {
    return (
      <div className="rounded-edge border border-border bg-card p-8">
        <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          Opening your assigned CampusWear workspace…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
