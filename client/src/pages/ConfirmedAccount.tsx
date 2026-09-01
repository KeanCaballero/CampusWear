import { useAuth } from "@/_core/hooks/useAuth";
import { AuthLayout } from "@/components/campuswear/AuthLayout";
import { Button } from "@/components/ui/button";
import { destinationForRole, isVendorApplicationPath, safeNextPath } from "@/lib/authRouting";
import { hasExpiredConfirmationLink } from "@/lib/confirmationGuidance";
import { AlertTriangle, CheckCircle2, Loader2, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Where a confirmation link lands, in both outcomes: verified, or a link that has expired.
 *
 * Shares AuthLayout with sign in and password recovery. The routing logic — expiry detection, the
 * vendor-application intent, and the role-based destination — is unchanged.
 */
export default function ConfirmedAccount() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const expiredLink = typeof window !== "undefined" && hasExpiredConfirmationLink(window.location.hash);
  const requestedDestination = typeof window !== "undefined" ? safeNextPath(window.location.search) : null;
  const vendorApplicationIntent = isVendorApplicationPath(requestedDestination);

  if (expiredLink) {
    return (
      <AuthLayout>
        <span className="grid size-12 place-items-center rounded-edge bg-amber-100 text-amber-800" aria-hidden="true">
          <AlertTriangle className="size-6" />
        </span>
        <p className="uc-eyebrow mt-6 text-amber-800">Confirmation link expired</p>
        <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.12] tracking-[-0.035em] text-primary">
          Request a fresh confirmation link.
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          For security, confirmation links can expire or become invalid after a newer link is requested.
          Enter the same email address to send a new link, then check Inbox, Spam/Junk, and Gmail Promotions.
        </p>
        <Button className="mt-8 min-h-12 w-full gap-2 rounded-edge" onClick={() => setLocation("/auth?mode=confirmation")}>
          Request new confirmation email <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="outline" className="mt-3 min-h-12 w-full gap-2 rounded-edge" onClick={() => setLocation("/auth")}>
          Back to sign in <LogIn className="size-4" aria-hidden="true" />
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <span className="grid size-12 place-items-center rounded-edge bg-secondary text-primary" aria-hidden="true">
        <CheckCircle2 className="size-6" />
      </span>
      <p className="uc-eyebrow mt-6 text-campus-blue">Email verified</p>
      <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.12] tracking-[-0.035em] text-primary">
        {vendorApplicationIntent ? "Continue your vendor application." : "Your CampusWear account is ready."}
      </h1>
      <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
        {vendorApplicationIntent
          ? "Your email is verified. Submit your real business and pickup details next; administrator approval is still required before vendor access is activated."
          : "Thank you for verifying your email. You can now continue securely to the workspace assigned to your account."}
      </p>

      {loading ? (
        <p className="mt-8 flex items-center gap-3 rounded-edge border border-border bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          Preparing your account…
        </p>
      ) : user ? (
        <Button
          className="mt-8 min-h-12 w-full gap-2 rounded-edge"
          onClick={() => setLocation(requestedDestination ?? destinationForRole(user.role))}
        >
          {vendorApplicationIntent ? "Continue application" : "Continue to CampusWear"}
          <ShieldCheck className="size-4" aria-hidden="true" />
        </Button>
      ) : (
        <>
          <Button
            className="mt-8 min-h-12 w-full gap-2 rounded-edge"
            onClick={() => setLocation(requestedDestination ? `/auth?next=${encodeURIComponent(requestedDestination)}` : "/auth")}
          >
            Sign in to continue <LogIn className="size-4" aria-hidden="true" />
          </Button>
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            If you confirmed from another browser, sign in here with the password you created.
          </p>
        </>
      )}
    </AuthLayout>
  );
}
