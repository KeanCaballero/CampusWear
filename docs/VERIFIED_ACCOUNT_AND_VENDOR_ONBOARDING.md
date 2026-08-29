# Verified Accounts and Vendor Onboarding

CampusWear now uses a **two-step vendor onboarding model**. A business does not receive a vendor workspace just by registering. Instead, the applicant creates a normal account, submits real school, business, contact, and pickup details through `/vendor/apply`, and remains unprivileged while the application is pending.

The platform administrator opens `/platform` to review each request. Approving it creates the vendor organization, applies the submitted pickup location, authorizes the vendor, and assigns only that applicant as `vendor_staff`. Rejecting it requires an administrator note. This protects the platform from self-assigned vendor access and keeps the actual pickup location configurable by the approved vendor afterward.

## Fix the email-confirmation redirect

The prior confirmation link used `localhost:3000` because the Supabase **Site URL** had not been configured for production. In Supabase, open **Authentication → URL Configuration** and set:

| Setting | Value |
|---|---|
| Site URL | `https://campuswear.vercel.app` |
| Redirect URL | `https://campuswear.vercel.app/auth/confirmed` |
| Redirect URL | `https://campuswear.vercel.app/auth/reset` |

Also retain `http://localhost:3000/**` only for local development. Production should use exact URLs, not a broad wildcard. After the next Vercel deployment, confirmation emails will land on the CampusWear **Email verified** screen, which directs the user to the workspace matching their assigned role.

## Platform administrator operations

| User type | Registration and access model |
|---|---|
| Initial platform owner | The protected owner bootstrap email receives the one-time `platform_admin` role after email confirmation. |
| Student | Creates a regular account and remains a student unless an approved organization assignment changes it. |
| Vendor applicant | Creates a regular account, submits `/vendor/apply`, and waits for review. |
| Approved vendor staff | Receives `vendor_staff` only after platform-administrator approval; can then manage the approved vendor’s products, inventory, pickup location, orders, and announcements. |
| School administrator | Must be onboarded from an actual school relationship; it is not granted by public registration. |

### Individual platform-team access for group QA

Do **not** share a platform-administrator password or create a reusable privileged test account. Each groupmate must create and confirm their own CampusWear account first. The owner then opens **`/platform/team`**, enters that confirmed email address, and grants access individually. The page also permits revocation by account, and the underlying database records the grant or revocation in the platform-access audit log. It does not allow a groupmate to assign their own role, revoke the bootstrap owner, or revoke themselves.

Before inviting multiple testers, configure a custom SMTP provider in **Supabase → Authentication → SMTP Settings**. Supabase’s default mailer is intentionally rate-limited and unsuitable for group QA. Keep email confirmation enabled; CampusWear now converts the provider’s raw email-rate-limit response into actionable guidance instead of exposing the technical error.

## Security controls

The application table is protected by RLS. Applicants can read only their own requests, ordinary student accounts can create only pending requests, and only platform administrators can approve or reject. The two approval RPCs deny anonymous callers and also check the platform-administrator role inside the function before changing any vendor, staff, membership, or profile record.

Platform administrators can also pause or restore an existing school’s availability from `/platform`. The school-status and platform-team RPCs deny anonymous execution and verify the caller’s `platform_admin` role within the function. Client route guards additionally send each authenticated operational role to its assigned workspace, but database RLS and function checks remain the source of authorization truth.

## Remaining real-world acceptance

No fake vendor, employee, product, order, review, or analytics data has been created. After the next release is deployed, use a real vendor’s confirmed account to submit one application. The platform administrator can then approve it and validate the vendor workspace, actual pickup location update, product-image upload, and order lifecycle using real operating data.

## References

1. [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls.md)
2. [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data.md)
