import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { grantPlatformTeamAccess, listPlatformAccounts, platformAccountsQueryKey, revokePlatformTeamAccess, type PlatformAccount, type PlatformAccountRole } from "@/lib/supabaseCatalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Crown, Search, ShieldCheck, Store, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";

const adminNavigation = [
  { icon: Building2, label: "Platform overview", path: "/platform" },
  { icon: UsersRound, label: "Accounts", path: "/platform/accounts" },
  { icon: ShieldCheck, label: "Platform team", path: "/platform/team" },
];

const roleLabel: Record<PlatformAccountRole, string> = {
  student: "Student",
  vendor_staff: "Vendor staff",
  school_admin: "School administrator",
  platform_admin: "Platform administrator",
};

const roleTone: Record<PlatformAccountRole, string> = {
  student: "bg-secondary text-primary",
  vendor_staff: "bg-emerald-100 text-emerald-800",
  school_admin: "bg-violet-100 text-violet-800",
  platform_admin: "bg-blue-100 text-blue-800",
};

function AccountAction({ account, onGrant, onRevoke, busy }: { account: PlatformAccount; onGrant: (email: string) => void; onRevoke: (userId: string) => void; busy: boolean }) {
  if (account.role === "student") {
    if (!account.emailConfirmed) return <span className="text-xs font-semibold text-muted-foreground">Confirm email first</span>;
    return <Button size="sm" disabled={busy} onClick={() => onGrant(account.email)} className="gap-1.5"><UserPlus className="size-3.5" aria-hidden="true" />Make platform admin</Button>;
  }
  if (account.role === "platform_admin") {
    if (account.isBootstrapOwner) return <span className="text-xs font-semibold text-muted-foreground">Protected owner</span>;
    return <Button variant="outline" size="sm" disabled={busy} onClick={() => onRevoke(account.userId)} className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700"><UserMinus className="size-3.5" aria-hidden="true" />Restore student</Button>;
  }
  return <span className="max-w-56 text-left text-xs leading-5 text-muted-foreground lg:text-right">{account.role === "vendor_staff" ? "Vendor role is assigned by an approved vendor application." : "School role is assigned through school onboarding."}</span>;
}

export default function PlatformAccounts() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const queryKey = platformAccountsQueryKey(user?.id, deferredSearch);
  const accounts = useQuery({ queryKey, queryFn: () => listPlatformAccounts(deferredSearch), enabled: !authLoading && Boolean(user) });
  const refresh = () => void queryClient.invalidateQueries({ queryKey });
  const grant = useMutation({ mutationFn: grantPlatformTeamAccess, onSuccess: () => { toast.success("Platform administrator access granted."); refresh(); }, onError: error => toast.error(error instanceof Error ? error.message : "Platform access could not be granted.") });
  const revoke = useMutation({ mutationFn: revokePlatformTeamAccess, onSuccess: () => { toast.success("Account restored to Student."); refresh(); }, onError: error => toast.error(error instanceof Error ? error.message : "Platform access could not be restored.") });
  const busy = grant.isPending || revoke.isPending;

  return (
    <DashboardLayout items={adminNavigation} workspaceLabel="Platform administration">
      <WorkspaceGate allowedRoles={["platform_admin", "admin"]}>
        <div className="mx-auto max-w-6xl">
          <PageIntro eyebrow="PLATFORM ACCOUNTS" title="Account directory and access" description="View the minimum account information needed for platform operations. Student is the default role; individual platform access is audited, while vendor and school roles remain tied to authorized organizations." />
          <section className="campus-panel mt-7 overflow-hidden">
            <div className="border-b border-border p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <h2 className="font-extrabold tracking-[-0.025em]">CampusWear accounts</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Search by name or email. Results are limited to 100 accounts and visible only to platform administrators.</p>
                </div>
                <div className="relative w-full lg:max-w-sm">
                  <label className="sr-only" htmlFor="platform-account-search">Search CampusWear accounts</label>
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="platform-account-search" value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 bg-background pl-10" placeholder="Search name or email" />
                </div>
              </div>
            </div>
            {accounts.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div> : accounts.isError ? <div className="p-5"><EmptyPanel title="Accounts are unavailable" detail="Please retry loading the platform account directory." action={{ label: "Try again", onClick: () => accounts.refetch() }} /></div> : accounts.data?.length ? <div className="divide-y divide-border">{accounts.data.map(account => <article key={account.userId} className="flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-muted/35 lg:flex-row lg:items-center sm:px-6"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">{account.isBootstrapOwner ? <Crown className="size-4" aria-hidden="true" /> : account.role === "vendor_staff" ? <Store className="size-4" aria-hidden="true" /> : <UsersRound className="size-4" aria-hidden="true" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-extrabold">{account.fullName || "CampusWear user"}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${roleTone[account.role]}`}>{roleLabel[account.role]}</span>{!account.emailConfirmed && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Unconfirmed</span>}</div><p className="mt-1 overflow-wrap-anywhere text-xs text-muted-foreground">{account.email}</p></div><AccountAction account={account} busy={busy} onGrant={email => grant.mutate(email)} onRevoke={userId => revoke.mutate(userId)} /></article>)}</div> : <div className="p-5"><EmptyPanel title="No matching accounts" detail="Try a different name or email search." /></div>}
          </section>
          <p className="campus-panel mt-5 border-primary/10 bg-secondary/35 p-4 text-xs leading-5 text-muted-foreground">Vendor staff cannot be created from a role-only button because each vendor must belong to a real approved vendor organization. Use the vendor application review on the Platform overview to authorize vendor access securely.</p>
        </div>
      </WorkspaceGate>
    </DashboardLayout>
  );
}
