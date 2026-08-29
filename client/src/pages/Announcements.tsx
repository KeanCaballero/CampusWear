import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { PageIntro } from "@/components/campuswear/PageIntro";
import { StudentShell } from "@/components/campuswear/StudentShell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { listAnnouncements } from "@/lib/supabaseCatalog";
import { useQuery } from "@tanstack/react-query";
import { BellRing, CalendarClock } from "lucide-react";

export default function Announcements() {
  const notices = useQuery({ queryKey: ["supabase-announcements"], queryFn: listAnnouncements });
  return (
    <StudentShell>
      <main className="container py-6 sm:py-9">
        <PageIntro eyebrow="CAMPUS UPDATES" title="Announcements" description="Restocks, store schedules, pickup reminders, and practical updates from authorized vendors." />
        {notices.isLoading ? <div className="mt-7 space-y-3"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /></div> : isStalledWithoutData(notices) ? <div className="mt-7"><OfflinePanel title="You are offline" detail="Reconnect to load the latest campus updates." onRetry={() => notices.refetch()} /></div> : notices.isError ? <div className="mt-7"><EmptyPanel title="Updates are unavailable" detail="Please try loading announcements again in a moment." action={{ label: "Try again", onClick: () => notices.refetch() }} /></div> : notices.data?.length ? <section className="mt-7 space-y-3" aria-label="Campus announcements">{notices.data.map(notice => <article key={notice.id} className="campus-panel p-5 sm:p-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><BellRing className="size-5" aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted-foreground"><span>{notice.vendorName ?? notice.schoolName}</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" aria-hidden="true" />{formatShortDate(notice.createdAt)}</span></div><h2 className="mt-2 text-lg font-extrabold tracking-[-0.03em]">{notice.title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{notice.body}</p></div></div></article>)}</section> : <div className="mt-7"><EmptyPanel title="No announcements yet" detail="Official vendor and campus updates will appear here." /></div>}
      </main>
    </StudentShell>
  );
}
