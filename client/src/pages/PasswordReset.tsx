import { AuthLayout } from "@/components/campuswear/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasExpiredConfirmationLink } from "@/lib/confirmationGuidance";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { z } from "zod";

const resetSchema = z.object({ password: z.string().min(8, "Use at least 8 characters."), confirmPassword: z.string() }).refine(values => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
type ResetForm = z.infer<typeof resetSchema>;

/**
 * Where a recovery link lands. Presentation now shares AuthLayout with sign in and confirmation, so
 * arriving here from an email does not feel like leaving CampusWear. The recovery logic itself —
 * the expiry check, the schema, and supabase.auth.updateUser — is unchanged.
 */
export default function PasswordReset() {
  const [, setLocation] = useLocation();
  const form = useForm<ResetForm>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirmPassword: "" } });
  const [saving, setSaving] = useState(false);
  const expiredLink = typeof window !== "undefined" && hasExpiredConfirmationLink(window.location.hash);

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

  if (expiredLink) {
    return (
      <AuthLayout>
        <span className="grid size-12 place-items-center rounded-edge bg-amber-100 text-amber-800" aria-hidden="true">
          <AlertTriangle className="size-6" />
        </span>
        <p className="uc-eyebrow mt-6 text-amber-800">Reset link expired</p>
        <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.12] tracking-[-0.035em] text-primary">
          Request a fresh reset link.
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          For security, reset links can expire or become invalid after a newer link is requested.
          Request a new link for the same email address, then check Inbox, Spam/Junk, and Gmail Promotions.
        </p>
        <Button type="button" className="mt-8 min-h-12 w-full gap-2 rounded-edge" onClick={() => setLocation("/auth?mode=recovery")}>
          Request new reset email <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
        <button
          type="button"
          onClick={() => setLocation("/auth")}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center text-sm font-bold text-campus-blue hover:underline"
        >
          Back to sign in
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <span className="grid size-12 place-items-center rounded-edge bg-secondary text-primary" aria-hidden="true">
        <KeyRound className="size-6" />
      </span>
      <p className="uc-eyebrow mt-6 text-campus-blue">Password recovery</p>
      <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.12] tracking-[-0.035em] text-primary">
        Choose a new password.
      </h1>
      <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
        Use a new password with at least eight characters for your CampusWear account.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block text-sm font-bold text-foreground">
          New password
          <Input className="mt-2 min-h-11 rounded-edge bg-card" type="password" autoComplete="new-password" {...form.register("password")} />
          <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.password?.message}</span>
        </label>
        <label className="block text-sm font-bold text-foreground">
          Confirm new password
          <Input className="mt-2 min-h-11 rounded-edge bg-card" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
          <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.confirmPassword?.message}</span>
        </label>
        <Button type="submit" disabled={saving || !isSupabaseConfigured} className="min-h-12 w-full gap-2 rounded-edge">
          {saving ? "Updating password…" : "Update password"}
          <CheckCircle2 className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-8 border-t border-border pt-6 text-center">
        <button
          type="button"
          onClick={() => setLocation("/auth")}
          className="inline-flex min-h-11 items-center text-sm font-bold text-campus-blue hover:underline"
        >
          Back to sign in
        </button>
      </div>
    </AuthLayout>
  );
}
