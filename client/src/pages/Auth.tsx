import { BrandMark } from "@/components/campuswear/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { authFeedback } from "@/lib/authFeedback";
import { destinationForRole, isVendorApplicationPath, safeNextPath, withNextPath } from "@/lib/authRouting";
import { confirmationEmailDeliveryChecklist, confirmationEmailResentMessage, confirmationEmailSentMessage } from "@/lib/confirmationGuidance";
import { fullNameForProfile, signupDetailsSchema } from "@/lib/registrationDetails";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, ChevronLeft, Eye, EyeOff, GraduationCap, Loader2, MailCheck, RefreshCw, ShieldCheck, Store } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { toast } from "sonner";

type AuthMode = "sign-in" | "sign-up" | "recovery" | "confirmation";

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  passwordConfirmation: z.string().optional(),
});

type Credentials = z.infer<typeof credentialsSchema>;

const accountBenefits = [
  [GraduationCap, "Students", "Check availability and track pickup requests."],
  [Store, "Authorized vendors", "Manage size-level stock and order fulfillment."],
  [ShieldCheck, "School teams", "Oversee authorized campus operations."],
] as const;

function initialAuthMode(): AuthMode {
  if (typeof window === "undefined") return "sign-in";
  const requestedMode = new URLSearchParams(window.location.search).get("mode");
  return requestedMode === "confirmation" || requestedMode === "recovery" ? requestedMode : "sign-in";
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>(initialAuthMode);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [confirmationRecipient, setConfirmationRecipient] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", passwordConfirmation: "" },
  });
  const [submitting, setSubmitting] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const postAuthDestination = typeof window !== "undefined" ? safeNextPath(window.location.search) ?? "/student" : "/student";
  const vendorApplicationIntent = isVendorApplicationPath(postAuthDestination);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmissionFeedback(null);
    setConfirmationRecipient(null);
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    form.reset();
  };

  const resendConfirmation = async () => {
    if (!supabase || !confirmationRecipient) return;

    setSubmissionFeedback(null);
    setResendingConfirmation(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmationRecipient,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
      });
      if (error) throw error;

      toast.success(confirmationEmailResentMessage, {
        description: "Check Inbox, Spam/Junk, and Gmail Promotions for the CampusWear confirmation link.",
      });
    } catch (error) {
      const message = authFeedback(error instanceof Error ? error.message : "We could not request another confirmation email. Please try again later.");
      setSubmissionFeedback(message);
      toast.error(message);
    } finally {
      setResendingConfirmation(false);
    }
  };

  const submit = form.handleSubmit(async values => {
    if (!supabase) {
      const message = "CampusWear authentication is not configured yet. Please contact the platform administrator.";
      setSubmissionFeedback(message);
      toast.error(message);
      return;
    }

    if (mode === "sign-up") {
      const registration = signupDetailsSchema.safeParse(values);
      if (!registration.success) {
        registration.error.issues.forEach(issue => {
          const field = issue.path[0];
          if (field === "firstName" || field === "lastName" || field === "password" || field === "passwordConfirmation") form.setError(field, { message: issue.message });
        });
        return;
      }
    } else if (mode !== "recovery" && (!values.password || values.password.length < 8)) {
      form.setError("password", { message: "Password must contain at least 8 characters." });
      return;
    }

    setSubmissionFeedback(null);
    setSubmitting(true);

    try {
      const confirmationPath = withNextPath("/auth/confirmed", safeNextPath(window.location.search));
      const redirectTo = `${window.location.origin}${mode === "recovery" ? "/auth/reset" : confirmationPath}`;

      if (mode === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo });
        if (error) throw error;
        toast.success("If an account exists, a password reset link has been sent.");
        setMode("sign-in");
        return;
      }

      if (mode === "confirmation") {
        const { error } = await supabase.auth.resend({ type: "signup", email: values.email, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        setConfirmationRecipient(values.email);
        toast.success(confirmationEmailResentMessage, {
          description: "Check Inbox, Spam/Junk, and Gmail Promotions for the CampusWear confirmation link.",
        });
        return;
      }

      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password!,
          options: { emailRedirectTo: redirectTo, data: { full_name: fullNameForProfile(values.firstName ?? "", values.lastName ?? "") } },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmationRecipient(values.email);
          toast.success("Check your email to confirm your CampusWear account.", {
            description: "Also check Spam/Junk and Gmail Promotions if you do not see it in your Inbox.",
          });
        }
        if (data.session) setLocation(postAuthDestination);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password! });
      if (error) throw error;
      toast.success("Signed in successfully.");
      setLocation(postAuthDestination);
    } catch (error) {
      const message = authFeedback(error instanceof Error ? error.message : "We could not complete that request. Please try again.");
      setSubmissionFeedback(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          Checking your CampusWear account…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[0.94fr_1.06fr]">
        <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:block">
          <div className="absolute inset-0 campus-grid opacity-15" />
          <div className="absolute -left-16 top-24 size-64 rounded-full border-[32px] border-white/10" />
          <div className="absolute -bottom-20 right-12 size-72 rotate-12 rounded-[3.5rem] bg-[#f4dadd]/20" />
          <div className="relative flex h-full max-w-md flex-col">
            <BrandMark light />
            <div className="my-auto">
              <p className="text-xs font-extrabold tracking-[0.12em] text-blue-100">CAMPUSWEAR ACCOUNT</p>
              <h1 className="mt-4 text-5xl font-extrabold leading-[1.04] tracking-[-0.065em]">Your Uniform. Your Identity.</h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-blue-100">One secure account for availability, pickup progress, and the workspace your school or vendor role allows.</p>
              <div className="mt-10 space-y-4">
                {accountBenefits.map(([Icon, title, detail]) => (
                  <div key={title} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10"><Icon className="size-5" /></span>
                    <div>
                      <p className="font-extrabold">{title}</p>
                      <p className="mt-1 text-sm leading-5 text-blue-100">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs leading-5 text-blue-100">Your school or vendor assignment controls the workspace you can access.</p>
          </div>
        </section>

        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-16 lg:py-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary">
              <ChevronLeft className="size-4" />Back to home
            </Link>
            <div className="lg:hidden"><BrandMark /></div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
            <div className="w-full campus-fade-in">
              {isAuthenticated && user ? (
                <section className="rounded-2xl border border-border bg-card p-7 shadow-sm">
                  <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><CheckCircle2 className="size-6" /></span>
                  <p className="mt-6 text-xs font-bold tracking-[0.12em] text-primary">YOU ARE SIGNED IN</p>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Continue to your CampusWear workspace or sign out to use another account.</p>
                  <Button className="mt-7 h-11 w-full gap-2" onClick={() => setLocation(safeNextPath(window.location.search) ?? destinationForRole(user.role))}>
                    Continue to CampusWear <ArrowRight className="size-4" />
                  </Button>
                  <Button variant="outline" className="mt-3 h-11 w-full" onClick={logout}>Sign out</Button>
                </section>
              ) : (
                <>
                  <div className="rounded-xl bg-muted p-1">
                    <div className="grid grid-cols-2 gap-1">
                      <button type="button" onClick={() => changeMode("sign-in")} className={`h-10 rounded-lg text-sm font-bold transition ${mode === "sign-in" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Sign in</button>
                      <button type="button" onClick={() => changeMode("sign-up")} className={`h-10 rounded-lg text-sm font-bold transition ${mode === "sign-up" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Create account</button>
                    </div>
                  </div>

                  <div className="mt-8">
                    <p className="text-xs font-bold tracking-[0.12em] text-primary">{mode === "sign-up" ? "JOIN CAMPUSWEAR" : mode === "recovery" ? "ACCOUNT RECOVERY" : mode === "confirmation" ? "EMAIL CONFIRMATION" : "WELCOME BACK"}</p>
                    <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.06em] sm:text-4xl">{mode === "sign-up" ? vendorApplicationIntent ? "Start your vendor application." : "Create your CampusWear account." : mode === "recovery" ? "Reset your password." : mode === "confirmation" ? "Request a fresh confirmation link." : vendorApplicationIntent ? "Continue your vendor application." : "Sign in to your account."}</h1>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{mode === "sign-up" ? vendorApplicationIntent ? "Create a secure account first, then submit your real business and pickup details for administrator review. This does not grant vendor access automatically." : "Register with your school or organization email. Workspace access is assigned after onboarding." : mode === "recovery" ? "Enter your email and we will send a secure reset link if an account exists." : mode === "confirmation" ? "If your earlier confirmation link expired or was already used, enter the same email address to request another secure link." : vendorApplicationIntent ? "Sign in to continue the vendor application you selected. Vendor access is activated only after administrator approval." : "Use your secure CampusWear account to access your assigned workspace."}</p>
                  </div>

                  {!vendorApplicationIntent && (mode === "sign-in" || mode === "sign-up") && <aside className="mt-5 rounded-xl border border-primary/10 bg-secondary/55 p-4"><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-sm"><Store className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-extrabold">Applying for a vendor business?</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Vendor registration is a separate application and approval process. It does not grant vendor tools automatically.</p><Link href="/vendor/apply" className="mt-2 inline-flex text-xs font-bold text-primary hover:underline">Apply as a vendor <ArrowRight className="ml-1 size-3.5" aria-hidden="true" /></Link></div></div></aside>}

                  <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
                    {mode === "sign-up" && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-bold">
                          First name
                          <Input className="mt-2 h-11 bg-card" autoComplete="given-name" {...form.register("firstName")} />
                          <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.firstName?.message}</span>
                        </label>
                        <label className="block text-sm font-bold">
                          Last name
                          <Input className="mt-2 h-11 bg-card" autoComplete="family-name" {...form.register("lastName")} />
                          <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.lastName?.message}</span>
                        </label>
                      </div>
                    )}
                    <label className="block text-sm font-bold">
                      Email
                      <Input className="mt-2 h-11 bg-card" type="email" autoComplete="email" {...form.register("email")} />
                      <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.email?.message}</span>
                    </label>
                    {(mode === "sign-in" || mode === "sign-up") && (
                      <div>
                        <label htmlFor="campuswear-password" className="block text-sm font-bold">Password</label>
                        <div className="relative mt-2">
                          <Input id="campuswear-password" className="h-11 bg-card pr-12" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} {...form.register("password")} />
                          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.password?.message}</span>
                      </div>
                    )}
                    {mode === "sign-up" && (
                      <div>
                        <label htmlFor="campuswear-password-confirmation" className="block text-sm font-bold">Confirm password</label>
                        <div className="relative mt-2">
                          <Input id="campuswear-password-confirmation" className="h-11 bg-card pr-12" type={showPasswordConfirmation ? "text" : "password"} autoComplete="new-password" {...form.register("passwordConfirmation")} />
                          <button type="button" aria-label={showPasswordConfirmation ? "Hide confirmed password" : "Show confirmed password"} aria-pressed={showPasswordConfirmation} onClick={() => setShowPasswordConfirmation(visible => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {showPasswordConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.passwordConfirmation?.message}</span>
                      </div>
                    )}
                    <Button type="submit" disabled={submitting || !isSupabaseConfigured} className="h-12 w-full gap-2 text-sm">
                      {submitting ? "Please wait…" : mode === "sign-up" ? vendorApplicationIntent ? "Create account and continue" : "Create secure account" : mode === "recovery" ? "Send reset link" : mode === "confirmation" ? "Send fresh confirmation link" : vendorApplicationIntent ? "Sign in and continue" : "Sign in"}
                      <ArrowRight className="size-4" />
                    </Button>
                  </form>

                  {confirmationRecipient && (
                    <section aria-live="polite" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 shadow-sm">
                      <div className="flex gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                          <MailCheck className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold">Check your email to confirm your account.</p>
                          <p className="mt-1 text-sm leading-5 text-emerald-900">{confirmationEmailSentMessage(confirmationRecipient)}</p>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2 border-t border-emerald-200 pt-3 text-sm leading-5 text-emerald-900">
                        {confirmationEmailDeliveryChecklist.map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />{item}</li>)}
                      </ul>
                      <p className="mt-3 text-xs leading-5 text-emerald-800">If the message is not there after a few minutes, request another link. Email safeguards may temporarily limit repeated requests.</p>
                      <Button type="button" variant="outline" className="mt-4 h-11 w-full border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100" disabled={resendingConfirmation} onClick={resendConfirmation}>
                        {resendingConfirmation ? "Requesting another email…" : "Send confirmation email again"}
                        <RefreshCw className={`ml-2 size-4 ${resendingConfirmation ? "animate-spin" : ""}`} aria-hidden="true" />
                      </Button>
                    </section>
                  )}

                  {submissionFeedback && <p role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm leading-5 text-destructive">{submissionFeedback}</p>}
                  {mode === "sign-in" && <div className="mt-4 space-y-3 text-center"><button type="button" className="block w-full text-sm font-bold text-primary hover:underline" onClick={() => changeMode("recovery")}>Forgot your password?</button><button type="button" className="block w-full text-sm font-bold text-primary hover:underline" onClick={() => changeMode("confirmation")}>Need a new confirmation email?</button></div>}
                  {mode === "confirmation" && <button type="button" className="mt-4 w-full text-center text-sm font-bold text-primary hover:underline" onClick={() => changeMode("sign-in")}>Back to sign in</button>}
                  {!isSupabaseConfigured && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">Account setup is not complete. Please contact the CampusWear administrator.</p>}
                  <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">By continuing, you agree to use CampusWear only for authorized school and vendor activity.</p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
