import DashboardLayout from "@/components/DashboardLayout";
import { WorkspaceGate } from "@/components/campuswear/WorkspaceGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publishVendorAnnouncement } from "@/lib/supabaseCatalog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { vendorNavigation, vendorPrimaryAction } from "./workspace";

const announcementSchema = z.object({ title: z.string().min(3, "Add a meaningful title."), body: z.string().min(10, "Write a brief helpful update.") });
type AnnouncementForm = z.infer<typeof announcementSchema>;

export default function VendorAnnouncements() {
  const form = useForm<AnnouncementForm>({ resolver: zodResolver(announcementSchema), defaultValues: { title: "", body: "" } });
  const queryClient = useQueryClient();
  const publish = useMutation({ mutationFn: publishVendorAnnouncement, onSuccess: () => { toast.success("Announcement published."); form.reset(); void queryClient.invalidateQueries({ queryKey: ["supabase-announcements"] }); }, onError: error => toast.error(error instanceof Error ? error.message : "The announcement could not be published.") });
  return <DashboardLayout items={vendorNavigation} primaryAction={vendorPrimaryAction} workspaceLabel="Vendor workspace"><WorkspaceGate allowedRoles={["vendor_staff", "platform_admin", "admin"]}><div className="mx-auto max-w-3xl"><p className="text-xs font-bold tracking-[0.12em] text-primary">STUDENT COMMUNICATION</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">Publish an announcement</h1><p className="mt-2 text-sm text-muted-foreground">Share restocks, store schedules, temporary closures, and pickup reminders with your campus.</p><form onSubmit={form.handleSubmit(values => publish.mutate(values))} className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-7"><span className="grid size-11 place-items-center rounded-xl bg-[#f5e3e5] text-[#7b4550]"><BellRing className="size-5" /></span><label className="mt-5 block text-sm font-bold">Title<Input className="mt-2 h-11 bg-card" placeholder="e.g. PE Uniforms are restocked" {...form.register("title")} /><span className="mt-1.5 block text-xs text-destructive">{form.formState.errors.title?.message}</span></label><label className="mt-4 block text-sm font-bold">Message<Textarea className="mt-2 min-h-36 bg-card" placeholder="Explain what students should know, including any date or pickup reminder." {...form.register("body")} /><span className="mt-1.5 block text-xs text-destructive">{form.formState.errors.body?.message}</span></label><div className="mt-6 flex justify-end"><Button type="submit" disabled={publish.isPending} className="gap-2">{publish.isPending ? "Publishing…" : "Publish update"}<Send className="size-4" /></Button></div></form></div></WorkspaceGate></DashboardLayout>;
}
