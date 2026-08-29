# Group QA Email Delivery

CampusWear keeps **email confirmation enabled** for group quality assurance. When testers see **“email rate limit exceeded,”** the limit is enforced by Supabase Auth’s configured rate-limit policy, not by the CampusWear product form.

The default Supabase mailer is deliberately restricted and is not suitable for group testing or production. CampusWear now uses Mailjet custom SMTP instead; Supabase documents custom SMTP as the appropriate path for wider sending.[1]

## Recommended setup

Create an account with a transactional email provider that supports SMTP, then configure it in **Supabase → Authentication → SMTP Settings**. Use a dedicated transactional sender such as `no-reply@your-domain.example`; never place SMTP credentials in the Vite or Vercel browser environment variables. After saving SMTP settings, use **Authentication → Rate Limits** to set a conservative, intentional group-QA limit.

For CampusWear, **Mailjet is the active provider**. The sender is validated and real recovery and confirmation messages have been delivered. Testers should check **Inbox**, **Spam/Junk**, and, for Gmail, the **Promotions** tab before retrying. A fresh link may be requested through the CampusWear Auth page if an earlier confirmation or reset link has expired. The provider is configured only in the Supabase dashboard, so a future approved provider change does not require browser-code or Vercel-environment changes. See [Custom SMTP MVP setup](./CUSTOM_SMTP_MVP_SETUP.md) for the secure handoff.

| Do | Do not |
|---|---|
| Use each tester’s own confirmed email account | Share a single platform administrator password |
| Configure custom SMTP before inviting a group | Disable email confirmation to work around the limit |
| Retry only after the displayed limit window | Repeatedly submit the sign-up form |
| Use the platform-team page to grant individual access after confirmation | Put SMTP or Supabase secret keys in browser code |

The application now displays a clear actionable message when Supabase reports either a rate-limit or an unauthorized default-mailer address. This does not bypass verification; it directs the platform owner to correct the email delivery configuration.

## Reference

[1]: https://supabase.com/docs/guides/auth/auth-smtp "Supabase: Send emails with custom SMTP"
