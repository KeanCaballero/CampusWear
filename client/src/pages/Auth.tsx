import { AuthLayout } from "@/components/campuswear/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { authFeedback } from "@/lib/authFeedback";
import { destinationForRole, isVendorApplicationPath, safeNextPath, withNextPath } from "@/lib/authRouting";
import { confirmationEmailDeliveryChecklist, confirmationEmailResentMessage, confirmationEmailSentMessage } from "@/lib/confirmationGuidance";
import { fullNameForProfile, signupDetailsSchema } from "@/lib/registrationDetails";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, MailCheck, RefreshCw, Store } from "lucide-react";
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
      <main className="grid min-h-dvh place-items-center bg-background">
        <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Checking your CampusWear account…
        </p>
      </main>
    );
  }

  /*
    Copy only, below this line. Every branch mirrors a mode the submit handler above already
    handles — no new mode, no new field, and no new request is introduced by the redesign.
  */
  const eyebrow =
    mode === "sign-up" ? "Join CampusWear"
    : mode === "recovery" ? "Account recovery"
    : mode === "confirmation" ? "Email confirmation"
    : "Welcome back";

  const heading =
    mode === "sign-up" ? (vendorApplicationIntent ? "Start your vendor application." : "Create your CampusWear account.")
    : mode === "recovery" ? "Reset your password."
    : mode === "confirmation" ? "Request a fresh confirmation link."
    : vendorApplicationIntent ? "Continue your vendor application."
    : "Sign in to your account.";

  const blurb =
    mode === "sign-up"
      ? vendorApplicationIntent
        ? "Create a secure account first, then submit your real business and pickup details for administrator review. This does not grant vendor access automatically."
        : "Join University of Cebu CampusWear to browse uniforms, place pickup orders, and track your purchases."
    : mode === "recovery" ? "Enter your email and we will send you a reset link if an account exists."
    : mode === "confirmation" ? "If your earlier confirmation link expired or was already used, enter the same email address to request another secure link."
    : vendorApplicationIntent ? "Sign in to continue the vendor application you selected. Vendor access is activated only after administrator approval."
    : "Sign in to your University of Cebu CampusWear account.";

  const submitLabel =
    submitting ? "Please wait…"
    : mode === "sign-up" ? (vendorApplicationIntent ? "Create account and continue" : "Create account")
    : mode === "recovery" ? "Send reset link"
    : mode === "confirmation" ? "Send fresh confirmation link"
    : vendorApplicationIntent ? "Sign in and continue"
    : "Sign in";

  const fieldClass = "mt-2 min-h-11 rounded-edge bg-card";

  return (
    <AuthLayout>
      {isAuthenticated && user ? (
        <section className="rounded-edge border border-border bg-card p-7">
          <span className="grid size-12 place-items-center rounded-edge bg-secondary text-primary" aria-hidden="true">
            <CheckCircle2 className="size-6" />
          </span>
          <p className="uc-eyebrow mt-6 text-campus-blue">You are signed in</p>
          <h1 className="mt-3 text-[1.85rem] font-extrabold leading-tight tracking-[-0.035em] text-primary">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Continue to your CampusWear workspace or sign out to use another account.
          </p>
          <Button
            className="mt-7 min-h-12 w-full gap-2 rounded-edge"
            onClick={() => setLocation(safeNextPath(window.location.search) ?? destinationForRole(user.role))}
          >
            Continue to CampusWear <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" className="mt-3 min-h-12 w-full rounded-edge" onClick={logout}>
            Sign out
          </Button>
        </section>
      ) : (
        <>
          <span className="uc-rule" aria-hidden="true" />
          <p className="uc-eyebrow mt-5 text-campus-blue">{eyebrow}</p>
          <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.12] tracking-[-0.035em] text-primary sm:text-[2.1rem]">
            {heading}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">{blurb}</p>

          {!vendorApplicationIntent && (mode === "sign-in" || mode === "sign-up") && (
            <aside className="mt-7 rounded-edge border border-border bg-secondary/50 p-4">
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-edge bg-card text-primary" aria-hidden="true">
                  <Store className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-primary">Applying for a vendor business?</p>
                  <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                    Vendor registration is a separate application and approval process. It does not grant vendor tools automatically.
                  </p>
                  <Link href="/vendor/apply" className="mt-1 inline-flex min-h-11 items-center text-[13px] font-bold text-primary hover:underline">
                    Apply as a vendor <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </aside>
          )}

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            {mode === "sign-up" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-foreground">
                  First name
                  <Input className={fieldClass} autoComplete="given-name" {...form.register("firstName")} />
                  <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.firstName?.message}</span>
                </label>
                <label className="block text-sm font-bold text-foreground">
                  Last name
                  <Input className={fieldClass} autoComplete="family-name" {...form.register("lastName")} />
                  <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.lastName?.message}</span>
                </label>
              </div>
            )}

            <label className="block text-sm font-bold text-foreground">
              Email address
              <Input className={fieldClass} type="email" autoComplete="email" {...form.register("email")} />
              <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.email?.message}</span>
            </label>

            {(mode === "sign-in" || mode === "sign-up") && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="campuswear-password" className="block text-sm font-bold text-foreground">Password</label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      onClick={() => changeMode("recovery")}
                      className="inline-flex min-h-11 items-center text-[13px] font-bold text-campus-blue hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-2">
                  <Input
                    id="campuswear-password"
                    className="min-h-11 rounded-edge bg-card pr-12"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(visible => !visible)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.password?.message}</span>
              </div>
            )}

            {mode === "sign-up" && (
              <div>
                <label htmlFor="campuswear-password-confirmation" className="block text-sm font-bold text-foreground">Confirm password</label>
                <div className="relative mt-2">
                  <Input
                    id="campuswear-password-confirmation"
                    className="min-h-11 rounded-edge bg-card pr-12"
                    type={showPasswordConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    {...form.register("passwordConfirmation")}
                  />
                  <button
                    type="button"
                    aria-label={showPasswordConfirmation ? "Hide confirmed password" : "Show confirmed password"}
                    aria-pressed={showPasswordConfirmation}
                    onClick={() => setShowPasswordConfirmation(visible => !visible)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPasswordConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <span className="mt-1.5 block min-h-5 text-xs text-destructive">{form.formState.errors.passwordConfirmation?.message}</span>
              </div>
            )}

            <Button type="submit" disabled={submitting || !isSupabaseConfigured} className="min-h-12 w-full gap-2 rounded-edge text-sm">
              {submitLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>

          {confirmationRecipient && (
            <section aria-live="polite" className="mt-6 rounded-edge border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-edge bg-emerald-100 text-emerald-700" aria-hidden="true">
                  <MailCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">Check your email to confirm your account.</p>
                  <p className="mt-1 text-sm leading-5 text-emerald-900">{confirmationEmailSentMessage(confirmationRecipient)}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 border-t border-emerald-200 pt-3 text-sm leading-5 text-emerald-900">
                {confirmationEmailDeliveryChecklist.map(item => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-emerald-800">
                If the message is not there after a few minutes, request another link. Email safeguards may temporarily limit repeated requests.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-11 w-full rounded-edge border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
                disabled={resendingConfirmation}
                onClick={resendConfirmation}
              >
                {resendingConfirmation ? "Requesting another email…" : "Send confirmation email again"}
                <RefreshCw className={`ml-2 size-4 ${resendingConfirmation ? "animate-spin" : ""}`} aria-hidden="true" />
              </Button>
            </section>
          )}

          {submissionFeedback && (
            <p role="alert" className="mt-5 rounded-edge border border-destructive/25 bg-destructive/5 p-3 text-sm leading-5 text-destructive">
              {submissionFeedback}
            </p>
          )}

          {!isSupabaseConfigured && (
            <p className="mt-5 rounded-edge border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
              Account setup is not complete. Please contact the CampusWear administrator.
            </p>
          )}

          {/*
            Mode switching lives here rather than in a segmented control at the top: one screen at a
            time, with the alternative offered as a sentence, which is how the design presents it.
          */}
          <div className="mt-8 border-t border-border pt-6">
            {mode === "sign-in" && (
              <>
                <p className="text-center text-sm text-muted-foreground">Don&apos;t have an account?</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeMode("sign-up")}
                  className="mt-3 min-h-12 w-full rounded-edge"
                >
                  Create an account
                </Button>
                <button
                  type="button"
                  onClick={() => changeMode("confirmation")}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-[13px] font-bold text-muted-foreground hover:text-primary hover:underline"
                >
                  Need a new confirmation email?
                </button>
              </>
            )}
            {mode === "sign-up" && (
              <>
                <p className="text-center text-sm text-muted-foreground">Already have an account?</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeMode("sign-in")}
                  className="mt-3 min-h-12 w-full rounded-edge"
                >
                  Sign in
                </Button>
              </>
            )}
            {(mode === "recovery" || mode === "confirmation") && (
              <button
                type="button"
                onClick={() => changeMode("sign-in")}
                className="inline-flex min-h-11 w-full items-center justify-center text-sm font-bold text-campus-blue hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to use CampusWear only for authorized school and vendor activity.
          </p>
        </>
      )}
    </AuthLayout>
  );
}
