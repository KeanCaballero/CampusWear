import { PageIntro } from "@/components/campuswear/PageIntro";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowRight, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useLocation } from "wouter";

function roleLabel(role: string) {
  if (role === "user") return "Student";
  return role.replaceAll("_", " ");
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const isPlatformAdministrator = user?.role === "platform_admin" || user?.role === "admin";

  return (
    <StudentShell>
      <main className="container max-w-2xl py-6 sm:py-9">
        <PageIntro eyebrow="ACCOUNT" title="Profile" description="Your account controls the CampusWear workspace and notifications you can access." />
        {loading ? <p className="mt-7 text-sm text-muted-foreground">Loading your account…</p> : isAuthenticated && user ? <section className="campus-panel mt-7 p-6 sm:p-7"><span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">{isPlatformAdministrator ? <ShieldCheck className="size-6" aria-hidden="true" /> : <UserRound className="size-6" aria-hidden="true" />}</span><h2 className="mt-5 text-xl font-extrabold tracking-[-0.035em]">{user.name ?? (isPlatformAdministrator ? "Platform administrator" : "CampusWear user")}</h2><p className="mt-1 text-sm text-muted-foreground">{user.email ?? "No email available"}</p><p className="mt-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Assigned role <strong className="ml-1 capitalize text-foreground">{roleLabel(user.role)}</strong></p>{isPlatformAdministrator && <div className="mt-4 rounded-xl border border-primary/15 bg-secondary/55 p-4"><p className="font-extrabold text-primary">Platform administrator access</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Review real vendor applications and approve access from the platform console.</p><Button className="mt-4 gap-2" onClick={() => setLocation("/platform")}><ShieldCheck className="size-4" aria-hidden="true" />Open platform console</Button></div>}{user.role === "pending_assignment" && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Your email is verified, but your school and CampusWear role are still pending assignment. Contact your school administrator before ordering or opening an operations workspace.</p>}<Button variant="outline" className="mt-6 gap-2" onClick={logout}><LogOut className="size-4" aria-hidden="true" />Sign out</Button></section> : <section className="campus-panel mt-7 p-6"><h2 className="text-xl font-extrabold">Sign in to CampusWear</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Your cart, orders, notifications, and any approved workspace are connected to your account.</p><Button className="mt-5 gap-2" onClick={() => setLocation("/auth?next=/profile")}>Sign in <ArrowRight className="size-4" aria-hidden="true" /></Button></section>}
      </main>
    </StudentShell>
  );
}
