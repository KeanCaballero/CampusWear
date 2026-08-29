import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatShortDate } from "@/lib/format";
import { listNotifications, markNotificationRead, notificationsQueryKey } from "@/lib/supabaseCatalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const queryKey = notificationsQueryKey(user?.id);
  const alerts = useQuery({ queryKey, queryFn: listNotifications, enabled: !authLoading && Boolean(user) });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: () => void queryClient.invalidateQueries({ queryKey }), onError: error => toast.error(error instanceof Error ? error.message : "We could not mark that notification as read.") });

  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <PageIntro eyebrow="YOUR UPDATES" title="Notifications" description="Order changes and pickup alerts appear here when there is an update to act on." />
        {alerts.isLoading ? <div className="mt-7 space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div> : alerts.isError ? <div className="mt-7"><EmptyPanel title="Notifications could not be loaded" detail="We could not load your updates right now. Please try again." action={{ label: "Try again", onClick: () => alerts.refetch() }} /></div> : alerts.data?.length ? <section className="mt-7 space-y-3" aria-label="Your notifications">{alerts.data.map(alert => <article key={alert.id} className={`campus-panel flex gap-4 p-4 sm:p-5 ${alert.readAt ? "" : "border-primary/25 bg-secondary/35"}`}><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${alert.readAt ? "bg-muted text-muted-foreground" : "bg-card text-primary shadow-sm"}`}><Bell className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex gap-3"><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold">{alert.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{alert.body}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">{formatShortDate(alert.createdAt)}</p></div>{!alert.readAt && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(alert.id)} disabled={markRead.isPending} className="min-h-10 shrink-0 gap-1 text-xs text-primary"><CheckCircle2 className="size-4" aria-hidden="true" />Read</Button>}</div></div></article>)}</section> : <div className="mt-7"><EmptyPanel title="You’re all caught up" detail="Important updates about your orders and vendor announcements will appear here." /></div>}
      </main>
    </StudentShell>
  );
}
