export function authFeedback(message: string): string {
  if (/email rate limit exceeded/i.test(message)) {
    return "Email delivery is temporarily rate-limited. Please wait before trying again. For group QA, the platform owner should configure custom SMTP in Supabase; do not disable email confirmation.";
  }
  if (/email address not authorized/i.test(message)) {
    return "This email is not authorized by the current Supabase test mailer. The platform owner should configure custom SMTP before inviting external testers.";
  }
  if (/error sending confirmation email/i.test(message)) {
    return "CampusWear could not send the confirmation email. The platform owner should verify the saved transactional-email sender and SMTP configuration. Keep email confirmation and rate limits enabled.";
  }
  return message;
}
