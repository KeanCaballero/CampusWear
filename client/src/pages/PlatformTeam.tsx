import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { grantPlatformTeamAccess, listPlatformTeamMembers, platformTeamQueryKey, revokePlatformTeamAccess } from "@/lib/supabaseCatalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Crown, ShieldCheck, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const adminNavigation = [
  { icon: Building2, label: "Platform overview", path: "/platform" },
  { icon: UsersRound, label: "Accounts", path: "/platform/accounts" },
  { icon: ShieldCheck, label: "Platform team", path: "/platform/team" },
];

export default function PlatformTeam() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const queryKey = platformTeamQueryKey(user?.id);
  const team = useQuery({ queryKey, queryFn: listPlatformTeamMembers, enabled: !authLoading && Boolean(user) });
  const [email, setEmail] = useState("");
  const refresh = () => void queryClient.invalidateQueries({ queryKey });
  const grant = useMutation({ mutationFn: grantPlatformTeamAccess, onSuccess: () => { toast.success("Platform team access granted."); setEmail(""); refresh(); }, onError: error => toast.error(error instanceof Error ? error.message : "Platform access could not be granted.") });
  const revoke = useMutation({ mutationFn: revokePlatformTeamAccess, onSuccess: () => { toast.success("Platform team access revoked."); refresh(); }, onError: error => toast.error(error instanceof Error ? error.message : "Platform access could not be revoked.") });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); grant.mutate(email); };

  return (
    <DashboardLayout items={adminNavigation} workspaceLabel="Platform administration">
      <WorkspaceGate allowedRoles={["platform_admin", "admin"]}>
        <div className="mx-auto max-w-6xl">
          <PageIntro eyebrow="PLATFORM TEAM" title="Individual administrator access" description="Grant access only to a groupmate’s own confirmed CampusWear account. Every person signs in separately; no shared platform password is created or stored." />

          <div className="mt-7 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
            <section className="campus-panel h-fit overflow-hidden">
              <div className="border-b border-border bg-secondary/35 p-5 sm:p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-card text-primary shadow-sm"><UserPlus className="size-5" aria-hidden="true" /></span>
                <h2 className="mt-4 font-extrabold tracking-[-0.025em]">Grant platform access</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter a confirmed CampusWear account that currently has the Student role. Granting access is controlled and audited by the database.</p>
              </div>
              <form className="space-y-4 p-5 sm:p-6" onSubmit={submit}>
                <div>
                  <label className="text-sm font-bold" htmlFor="platform-team-email">Confirmed account email</label>
                  <Input id="platform-team-email" value={email} onChange={event => setEmail(event.target.value)} type="email" required className="mt-2 min-h-11 bg-background" placeholder="groupmate@example.com" />
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Vendor and school roles continue through their approved organization workflows, not this access control.</p>
                </div>
                <Button type="submit" disabled={grant.isPending} className="min-h-11 w-full gap-2">{grant.isPending ? "Granting access…" : "Grant platform access"}<ShieldCheck className="size-4" aria-hidden="true" /></Button>
              </form>
            </section>

            <section className="campus-panel overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                <div>
                  <p className="campus-eyebrow">CONTROLLED ACCESS</p>
                  <h2 className="mt-1 font-extrabold tracking-[-0.025em]">Current platform team</h2>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">{team.data?.length ?? 0} {team.data?.length === 1 ? "member" : "members"}</p>
              </div>
              {team.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-18 animate-pulse rounded-xl bg-muted" />)}</div> : isStalledWithoutData(team) ? <div className="p-5"><OfflinePanel title="You are offline" detail="Reconnect to load platform team access." onRetry={() => team.refetch()} /></div> : team.isError ? <div className="p-5"><EmptyPanel title="Team access is unavailable" detail="Please retry loading the platform team." action={{ label: "Try again", onClick: () => team.refetch() }} /></div> : team.data?.length ? <div className="divide-y divide-border">{team.data.map(member => <article key={member.userId} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">{member.isBootstrapOwner ? <Crown className="size-4" aria-hidden="true" /> : <UsersRound className="size-4" aria-hidden="true" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-extrabold">{member.fullName || "CampusWear administrator"}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.isBootstrapOwner ? "bg-blue-100 text-blue-800" : "bg-secondary text-primary"}`}>{member.isBootstrapOwner ? "Original owner" : "Platform team"}</span></div><p className="mt-1 overflow-wrap-anywhere text-xs text-muted-foreground">{member.email}</p></div>{member.isBootstrapOwner ? <span className="text-xs font-semibold text-muted-foreground">Protected owner</span> : <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(member.userId)} className="min-h-10 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700"><UserMinus className="size-3.5" aria-hidden="true" />Revoke access</Button>}</article>)}</div> : <div className="p-5"><EmptyPanel title="No platform team members" detail="The original platform owner is protected and will appear after the first successful account refresh." /></div>}
            </section>
          </div>
        </div>
      </WorkspaceGate>
    </DashboardLayout>
  );
}
