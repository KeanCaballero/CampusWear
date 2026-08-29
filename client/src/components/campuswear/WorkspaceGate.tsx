import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { canUseWorkspace, destinationForRole } from "@/lib/authRouting";

export function WorkspaceGate({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const workspace = allowedRoles.includes("vendor_staff") ? "vendor" : allowedRoles.includes("school_admin") ? "school" : "platform";
  const mustLeaveWorkspace = Boolean(user && !canUseWorkspace(user.role, workspace));
  useEffect(() => { if (!loading && user && mustLeaveWorkspace) setLocation(destinationForRole(user.role)); }, [loading, mustLeaveWorkspace, setLocation, user]);
  if (loading) return <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading workspace…</div>;
  if (!user) return <div className="rounded-2xl border border-border bg-card p-8 text-center"><ShieldAlert className="mx-auto size-7 text-primary" /><h1 className="mt-4 text-xl font-extrabold">Sign in to open this workspace</h1><Button className="mt-5" onClick={() => window.location.assign(`/auth?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)}>Sign in</Button></div>;
  if (mustLeaveWorkspace) return <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Opening your assigned CampusWear workspace…</div>;
  return <>{children}</>;
}
