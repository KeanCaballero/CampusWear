# CampusWear Custom SMTP MVP Setup

CampusWear uses **Supabase Auth** for confirmation and password-recovery messages. SMTP credentials belong only in **Supabase → Authentication → SMTP Settings**. They must never be committed to GitHub, included in this archive, placed in a `VITE_*` variable, or added to Vercel. The deployed application continues to use Supabase Auth normally; selecting or replacing an SMTP provider later requires only an authorized dashboard configuration change.

> Keep **email confirmation**, **password reset**, **leaked-password protection**, and **authentication rate limiting** enabled. Custom SMTP replaces delivery infrastructure; it does not weaken account security.

## Active MVP choice

| Provider | Current documented free allowance | Select it when | Upgrade path |
|---|---:|---|---|
| **Mailjet** | 6,000 emails per month, subject to the provider’s daily allowance | The active CampusWear custom-SMTP path with a validated individual sender | Replace the SMTP credentials in Supabase only after an approved provider change. |
| **Brevo** | 300 email sends per day | Group QA needs more daily confirmation/reset capacity | Upgrade Brevo without changing CampusWear code or Supabase integration. |
| **Resend** | 100 emails per day, 3,000 per month | The team prefers Resend’s developer workflow and Supabase-specific guide | Upgrade Resend or replace its SMTP credentials in Supabase only. |

For the current group-QA MVP, **Mailjet is the active provider**. Its configured CampusWear sender is Active, and real recovery and new-account confirmation messages have been delivered. Brevo and Resend remain future alternatives only; do not switch the active sender or SMTP provider without explicit approval. All providers must use a verified sender, and their current terms should be checked before any future change.[1] [2] [3]

## What the project owner must configure

### 1. Create and verify the sender domain

The active Mailjet setup uses an individually verified CampusWear sender. Before a broader launch, the CampusWear team should verify a domain under its control and publish the provider’s DNS records. Use a single-purpose sender address such as `no-reply@auth.<your-domain>` or `no-reply@<your-domain>`. SPF, DKIM, and DMARC improve delivery and make a later provider change predictable.[1]

### 2. Generate SMTP credentials in the selected provider

Create the provider credential in that provider’s dashboard. Treat it like a password. Store it in the approved team password manager if one exists, and paste it directly into Supabase during configuration. Do not send it in chat, commit it in a file, or add it to Vercel.

| Supabase SMTP field | Active Mailjet configuration | Future provider alternative |
|---|---|---|
| Sender email | Existing validated CampusWear sender | A verified sender for the selected provider |
| Sender name | `CampusWear` | `CampusWear` |
| Host | `in-v3.mailjet.com` | Provider-specific SMTP relay |
| Port | `587` | Provider-specific TLS port |
| Username | Mailjet SMTP credential | Provider-specific SMTP login |
| Password | Mailjet SMTP secret | Provider-specific SMTP secret |

The values above are configuration shapes only. The actual sender, SMTP login, SMTP key, and API key must be created by the owner and are intentionally not present in this repository.[2] [3]

### 3. Configure Supabase Auth

Open the CampusWear Supabase project **`iwexgirpqomquorkikzs`** and use **Authentication → Email → SMTP Settings**. Turn on custom SMTP, enter the selected provider values, save, and use Supabase’s test/send facility only with an authorized team mailbox. Supabase supports SMTP providers generally and applies a low rate limit after custom SMTP is enabled until the owner adjusts Auth rate limits.[1]

Then set the following in the Supabase dashboard:

| Dashboard location | Required setting |
|---|---|
| Authentication → URL Configuration | Site URL: `https://campuswear.vercel.app`; Redirect URLs: `https://campuswear.vercel.app/auth/confirmed` and `https://campuswear.vercel.app/auth/reset` |
| Authentication → Password Security | The current Supabase Free plan cannot enable **Leaked Password Protection**; preserve the eight-character minimum and make a Pro-plan decision before broad launch if this control is required. |
| Authentication → Providers → Email | Keep **Confirm email** and password-based recovery enabled |
| Authentication → Rate Limits | Keep email rate limiting enabled; begin at **30 emails per hour** for group QA, then adjust only after reviewing provider usage and abuse signals |

The 30-per-hour starting point preserves a meaningful anti-abuse control and matches Supabase’s documented initial custom-SMTP posture. Do not set the value to unlimited. Add CAPTCHA before opening unrestricted public registration if the service expects a material traffic increase.[1]

### 4. Test real secure flows

Use two real team-owned inboxes—not fake addresses—to confirm the following before inviting a wider group:

1. A new user receives a confirmation email and lands successfully on `/auth/confirmed` using a fresh, unexpired link.
2. A confirmed user can sign in and request a password reset.
3. The reset link returns to `/auth/reset`.
4. A second groupmate receives an individual platform-team grant only after confirmation; no shared administrator account is used.
5. Provider logs show the messages as delivered or identify a bounce/rejection to correct.

## Operational boundaries

CampusWear does not need a code deployment to switch between Mailjet, Brevo, Resend, or a paid SMTP provider. Update the sender-domain records and SMTP fields in Supabase, test confirmation and recovery, then monitor the provider dashboard. Keep authentication messages separate from marketing email, and avoid promotional content in security email templates.[1]

The current production deployment uses Mailjet custom SMTP; the default Supabase mailer is not the active delivery path. Before group testing expands, preserve the configured Auth rate limits and complete the fresh-link confirmation and reset acceptance checks.

## References

[1]: https://supabase.com/docs/guides/auth/auth-smtp "Supabase: Send emails with custom SMTP"
[2]: https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP "Brevo: Send transactional emails using SMTP"
[3]: https://resend.com/docs/send-with-supabase-smtp "Resend: Send emails using Supabase with SMTP"
[4]: https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan "Brevo: Free-plan limits"
[5]: https://resend.com/docs/knowledge-base/account-quotas-and-limits "Resend: Account quotas and limits"
