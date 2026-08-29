import { BrandMark } from "@/components/campuswear/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasExpiredConfirmationLink } from "@/lib/confirmationGuidance";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, ChevronLeft, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { z } from "zod";

const resetSchema = z.object({ password: z.string().min(8, "Use at least 8 characters."), confirmPassword: z.string() }).refine(values => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
type ResetForm = z.infer<typeof resetSchema>;

export default function PasswordReset() {
  const [, setLocation] = useLocation();
  const form = useForm<ResetForm>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirmPassword: "" } });
  const [saving, setSaving] = useState(false);
  const expiredLink = typeof window !== "undefined" && hasExpiredConfirmationLink(window.location.hash);
  if (expiredLink) {
    return <main className="min-h-screen bg-background"><div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:px-0"><div className="flex items-center justify-between"><Link href="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary"><ChevronLeft className="size-4" />Back to sign in</Link><BrandMark /></div><section className="my-auto rounded-2xl border border-amber-200 bg-card p-6 shadow-sm sm:p-8"><span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800"><AlertTriangle className="size-6" aria-hidden="true" /></span><p className="mt-6 text-xs font-bold tracking-[0.12em] text-amber-800">RESET LINK EXPIRED</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">Request a fresh reset link.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">For security, reset links can expire or become invalid after a newer link is requested. Request a new link for the same email address, then check Inbox, Spam/Junk, and Gmail Promotions.</p><Button type="button" className="mt-7 h-12 w-full gap-2" onClick={() => setLocation("/auth?mode=recovery")}>Request new reset email <RefreshCw className="size-4" aria-hidden="true" /></Button></section></div></main>;
  }
  const submit = form.handleSubmit(async values => {
    if (!supabase) { toast.error("Password recovery is not configured yet."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      toast.success("Your password has been updated.");
      setLocation("/auth");
    } catch (error) { toast.error(error instanceof Error ? error.message : "We could not update your password."); } finally { setSaving(false); }
  });

  return <main className="min-h-screen bg-background"><div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:px-0"><div className="flex items-center justify-between"><Link href="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary"><ChevronLeft className="size-4" />Back to sign in</Link><BrandMark /></div><section className="my-auto rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><KeyRound className="size-6" /></span><p className="mt-6 text-xs font-bold tracking-[0.12em] text-primary">PASSWORD RECOVERY</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">Choose a new password.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Use a new password with at least eight characters for your CampusWear account.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-bold">New password<Input className="mt-2 h-11 bg-card" type="password" autoComplete="new-password" {...form.register("password")} /><span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.password?.message}</span></label><label className="block text-sm font-bold">Confirm new password<Input className="mt-2 h-11 bg-card" type="password" autoComplete="new-password" {...form.register("confirmPassword")} /><span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.confirmPassword?.message}</span></label><Button type="submit" disabled={saving || !isSupabaseConfigured} className="h-12 w-full gap-2">{saving ? "Updating password…" : "Update password"}<CheckCircle2 className="size-4" /></Button></form></section></div></main>;
}
