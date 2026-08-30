import DashboardLayout from "@/components/DashboardLayout";
import { EmptyPanel } from "@/components/campuswear/EmptyPanel";
import { OfflinePanel } from "@/components/campuswear/OfflinePanel";
import { isStalledWithoutData } from "@/lib/queryState";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { WorkspacePage } from "@/components/campuswear/WorkspacePage";
import { WorkspacePanel } from "@/components/campuswear/WorkspacePanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatShortDate } from "@/lib/format";
import {
  deactivateVendorAnnouncement,
  listVendorAnnouncements,
  publishVendorAnnouncement,
  updateVendorAnnouncement,
  vendorAnnouncementsQueryKey,
  VendorFacingError,
  type VendorAnnouncement,
} from "@/lib/supabaseCatalog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing, Pencil, Send, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

const announcementSchema = z.object({ title: z.string().min(3, "Add a meaningful title."), body: z.string().min(10, "Write a brief helpful update.") });
type AnnouncementForm = z.infer<typeof announcementSchema>;

/** Only our own copy is ever rendered; a raw database message must never reach the vendor. */
const vendorMessage = (error: unknown, fallback: string) => (error instanceof VendorFacingError ? error.message : fallback);

/**
 * One announcement, with its own mutations. Keeping them per-card is what makes the pending state
 * per-announcement: saving or withdrawing one never disables the controls on any other.
 */
function AnnouncementCard({ announcement, vendorKey }: { announcement: VendorAnnouncement; vendorKey: readonly unknown[] }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: announcement.title, body: announcement.body },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: vendorKey });
    void queryClient.invalidateQueries({ queryKey: ["supabase-announcements"] });
  };

  const save = useMutation({
    mutationFn: updateVendorAnnouncement,
    onSuccess: () => { toast.success("Announcement updated."); setEditing(false); refresh(); },
    onError: error => toast.error(vendorMessage(error, "The announcement could not be updated.")),
  });

  const withdraw = useMutation({
    mutationFn: deactivateVendorAnnouncement,
    onSuccess: () => { toast.success("Announcement withdrawn from students."); refresh(); },
    onError: error => toast.error(vendorMessage(error, "The announcement could not be withdrawn.")),
  });

  const pending = save.isPending || withdraw.isPending;

  if (editing) {
    return (
      <WorkspacePanel as="article" padding="default" aria-label={`Edit ${announcement.title}`}>
        <form onSubmit={form.handleSubmit(values => save.mutate({ id: announcement.id, title: values.title, body: values.body }))}>
          <label className="block text-sm font-bold" htmlFor={`title-${announcement.id}`}>Title
            <Input id={`title-${announcement.id}`} className="mt-2 min-h-11 bg-card" {...form.register("title")} />
            <span className="mt-1.5 block min-h-4 text-xs text-destructive" role="alert">{form.formState.errors.title?.message}</span>
          </label>
          <label className="mt-3 block text-sm font-bold" htmlFor={`body-${announcement.id}`}>Message
            <Textarea id={`body-${announcement.id}`} className="mt-2 min-h-28 bg-card" {...form.register("body")} />
            <span className="mt-1.5 block min-h-4 text-xs text-destructive" role="alert">{form.formState.errors.body?.message}</span>
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" className="min-h-11 gap-1.5 bg-card" disabled={pending} onClick={() => { form.reset({ title: announcement.title, body: announcement.body }); setEditing(false); }}>
              <X className="size-4" aria-hidden="true" />Cancel
            </Button>
            <Button type="submit" className="min-h-11 gap-1.5" disabled={pending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel as="article" padding="default" aria-label={announcement.title}>
      <h3 className="font-extrabold leading-6">{announcement.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-muted-foreground">{announcement.body}</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        Published {formatShortDate(announcement.createdAt)}
        {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt ? ` · Edited ${formatShortDate(announcement.updatedAt)}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="min-h-11 gap-1.5 bg-card" disabled={pending} onClick={() => setEditing(true)}>
          <Pencil className="size-4" aria-hidden="true" />Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" className="min-h-11 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={pending}>
              {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Withdraw “{announcement.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                It will stop appearing to students straight away, and it will also disappear from this list — withdrawn announcements are not shown back to vendors, so you will not be able to restore or reuse it from here. Publish a new announcement if you need to say something else.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={withdraw.isPending}>Keep it published</AlertDialogCancel>
              <AlertDialogAction disabled={withdraw.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => withdraw.mutate({ id: announcement.id })}>
                {withdraw.isPending ? "Withdrawing…" : "Withdraw announcement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </WorkspacePanel>
  );
}

export default function VendorAnnouncements() {
  const { user, loading } = useAuth();
  const form = useForm<AnnouncementForm>({ resolver: zodResolver(announcementSchema), defaultValues: { title: "", body: "" } });
  const queryClient = useQueryClient();
  const vendorKey = vendorAnnouncementsQueryKey(user?.id);

  const announcements = useQuery({ queryKey: vendorKey, queryFn: listVendorAnnouncements, enabled: !loading && Boolean(user?.id) });

  const publish = useMutation({
    mutationFn: publishVendorAnnouncement,
    onSuccess: () => {
      toast.success("Announcement published.");
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["supabase-announcements"] });
      void queryClient.invalidateQueries({ queryKey: vendorKey });
    },
    onError: error => toast.error(vendorMessage(error, "The announcement could not be published.")),
  });

  const notices = announcements.data ?? [];

  return (
    <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace">
      <WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}>
        <WorkspacePage width="narrow" eyebrow="STUDENT COMMUNICATION" title="Publish an announcement" description="Share restocks, store schedules, temporary closures, and pickup reminders with your campus.">
          <WorkspacePanel as="form" padding="spacious" className="mt-7" onSubmit={form.handleSubmit(values => publish.mutate(values))}>
            <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><BellRing className="size-5" aria-hidden="true" /></span>
            <label className="mt-5 block text-sm font-bold" htmlFor="announcement-title">Title
              <Input id="announcement-title" className="mt-2 min-h-11 bg-card" placeholder="e.g. PE Uniforms are restocked" {...form.register("title")} />
              <span className="mt-1.5 block min-h-4 text-xs text-destructive" role="alert">{form.formState.errors.title?.message}</span>
            </label>
            <label className="mt-4 block text-sm font-bold" htmlFor="announcement-body">Message
              <Textarea id="announcement-body" className="mt-2 min-h-36 bg-card" placeholder="Explain what students should know, including any date or pickup reminder." {...form.register("body")} />
              <span className="mt-1.5 block min-h-4 text-xs text-destructive" role="alert">{form.formState.errors.body?.message}</span>
            </label>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={publish.isPending} className="min-h-11 gap-2">{publish.isPending ? "Publishing…" : "Publish update"}<Send className="size-4" aria-hidden="true" /></Button>
            </div>
          </WorkspacePanel>

          <section className="mt-8" aria-labelledby="vendor-announcements-title">
            <h2 id="vendor-announcements-title" className="text-lg font-extrabold tracking-[-0.02em]">Your announcements</h2>
            {/*
              RLS exposes only active, unexpired announcements, so this list can never show a
              withdrawn or expired one. Saying so keeps the page honest rather than implying an
              archive exists.
            */}
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Announcements students can currently see. Withdrawn and expired announcements are not shown back to vendors.</p>

            {announcements.isLoading ? (
              <div className="mt-4 space-y-3">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-[var(--radius)]" />)}</div>
            ) : isStalledWithoutData(announcements) ? (
              <div className="mt-4"><OfflinePanel title="You are offline" detail="Reconnect to load the announcements students can see." onRetry={() => announcements.refetch()} /></div>
            ) : announcements.isError ? (
              <div className="mt-4"><EmptyPanel title="Your announcements could not be loaded" detail="Please try again to review what students can currently see." action={{ label: "Try again", onClick: () => announcements.refetch() }} /></div>
            ) : notices.length ? (
              <div className="mt-4 space-y-3">
                {notices.map(announcement => (
                  <AnnouncementCard key={announcement.id} announcement={announcement} vendorKey={vendorKey} />
                ))}
              </div>
            ) : (
              <div className="mt-4"><EmptyPanel title="Nothing published yet" detail="Announcements you publish appear here while students can still see them." /></div>
            )}
          </section>
        </WorkspacePage>
      </WorkspaceGate>
    </DashboardLayout>
  );
}
