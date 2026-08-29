# Brevo Transactional SMTP Investigation — Historical Record

## Historical finding

This document records the earlier Brevo investigation only. Brevo support later stated that its account was active and unrestricted, but its Transactional Logs showed **zero email events** for the prior Supabase Auth requests. The user chose not to revert to Brevo.

Mailjet is now the active Supabase custom-SMTP provider. Its configured CampusWear sender is shown as Active in Mailjet, and both real recovery and new-account confirmation messages have been delivered. See [Mailjet SMTP Cutover Evidence](./MAILJET_SMTP_CUTOVER_EVIDENCE.md) for the current, credential-free evidence. No SMTP key, password, or other credential is stored in this repository.

## Retired Brevo follow-up

No Brevo configuration action is required for the active CampusWear deployment. Do not switch providers, rotate credentials, change the sender, alter the port, or disable Supabase email confirmation without explicit platform-owner approval. The remaining work is to test fresh Mailjet-delivered confirmation and reset links to completion.

## Supabase Free-plan password configuration

The project’s email provider is enabled, secure email change is enabled, and the minimum password length is set to **8**, matching the CampusWear registration form. Supabase confirmed that leaked-password protection is unavailable on the current Free plan, so it remains disabled rather than falsely represented as active. Before a production launch with client accounts, the platform owner should make a Supabase Pro-plan decision if HaveIBeenPwned-backed leaked-password protection is a required control.

## Evidence and official references

Brevo documents that transactional logs record SMTP events and are available at **Transactional → Logs**. [1] Its SMTP troubleshooting guidance identifies a new account’s unactivated transactional platform as a possible cause when SMTP is configured but no mail is accepted for processing. [2]

## References

[1]: https://help.brevo.com/hc/en-us/articles/360021533839-Manage-your-transactional-logs-and-email-previews "Brevo — Manage your transactional logs and email previews"
[2]: https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP "Brevo — Troubleshooting issues with Brevo SMTP"
