# Mailjet SMTP Cutover Evidence

**Date:** 26 August 2026  
**Status:** SMTP delivery, fresh confirmation completion, and fresh password-recovery session verified.

Mailjet Free was selected as the Brevo replacement after reviewing its SMTP Relay support, verified-sender workflow, and current free allowance. A Mailjet account was activated, and its SMTP credential was entered only through the Supabase custom-SMTP dashboard. No credential value is stored in this repository, this document, or task-facing guidance.

Brevo support later confirmed that the Brevo transactional-SMTP account itself is active and unrestricted, but reported zero transactional events for the earlier Supabase attempts. The user explicitly chose to continue the already-started Mailjet replacement rather than revert the Supabase configuration to Brevo. This cutover record therefore remains the active delivery path.

Supabase custom SMTP remains enabled. The provider host is now Mailjet's SMTP relay on port `587`; the existing authentication sender name, confirmation requirement, password recovery, Auth rate limits, and production redirect configuration were not relaxed or disabled.

One initial password-recovery request was submitted through the live CampusWear Auth page. The application returned its normal privacy-preserving acknowledgement. Mailjet initially reported that the configured Supabase sender address required validation, and the first delivery attempt did not arrive.

## Sender Validation and Recovery Evidence

The required sender-validation email was resent and later completed by the sender-inbox owner. On 26 August 2026, a direct read-only Mailjet sender-list inspection showed the configured sender entry as **Active**. No sender address, sender name, SMTP credential, confirmation setting, password-recovery setting, redirect allow-list, or Auth rate limit was changed during this verification.

Supabase was then confirmed to retain custom SMTP with the Mailjet relay on port `587`, the CampusWear sender name, email confirmation, password recovery, and existing Auth safeguards. A second real recovery request was accepted by the live CampusWear Auth page. Mailjet’s same-day detailed delivery report records one message with subject **Reset your password**, the configured CampusWear From branding, and status **Delivered**.

The connected recipient Gmail session initially showed the recovery email in Spam; the recipient marked it as not spam, after which it was visible in Inbox. This confirms actual SMTP handoff, provider delivery, recipient arrival, and intended CampusWear From branding. The app now gives users clear Inbox, Spam/Junk, and Gmail Promotions guidance after they register.

## New-Account Confirmation Evidence

An authorized test registration was submitted through the live CampusWear Create account form on 26 August 2026. A direct read-only search of the registered account’s connected Gmail profile found a same-day message from **CampusWear** with subject **Confirm your email address**. In the most recent authorized test, Gmail classified that message as **Spam**, reinforcing the in-product Inbox, Spam/Junk, and Promotions guidance.

The fresh confirmation link was opened immediately in the authorized test browser. It completed successfully at `/auth/confirmed` with the product’s **Email verified** state, then continued to the assigned student workspace. This proves current Mailjet-backed signup delivery, valid Supabase token verification, the confirmation success route, and role-aware continuation without altering any password.

The application also submitted one fresh password-recovery request for that confirmed test account. Supabase Auth Logs show a `user_recovery_requested` event with HTTP status `200`. Initial non-Spam searches and the provider detailed report did not surface the message; an explicit Gmail Spam search later found the CampusWear **Reset your password** message. This confirms that delivery was delayed from the first search result and filtered into Spam, rather than absent.

The fresh reset link was opened immediately from the authorized test inbox. It rendered the valid `/auth/reset` password-recovery form with new-password and confirmation controls, without entering or submitting a password. Together with the fresh `/auth/confirmed` completion, this proves the active Mailjet-backed Supabase flow for signup confirmation and password recovery. Gmail Spam placement remains an operational deliverability consideration for the generic Gmail sender; CampusWear preserves confirmation, recovery, existing rate limits, and in-product Spam/Junk/Promotions guidance rather than weakening authentication safeguards.
